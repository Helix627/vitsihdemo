"""Pipeline 2: Multi-Stage Probabilistic Identity Resolution & Automatic Linking Engine."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple
from core.logging import logger
from database.connection import get_db_cursor
from database.repositories.identity_repo import IdentityRepository
from database.repositories.relationship_repo import RelationshipRepository
from services.behavioral_service import BehavioralEngine
from services.embedding_service import EmbeddingService
from services.normalization_service import NormalizationService
from services.stylometric_service import StylometricEngine

try:
    from rapidfuzz import distance, fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False


class ProbabilisticResolutionPipeline:
    """
    Implements Stages 2, 3, 4, and 5 of the CTI Identity Resolution System:
    - Stage 2: Fuzzy Identity Suggestions (Username Similarity)
    - Stage 3: Behavioural Similarity (Categories, Shipping, Prices, Crypto)
    - Stage 4: Stylometric Similarity (11 Forensic features, TF-IDF, SentenceTransformer)
    - Stage 5: Final Confidence Score & Automatic Decision Matrix
    """

    # Stage 5 Configurable Weights (Must sum to 1.0)
    DEFAULT_WEIGHTS = {
        "username": 0.25,      # 25% Username Similarity
        "stylometry": 0.30,    # 30% Forensic Stylometry
        "behavior": 0.30,      # 30% Vendor Behaviour
        "infrastructure": 0.15 # 15% Infrastructure & Network
    }

    # =========================================================================
    # STAGE 2: FUZZY IDENTITY SUGGESTIONS (USERNAME SIMILARITY)
    # =========================================================================
    @classmethod
    def calculate_username_similarity(cls, username1: str, username2: str) -> Dict[str, Any]:
        """
        Stage 2 Fuzzy Username Matching:
        1. Pre-normalizes with leetspeak translation, lowercase, and symbol stripping.
        2. Computes Levenshtein Distance, Jaro-Winkler, and RapidFuzz Token Ratio.
        3. Generates unified username similarity score (0.0 to 1.0).
        """
        if not username1 or not username2:
            return {
                "score": 0.0,
                "levenshtein": 0.0,
                "jaro_winkler": 0.0,
                "token_ratio": 0.0,
                "normalized_u1": "",
                "normalized_u2": "",
            }

        # Step 1: Stage 2 Normalization (lowercase, remove _, -, ., spaces, translate leetspeak)
        u1_norm = NormalizationService.normalize_username_for_fuzzy(username1)
        u2_norm = NormalizationService.normalize_username_for_fuzzy(username2)

        if u1_norm == u2_norm:
            return {
                "score": 1.0,
                "levenshtein": 1.0,
                "jaro_winkler": 1.0,
                "token_ratio": 1.0,
                "normalized_u1": u1_norm,
                "normalized_u2": u2_norm,
            }

        # Step 2: Multi-algorithm fuzzy scoring
        if HAS_RAPIDFUZZ:
            lev_sim = float(distance.Levenshtein.normalized_similarity(u1_norm, u2_norm))
            jw_sim = float(distance.JaroWinkler.similarity(u1_norm, u2_norm))
            tok_sim = float(fuzz.token_ratio(u1_norm, u2_norm) / 100.0)
            part_sim = float(fuzz.partial_ratio(u1_norm, u2_norm) / 100.0)
        else:
            # Fallback pure-python Levenshtein and Trigram Jaccard
            max_l = max(len(u1_norm), len(u2_norm), 1)
            # Simple character set overlap
            lev_sim = len(set(u1_norm).intersection(set(u2_norm))) / max_l
            jw_sim = lev_sim
            tok_sim = lev_sim
            part_sim = lev_sim

        # Composite username similarity score (Stage 2)
        score = 0.35 * lev_sim + 0.35 * jw_sim + 0.30 * tok_sim
        score = float(max(0.0, min(1.0, score)))

        return {
            "score": round(score, 4),
            "levenshtein": round(lev_sim, 4),
            "jaro_winkler": round(jw_sim, 4),
            "token_ratio": round(tok_sim, 4),
            "normalized_u1": u1_norm,
            "normalized_u2": u2_norm,
        }

    # =========================================================================
    # STAGE 3: BEHAVIOURAL SIMILARITY
    # =========================================================================
    @classmethod
    def calculate_behavioral_similarity(
        cls,
        vendor1_profile: Dict[str, Any],
        vendor2_profile: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Stage 3: Delegate to BehavioralEngine."""
        return BehavioralEngine.compute_behavioral_score(vendor1_profile, vendor2_profile)

    # =========================================================================
    # STAGE 4: STYLOMETRIC SIMILARITY
    # =========================================================================
    @classmethod
    def calculate_stylometric_similarity(cls, text1: str, text2: str) -> Dict[str, Any]:
        """Stage 4: Delegate to StylometricEngine."""
        return StylometricEngine.compute_composite_stylometry_score(text1, text2)

    # =========================================================================
    # STAGE 5: FINAL CONFIDENCE SCORE & AUTOMATIC DECISION ENGINE
    # =========================================================================
    @classmethod
    def evaluate_vendor_pair(
        cls,
        vendor1: Dict[str, Any],
        vendor2: Dict[str, Any],
        text1: str = "",
        text2: str = "",
        infra_score: float = 0.5,
        weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Executes full Stages 2 -> 3 -> 4 -> 5 evaluation between two candidate vendor personas.
        
        Applies Automatic Linking Rules:
        - Confidence >= 95%: AUTO_LINKED (Automatically merge, label: "Highly Likely", stored: "Auto Linked")
        - 80% <= Confidence < 95%: SUGGESTED_HIGH (Do NOT merge, generate high confidence suggestion, label: "Likely")
        - 60% <= Confidence < 80%: SUGGESTED_LOW (Generate low confidence suggestion, label: "Possible")
        - Confidence < 60%: IGNORED (Ignore, label: "Weak")
        """
        w = weights or cls.DEFAULT_WEIGHTS

        # Normalize weight keys
        w_user = float(w.get("username", w.get("alias", cls.DEFAULT_WEIGHTS["username"])))
        w_stylo = float(w.get("stylometry", cls.DEFAULT_WEIGHTS["stylometry"]))
        w_behav = float(w.get("behavior", cls.DEFAULT_WEIGHTS["behavior"]))
        w_infra = float(w.get("infrastructure", cls.DEFAULT_WEIGHTS["infrastructure"]))

        # Normalize weights so they strictly sum to 1.0
        total_w = w_user + w_stylo + w_behav + w_infra
        if total_w > 0:
            w_user /= total_w
            w_stylo /= total_w
            w_behav /= total_w
            w_infra /= total_w

        # Stage 2: Username / Alias Similarity
        u1 = vendor1.get("user_name") or vendor1.get("username") or ""
        u2 = vendor2.get("user_name") or vendor2.get("username") or ""
        stage2_result = cls.calculate_username_similarity(u1, u2)
        s_username = stage2_result["score"]

        # Stage 3: Behavioural Similarity
        stage3_result = cls.calculate_behavioral_similarity(vendor1, vendor2)
        s_behavior = stage3_result["score"]

        # Stage 4: Stylometric Similarity
        t1 = text1 or vendor1.get("profile_description") or vendor1.get("listings_sample") or u1
        t2 = text2 or vendor2.get("profile_description") or vendor2.get("listings_sample") or u2
        stage4_result = cls.calculate_stylometric_similarity(t1, t2)
        s_stylometry = stage4_result["score"]

        # Infrastructure Score
        s_infra = float(max(0.0, min(1.0, infra_score)))

        # Stage 5: Overall Confidence = Σ(weight × score)
        overall_confidence = (
            w_user * s_username
            + w_stylo * s_stylometry
            + w_behav * s_behavior
            + w_infra * s_infra
        )
        overall_confidence = float(max(0.0, min(1.0, overall_confidence)))
        conf_pct = round(overall_confidence * 100.0, 2)

        # Automatic Linking Decision Rules
        if conf_pct >= 95.0:
            decision = "AUTO_LINKED"
            action = "MERGED"
            label = "Highly Likely"
            storage_status = "Auto Linked"
            description = f"Confidence {conf_pct}% >= 95%: Automatically merged into identity cluster."
        elif conf_pct >= 80.0:
            decision = "SUGGESTED_HIGH"
            action = "SUGGESTION"
            label = "Likely"
            storage_status = "High Confidence Suggestion"
            description = f"Confidence {conf_pct}% (80-95%): High-confidence candidate suggestion generated for analyst review."
        elif conf_pct >= 60.0:
            decision = "SUGGESTED_LOW"
            action = "SUGGESTION"
            label = "Possible"
            storage_status = "Low Confidence Suggestion"
            description = f"Confidence {conf_pct}% (60-80%): Low-confidence candidate suggestion generated."
        else:
            decision = "IGNORED"
            action = "IGNORED"
            label = "Weak"
            storage_status = "Ignored"
            description = f"Confidence {conf_pct}% < 60%: Weak similarity, ignored."

        return {
            "overall_confidence": round(overall_confidence, 4),
            "confidence_percentage": conf_pct,
            "decision": decision,
            "action": action,
            "label": label,
            "storage_status": storage_status,
            "description": description,
            "breakdown": {
                "stage2_username": {
                    "score": s_username,
                    "weight": round(w_user, 3),
                    "weighted_score": round(w_user * s_username, 4),
                    "details": stage2_result,
                },
                "stage3_behavior": {
                    "score": s_behavior,
                    "weight": round(w_behav, 3),
                    "weighted_score": round(w_behav * s_behavior, 4),
                    "details": stage3_result,
                },
                "stage4_stylometry": {
                    "score": s_stylometry,
                    "weight": round(w_stylo, 3),
                    "weighted_score": round(w_stylo * s_stylometry, 4),
                    "details": stage4_result,
                },
                "infrastructure": {
                    "score": s_infra,
                    "weight": round(w_infra, 3),
                    "weighted_score": round(w_infra * s_infra, 4),
                },
            },
            "vendor1": {
                "id": vendor1.get("vendor_id"),
                "username": u1,
                "market_id": vendor1.get("market_id"),
            },
            "vendor2": {
                "id": vendor2.get("vendor_id"),
                "username": u2,
                "market_id": vendor2.get("market_id"),
            },
        }

    @classmethod
    def find_probabilistic_matches(
        cls,
        text: str,
        alias_hint: Optional[str] = None,
        top_k: int = 5,
        threshold: float = 0.60,
        weights: Optional[Dict[str, float]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search known darknet vendor stylometric and identity corpus,
        score them using the 5-Stage resolution engine, and return
        candidates sorted by confidence score.
        """
        # 1. Forensic stylometric retrieval from indexed signatures
        attributions = StylometricEngine.attribute_vendor(text, top_k=max(top_k * 3, 10))

        candidates: List[Dict[str, Any]] = []
        query_vendor = {
            "user_name": alias_hint or "unknown_actor",
            "profile_description": text,
        }

        for attr in attributions:
            target_name = attr["vendor"]
            target_vendor = {
                "user_name": target_name,
                "profile_description": attr.get("corpus_sample", ""),
            }

            eval_res = cls.evaluate_vendor_pair(
                vendor1=query_vendor,
                vendor2=target_vendor,
                text1=text,
                text2=attr.get("corpus_sample", ""),
                weights=weights,
            )

            if eval_res["overall_confidence"] >= threshold:
                candidates.append(
                    {
                        "vendor": target_name,
                        "confidence_score": eval_res["overall_confidence"],
                        "confidence_percentage": eval_res["confidence_percentage"],
                        "decision": eval_res["decision"],
                        "action": eval_res["action"],
                        "label": eval_res["label"],
                        "storage_status": eval_res["storage_status"],
                        "breakdown": eval_res["breakdown"],
                        "description": eval_res["description"],
                    }
                )

        candidates.sort(key=lambda x: x["confidence_score"], reverse=True)
        return candidates[:top_k]

    @classmethod
    def calculate_alias_similarity(cls, alias1: str, alias2: str) -> float:
        """Alias for calculate_username_similarity for backwards compatibility."""
        return cls.calculate_username_similarity(alias1, alias2)["score"]

    @classmethod
    def calculate_category_similarity(cls, cat1: str, cat2: str) -> float:
        """Alias for BehavioralEngine.compute_category_similarity for backwards compatibility."""
        return BehavioralEngine.compute_category_similarity(cat1, cat2)

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
        """Wrapper for candidate evaluation compatible with existing REST routes."""
        v1 = {"user_name": candidate_alias, "category": "General"}
        v2 = {"user_name": target_vendor, "category": target_category}
        return cls.evaluate_vendor_pair(v1, v2, text1=query_text, text2=target_corpus, weights=weights)
