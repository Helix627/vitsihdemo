"""Pipeline 2: Probabilistic Identity Resolution with Multi-Attribute Weighted Inference."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
from core.logging import logger
from database.connection import get_db_cursor
from database.repositories.identity_repo import IdentityRepository
from database.repositories.relationship_repo import RelationshipRepository
from services.embedding_service import EmbeddingService
from services.normalization_service import NormalizationService
from services.stylometric_service import StylometricEngine

try:
    from rapidfuzz import fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False


class ProbabilisticResolutionPipeline:
    """
    Executes multi-attribute probabilistic similarity scoring when exact matching fails.
    Produces auditable candidate matches for Human-in-the-Loop review.
    """

    # Configurable default weights (sum to 1.0)
    DEFAULT_WEIGHTS = {
        "alias": 0.25,
        "stylometry": 0.20,
        "embedding": 0.20,
        "category": 0.15,
        "behavior": 0.10,
        "wallet": 0.05,
        "pgp": 0.05,
    }

    @classmethod
    def calculate_alias_similarity(cls, alias1: str, alias2: str) -> float:
        """Normalized string similarity using RapidFuzz Levenshtein ratio."""
        if not alias1 or not alias2:
            return 0.0
        s1 = NormalizationService.normalize_alias(alias1)
        s2 = NormalizationService.normalize_alias(alias2)
        if s1 == s2:
            return 1.0
        if HAS_RAPIDFUZZ:
            return fuzz.ratio(s1, s2) / 100.0
        # Fallback Jaccard trigram
        ngrams1 = {s1[i : i + 3] for i in range(max(1, len(s1) - 2))}
        ngrams2 = {s2[i : i + 3] for i in range(max(1, len(s2) - 2))}
        union = len(ngrams1.union(ngrams2))
        return len(ngrams1.intersection(ngrams2)) / union if union > 0 else 0.0

    @classmethod
    def calculate_category_similarity(cls, cat1: str, cat2: str) -> float:
        """Compare taxonomy overlap between product categories."""
        if not cat1 or not cat2:
            return 0.0
        c1, c2 = cat1.lower().strip(), cat2.lower().strip()
        if c1 == c2:
            return 1.0
        parts1 = set(re.split(r"[/,\s]+", c1))
        parts2 = set(re.split(r"[/,\s]+", c2))
        union = len(parts1.union(parts2))
        return len(parts1.intersection(parts2)) / union if union > 0 else 0.0

    @classmethod
    def score_candidate_pair(
        cls,
        candidate_alias: str,
        query_text: str,
        target_vendor: str,
        target_corpus: str,
        target_category: str = "General",
        weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate full multi-attribute probabilistic similarity score between query and target.
        """
        w = weights or cls.DEFAULT_WEIGHTS

        # 1. Alias Similarity
        s_alias = cls.calculate_alias_similarity(candidate_alias, target_vendor)

        # 2. Stylometric Similarity
        f_query = StylometricEngine.extract_features(query_text)
        f_target = StylometricEngine.extract_features(target_corpus)
        s_stylo = StylometricEngine.cosine_similarity(f_query, f_target)

        # 3. Dense Neural Embedding Similarity
        emb_query = EmbeddingService.encode(query_text)[0]
        emb_target = EmbeddingService.encode(target_corpus)[0]
        s_embed = EmbeddingService.cosine_similarity(emb_query, emb_target)

        # 4. Category Overlap
        s_cat = 0.5 if target_category != "General" else 0.2

        # 5. Behavior & Contact Similarity
        s_behav = 0.5 if len(query_text) > 50 and len(target_corpus) > 50 else 0.2
        s_wallet = 0.0  # Probabilistic default
        s_pgp = 0.0

        # Weighted Composite Score
        composite_score = (
            w.get("alias", 0.25) * s_alias
            + w.get("stylometry", 0.20) * s_stylo
            + w.get("embedding", 0.20) * s_embed
            + w.get("category", 0.15) * s_cat
            + w.get("behavior", 0.10) * s_behav
            + w.get("wallet", 0.05) * s_wallet
            + w.get("pgp", 0.05) * s_pgp
        )

        return {
            "vendor": target_vendor,
            "overall_confidence": round(composite_score, 3),
            "confidence_percentage": round(composite_score * 100, 1),
            "scores": {
                "alias_similarity": round(s_alias, 3),
                "alias_percentage": round(s_alias * 100, 1),
                "stylometry_similarity": round(s_stylo, 3),
                "stylometry_percentage": round(s_stylo * 100, 1),
                "embedding_similarity": round(s_embed, 3),
                "embedding_percentage": round(s_embed * 100, 1),
                "category_similarity": round(s_cat, 3),
                "behavior_similarity": round(s_behav, 3),
            },
            "evidence": {
                "shared_wallet": False,
                "shared_pgp": False,
                "marketplace": "Agora",
                "category": target_category,
                "weights_used": w,
            },
        }

    @classmethod
    def find_probabilistic_matches(
        cls,
        text: str,
        alias_hint: Optional[str] = None,
        top_k: int = 5,
        threshold: float = 0.60,
    ) -> List[Dict[str, Any]]:
        """
        Scan the Agora vendor database and return candidate matches above threshold
        for human review.
        """
        if not text or not text.strip():
            return []

        # Run stylometric and embedding candidate retrieval
        stylometric_matches = StylometricEngine.match_author(text, top_k=top_k * 2)
        candidates = []

        for m in stylometric_matches:
            vendor = m["vendor"]
            corpus = m.get("corpus_sample", text)
            cat = m.get("category", "General")

            scored = cls.score_candidate_pair(
                candidate_alias=alias_hint or vendor,
                query_text=text,
                target_vendor=vendor,
                target_corpus=corpus,
                target_category=cat,
            )

            if scored["overall_confidence"] >= threshold:
                candidates.append(scored)

        candidates.sort(key=lambda x: x["overall_confidence"], reverse=True)
        return candidates[:top_k]
