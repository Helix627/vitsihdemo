"""Relationship Builder & Inference Service: Deterministic and Probabilistic Link Generation."""

from __future__ import annotations

import itertools
from typing import Any, Dict, List, Optional, Set, Tuple

from core.database import get_db_cursor
from core.logging import logger
from repositories.identity_repo import IdentityRepository
from repositories.relationship_repo import RelationshipRepository
from services.stylometric_service import StylometricEngine


class RelationshipBuilder:
    """Orchestrates deterministic relationship generation and probabilistic link inference."""

    @staticmethod
    def jaccard_similarity(s1: str, s2: str, n: int = 3) -> float:
        """Compute character n-gram Jaccard similarity between two strings."""
        if not s1 or not s2:
            return 0.0
        s1, s2 = s1.lower().strip(), s2.lower().strip()
        if s1 == s2:
            return 1.0

        if len(s1) < n or len(s2) < n:
            return 1.0 if s1 == s2 else 0.0

        ngrams1 = {s1[i : i + n] for i in range(len(s1) - n + 1)}
        ngrams2 = {s2[i : i + n] for i in range(len(s2) - n + 1)}

        intersection = len(ngrams1.intersection(ngrams2))
        union = len(ngrams1.union(ngrams2))
        return intersection / union if union > 0 else 0.0

    @classmethod
    def infer_shared_identifier_relationships(cls) -> Dict[str, int]:
        """
        Identify distinct vendors that share the exact same Email, Bitcoin address, or PGP key,
        and generate cross-vendor relationship edges with 100% confidence.
        """
        logger.info("Computing cross-vendor shared identifier relationships...")
        stats = {"shared_pgp": 0, "shared_email": 0, "shared_wallet": 0}

        # Fast in-memory index of vendor_id -> alias_identity_id
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT vim.vendor_id, vim.identity_id
                FROM VendorIdentityMap vim
                JOIN Identities i ON vim.identity_id = i.identity_id
                WHERE i.identity_type = 'alias'
                """
            )
            vendor_alias_map = {int(r["vendor_id"]): int(r["identity_id"]) for r in cursor.fetchall()}

        query = """
        SELECT
            vim1.vendor_id AS v1_id,
            vim2.vendor_id AS v2_id,
            i.identity_id,
            i.identity_type,
            i.value
        FROM VendorIdentityMap vim1
        JOIN VendorIdentityMap vim2 ON vim1.identity_id = vim2.identity_id AND vim1.vendor_id < vim2.vendor_id
        JOIN Identities i ON vim1.identity_id = i.identity_id
        WHERE i.identity_type IN ('pgp', 'email', 'bitcoin')
        """

        with get_db_cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

        relationships: List[Dict[str, Any]] = []
        for r in rows:
            itype = r["identity_type"]
            rel_type = f"shared_{itype}" if itype in ("email", "pgp") else "shared_wallet"
            if rel_type in stats:
                stats[rel_type] += 1

            v1_alias_id = vendor_alias_map.get(int(r["v1_id"]))
            v2_alias_id = vendor_alias_map.get(int(r["v2_id"]))

            if v1_alias_id and v2_alias_id and v1_alias_id != v2_alias_id:
                relationships.append(
                    {
                        "identity1_id": v1_alias_id,
                        "identity2_id": v2_alias_id,
                        "relationship_type": rel_type,
                        "weight": 1.000,
                        "evidence": {
                            "shared_identity_id": r["identity_id"],
                            "shared_type": itype,
                            "shared_value": r["value"],
                            "vendor_1": r["v1_id"],
                            "vendor_2": r["v2_id"],
                            "confidence": 1.0,
                        },
                    }
                )

        RelationshipRepository.bulk_upsert_relationships(relationships)
        logger.info("Generated %d cross-vendor shared identifier edges: %s", len(relationships), stats)
        return stats

    @classmethod
    def infer_username_similarity_relationships(
        cls, similarity_threshold: float = 0.82, sample_limit: int = 1500
    ) -> int:
        """
        Probabilistic Inference: Computes username/alias n-gram similarity across vendors
        and inserts high-probability matches into IdentityRelationships.
        """
        logger.info("Computing probabilistic username similarity relationships (threshold=%.2f)...", similarity_threshold)

        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT identity_id, identity_type, normalized_value
                FROM Identities
                WHERE identity_type IN ('alias', 'username')
                ORDER BY identity_id ASC
                LIMIT %s
                """,
                (sample_limit,),
            )
            identities = cursor.fetchall()

        inferred_edges: List[Dict[str, Any]] = []

        for i, id1 in enumerate(identities):
            val1 = id1["normalized_value"]
            for id2 in identities[i + 1 :]:
                val2 = id2["normalized_value"]
                if val1 == val2:
                    continue

                sim = cls.jaccard_similarity(val1, val2, n=3)
                if sim >= similarity_threshold:
                    inferred_edges.append(
                        {
                            "identity1_id": id1["identity_id"],
                            "identity2_id": id2["identity_id"],
                            "relationship_type": "inferred_similarity",
                            "weight": round(sim, 3),
                            "evidence": {
                                "method": "jaccard_trigram",
                                "val1": val1,
                                "val2": val2,
                                "similarity": round(sim, 3),
                            },
                        }
                    )

        RelationshipRepository.bulk_upsert_relationships(inferred_edges)
        logger.info("Generated %d probabilistic username similarity edges.", len(inferred_edges))
        return len(inferred_edges)
