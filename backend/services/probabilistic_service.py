"""Probabilistic Inference Pipeline: Sentence Transformers, Embedding Generation, and Graph Link Prediction."""

from __future__ import annotations

import csv
import math
import os
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from core.database import get_db_cursor
from core.logging import logger
from repositories.identity_repo import IdentityRepository
from repositories.relationship_repo import RelationshipRepository
from services.stylometric_service import StylometricEngine

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False


class ProbabilisticInferenceEngine:
    """
    AI-powered probabilistic relationship inference using Sentence Transformers (dense semantic embeddings)
    and forensic stylometry across darknet vendor listing texts.
    """

    _MODEL: Any = None
    _MODEL_NAME: str = "all-MiniLM-L6-v2"
    _VENDOR_EMBEDDINGS: Dict[str, Any] = {}
    _VENDOR_TEXTS: Dict[str, str] = {}
    _VENDOR_CATEGORIES: Dict[str, str] = {}
    _IS_INITIALIZED: bool = False

    @classmethod
    def get_model(cls) -> Optional[Any]:
        """Lazy-load the SentenceTransformer model on demand."""
        if not HAS_SENTENCE_TRANSFORMERS:
            return None

        if cls._MODEL is None:
            try:
                logger.info("Loading SentenceTransformer model (%s)...", cls._MODEL_NAME)
                import sentence_transformers
                cls._MODEL = sentence_transformers.SentenceTransformer(cls._MODEL_NAME)
                logger.info("SentenceTransformer model loaded successfully.")
            except Exception as exc:
                logger.warning("Failed to load SentenceTransformer: %s. Using TF-IDF vectorizer fallback.", exc)
                cls._MODEL = None
        return cls._MODEL

    @classmethod
    def load_agora_vendor_corpora(
        cls, csv_path: str = "data/agora.csv", min_chars: int = 100, max_vendors: int = 600
    ) -> Dict[str, str]:
        """Aggregate all listing descriptions per vendor from Agora CSV."""
        if not os.path.exists(csv_path):
            alt_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "agora.csv")
            if os.path.exists(alt_path):
                csv_path = alt_path
            else:
                logger.warning("Agora CSV dataset not found at %s.", csv_path)
                return {}

        vendor_listings: Dict[str, List[str]] = {}
        vendor_cats: Dict[str, List[str]] = {}

        with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            if reader.fieldnames:
                reader.fieldnames = [k.strip() for k in reader.fieldnames]

            for row in reader:
                vendor = (row.get("Vendor") or "").strip()
                if not vendor:
                    continue

                item = (row.get("Item") or "").strip()
                desc = (row.get("Item Description") or "").strip()
                cat = (row.get("Category") or "").strip()

                text = f"{item}. {desc}"
                if len(text.strip()) > 15:
                    if vendor not in vendor_listings:
                        vendor_listings[vendor] = []
                        vendor_cats[vendor] = []
                    vendor_listings[vendor].append(text)
                    if cat:
                        vendor_cats[vendor].append(cat)

        # Sort vendors by volume and select top
        sorted_vendors = sorted(vendor_listings.items(), key=lambda x: len(x[1]), reverse=True)[:max_vendors]

        cls._VENDOR_TEXTS.clear()
        cls._VENDOR_CATEGORIES.clear()

        for v, texts in sorted_vendors:
            combined = "\n".join(texts[:25])
            if len(combined) >= min_chars:
                cls._VENDOR_TEXTS[v] = combined
                cats = vendor_cats.get(v, [])
                cls._VENDOR_CATEGORIES[v] = max(set(cats), key=cats.count) if cats else "General"

        logger.info("Loaded Agora corpora for %d darknet vendors.", len(cls._VENDOR_TEXTS))
        return cls._VENDOR_TEXTS

    @classmethod
    def generate_vendor_embeddings(cls) -> int:
        """Compute embeddings for all Agora vendors."""
        if not cls._VENDOR_TEXTS:
            cls.load_agora_vendor_corpora()

        if not cls._VENDOR_TEXTS:
            return 0

        model = cls.get_model()
        vendor_names = list(cls._VENDOR_TEXTS.keys())
        vendor_docs = [cls._VENDOR_TEXTS[v] for v in vendor_names]

        if model is not None and HAS_NUMPY:
            logger.info("Encoding %d vendor corpora with SentenceTransformers (%s)...", len(vendor_docs), cls._MODEL_NAME)
            embeddings = model.encode(vendor_docs, batch_size=32, show_progress_bar=False, normalize_embeddings=True)
            for v, emb in zip(vendor_names, embeddings):
                cls._VENDOR_EMBEDDINGS[v] = np.array(emb, dtype=np.float32)
        else:
            logger.info("Using feature-vector embedding projection for %d vendors...", len(vendor_docs))
            for v, text in cls._VENDOR_TEXTS.items():
                feats = StylometricEngine.extract_features(text)
                keys = sorted(feats.keys())
                vec = [feats[k] for k in keys if k not in ("char_count", "word_count")]
                norm = math.sqrt(sum(x * x for x in vec))
                normalized_vec = [x / norm for x in vec] if norm > 0 else vec
                if HAS_NUMPY:
                    cls._VENDOR_EMBEDDINGS[v] = np.array(normalized_vec, dtype=np.float32)
                else:
                    cls._VENDOR_EMBEDDINGS[v] = normalized_vec

        cls._IS_INITIALIZED = True
        logger.info("Generated embeddings for %d vendors.", len(cls._VENDOR_EMBEDDINGS))
        return len(cls._VENDOR_EMBEDDINGS)

    @classmethod
    def _dot_product(cls, v1: Any, v2: Any) -> float:
        """Compute dot product for both numpy arrays and python lists."""
        if HAS_NUMPY and isinstance(v1, np.ndarray) and isinstance(v2, np.ndarray):
            return float(np.dot(v1, v2))
        return sum(a * b for a, b in zip(v1, v2))

    @classmethod
    def build_probabilistic_graph_edges(
        cls, similarity_threshold: float = 0.76, max_edges: int = 1500
    ) -> Dict[str, Any]:
        """
        Compute pairwise embedding cosine similarity across darknet vendors,
        and persist high-probability inferred links into IdentityRelationships.
        """
        logger.info(
            "Building probabilistic graph relationships using Agora embeddings (threshold=%.2f)...",
            similarity_threshold,
        )

        if not cls._IS_INITIALIZED or not cls._VENDOR_EMBEDDINGS:
            cls.generate_vendor_embeddings()

        if not cls._VENDOR_EMBEDDINGS:
            return {"edges_generated": 0, "pairs_evaluated": 0}

        # Query all aliases in DB to map Agora vendor names -> identity_id
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT identity_id, value, normalized_value
                FROM Identities
                WHERE identity_type = 'alias'
                """
            )
            alias_map = {row["normalized_value"].lower(): int(row["identity_id"]) for row in cursor.fetchall()}

        vendors = list(cls._VENDOR_EMBEDDINGS.keys())
        inferred_relationships: List[Dict[str, Any]] = []
        pairs_evaluated = 0

        for i in range(len(vendors)):
            v1 = vendors[i]
            v1_id = alias_map.get(v1.lower())
            emb1 = cls._VENDOR_EMBEDDINGS[v1]

            for j in range(i + 1, len(vendors)):
                v2 = vendors[j]
                pairs_evaluated += 1
                emb2 = cls._VENDOR_EMBEDDINGS[v2]
                sim = cls._dot_product(emb1, emb2)

                if sim >= similarity_threshold:
                    v2_id = alias_map.get(v2.lower())

                    # If both vendors exist in 3NF Identities table, persist direct edge
                    if v1_id and v2_id and v1_id != v2_id:
                        inferred_relationships.append(
                            {
                                "identity1_id": min(v1_id, v2_id),
                                "identity2_id": max(v1_id, v2_id),
                                "relationship_type": "probabilistic_similarity",
                                "weight": round(sim, 3),
                                "evidence": {
                                    "method": "sentence_transformers_cosine",
                                    "model": cls._MODEL_NAME if cls._MODEL else "stylometric_vector",
                                    "similarity": round(sim, 3),
                                    "similarity_percentage": round(sim * 100, 1),
                                    "vendor_1": v1,
                                    "vendor_2": v2,
                                    "v1_category": cls._VENDOR_CATEGORIES.get(v1, "General"),
                                    "v2_category": cls._VENDOR_CATEGORIES.get(v2, "General"),
                                },
                            }
                        )

                if len(inferred_relationships) >= max_edges:
                    break
            if len(inferred_relationships) >= max_edges:
                break

        if inferred_relationships:
            RelationshipRepository.bulk_upsert_relationships(inferred_relationships)

        logger.info(
            "Generated and persisted %d probabilistic relationship edges across %d evaluated pairs.",
            len(inferred_relationships),
            pairs_evaluated,
        )

        return {
            "edges_generated": len(inferred_relationships),
            "pairs_evaluated": pairs_evaluated,
            "threshold": similarity_threshold,
            "sample_inferences": inferred_relationships[:5],
        }

    @classmethod
    def infer_alias_connection(
        cls, text_snippet: str, top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Embed arbitrary query text and return predicted vendor authors / syndicates
        with dense semantic similarity percentages.
        """
        if not text_snippet or not text_snippet.strip():
            return []

        if not cls._IS_INITIALIZED or not cls._VENDOR_EMBEDDINGS:
            cls.generate_vendor_embeddings()

        model = cls.get_model()
        if model is not None and HAS_NUMPY:
            query_emb = model.encode([text_snippet], normalize_embeddings=True)[0]
        else:
            feats = StylometricEngine.extract_features(text_snippet)
            keys = sorted(feats.keys())
            vec = [feats[k] for k in keys if k not in ("char_count", "word_count")]
            norm = math.sqrt(sum(x * x for x in vec))
            normalized_vec = [x / norm for x in vec] if norm > 0 else vec
            query_emb = np.array(normalized_vec, dtype=np.float32) if HAS_NUMPY else normalized_vec

        results = []
        for vendor, emb in cls._VENDOR_EMBEDDINGS.items():
            sim = cls._dot_product(query_emb, emb)
            if sim > 0.35:
                results.append(
                    {
                        "vendor": vendor,
                        "similarity": round(sim, 3),
                        "similarity_percentage": round(sim * 100, 1),
                        "category": cls._VENDOR_CATEGORIES.get(vendor, "General"),
                        "corpus_length": len(cls._VENDOR_TEXTS.get(vendor, "")),
                    }
                )

        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]
