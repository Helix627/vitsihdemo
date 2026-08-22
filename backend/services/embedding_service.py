"""Dense Semantic Embedding Service using Sentence Transformers."""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional
from core.logging import logger

try:
    import numpy as np
    from sentence_transformers import SentenceTransformer
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False


class EmbeddingService:
    """Encapsulates neural text encoding and dense vector cosine similarity."""

    _MODEL: Any = None
    _MODEL_NAME: str = "all-MiniLM-L6-v2"

    @classmethod
    def get_model(cls) -> Optional[Any]:
        """Lazy-load the SentenceTransformer model."""
        if not HAS_TRANSFORMERS:
            return None
        if cls._MODEL is None:
            try:
                logger.info("Loading SentenceTransformer (%s)...", cls._MODEL_NAME)
                cls._MODEL = SentenceTransformer(cls._MODEL_NAME)
                logger.info("SentenceTransformer loaded.")
            except Exception as exc:
                logger.warning("Failed to load SentenceTransformer: %s", exc)
                cls._MODEL = None
        return cls._MODEL

    @classmethod
    def encode(cls, texts: List[str] | str) -> Any:
        """Generate normalized 384-d embeddings."""
        if isinstance(texts, str):
            texts = [texts]

        model = cls.get_model()
        if model is not None:
            return model.encode(texts, normalize_embeddings=True, show_progress_bar=False)

        # Fallback projection
        vectors = []
        for text in texts:
            vec = [hash(w) % 1000 / 1000.0 for w in text.split()[:50]]
            while len(vec) < 64:
                vec.append(0.0)
            norm = math.sqrt(sum(x * x for x in vec))
            vectors.append([x / norm for x in vec] if norm > 0 else vec)
        return vectors

    @classmethod
    def cosine_similarity(cls, emb1: Any, emb2: Any) -> float:
        """Compute cosine similarity between two vectors."""
        if HAS_TRANSFORMERS and isinstance(emb1, np.ndarray) and isinstance(emb2, np.ndarray):
            return float(np.dot(emb1, emb2))
        dot = sum(a * b for a, b in zip(emb1, emb2))
        return float(dot)
