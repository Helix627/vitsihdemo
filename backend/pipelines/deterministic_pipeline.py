"""Pipeline 1: Deterministic Identity Resolution (100% Exact Matching)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set, Tuple
from database.connection import get_db_cursor, transaction
from database.repositories.identity_repo import IdentityRepository
from database.repositories.relationship_repo import RelationshipRepository
from database.repositories.vendor_repo import VendorRepository
from core.logging import logger
from services.normalization_service import NormalizationService


class DeterministicResolutionPipeline:
    """
    Executes exact matching across strong cryptographic, financial, and digital identifiers.
    Confidence is 100%. Automatically merges/links correlated vendor entities.
    """

    MATCHABLE_TYPES = ("pgp", "bitcoin", "email", "phone", "username", "alias")

    @classmethod
    def resolve_entity(cls, identity_type: str, raw_value: str) -> Dict[str, Any]:
        """
        Check if a given raw identity value matches existing database records exactly.
        Returns match candidates and correlated vendor syndicates.
        """
        # Canonicalize input
        if identity_type == "email":
            norm_val = NormalizationService.normalize_email(raw_value)
        elif identity_type == "bitcoin":
            norm_val = NormalizationService.normalize_wallet(raw_value)
        elif identity_type == "pgp":
            norm_val = NormalizationService.normalize_pgp_fingerprint(raw_value)
        elif identity_type in ("alias", "username"):
            norm_val = NormalizationService.normalize_alias(raw_value)
        else:
            norm_val = raw_value.strip().lower()

        if not norm_val:
            return {"matched": False, "reason": "Invalid or blank identifier format."}

        existing_id = IdentityRepository.find_by_type_and_value(identity_type, norm_val)
        if not existing_id:
            return {
                "matched": False,
                "identity_type": identity_type,
                "normalized_value": norm_val,
                "confidence": 0.0,
                "linked_vendors": [],
            }

        linked_vendors = IdentityRepository.get_vendors_for_identity(existing_id["identity_id"])
        relationships = RelationshipRepository.get_relationships_for_identity(existing_id["identity_id"])

        return {
            "matched": True,
            "identity_id": existing_id["identity_id"],
            "identity_type": identity_type,
            "normalized_value": norm_val,
            "confidence": 1.0,
            "confidence_percentage": 100.0,
            "resolution_method": "deterministic_exact_match",
            "linked_vendors": linked_vendors,
            "existing_relationships_count": len(relationships),
            "evidence": {
                "match_type": "exact_unique_identifier",
                "identifier_type": identity_type,
                "identifier_value": norm_val,
            },
        }

    @classmethod
    def run_full_deterministic_resolution(cls) -> Dict[str, int]:
        """
        Scans all multi-vendor shared unique identifiers (PGP, BTC, Email)
        and creates 100% confidence SAME_AS relationships.
        """
        logger.info("Executing Pipeline 1: Full Deterministic Identity Resolution...")
        stats = {"same_as_edges_created": 0, "shared_pgp": 0, "shared_email": 0, "shared_wallet": 0}

        query = """
        SELECT
            vim1.vendor_id AS v1_id,
            vim2.vendor_id AS v2_id,
            i.identity_id,
            i.identity_type,
            i.value,
            i.normalized_value
        FROM VendorIdentityMap vim1
        JOIN VendorIdentityMap vim2 ON vim1.identity_id = vim2.identity_id AND vim1.vendor_id < vim2.vendor_id
        JOIN Identities i ON vim1.identity_id = i.identity_id
        WHERE i.identity_type IN ('pgp', 'email', 'bitcoin')
        """

        # Fast in-memory lookup of vendor_id -> alias identity_id
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

            cursor.execute(query)
            rows = cursor.fetchall()

        edges_to_insert: List[Dict[str, Any]] = []

        for r in rows:
            itype = r["identity_type"]
            v1_alias_id = vendor_alias_map.get(int(r["v1_id"]))
            v2_alias_id = vendor_alias_map.get(int(r["v2_id"]))

            if itype == "pgp":
                stats["shared_pgp"] += 1
            elif itype == "email":
                stats["shared_email"] += 1
            elif itype == "bitcoin":
                stats["shared_wallet"] += 1

            if v1_alias_id and v2_alias_id and v1_alias_id != v2_alias_id:
                edges_to_insert.append(
                    {
                        "identity1_id": min(v1_alias_id, v2_alias_id),
                        "identity2_id": max(v1_alias_id, v2_alias_id),
                        "relationship_type": "SAME_AS",
                        "weight": 1.000,
                        "evidence": {
                            "method": "deterministic_exact_match",
                            "confidence": 1.0,
                            "confidence_percentage": 100.0,
                            "shared_unique_id": r["identity_id"],
                            "shared_type": itype,
                            "shared_value": r["value"],
                            "vendor_1": r["v1_id"],
                            "vendor_2": r["v2_id"],
                            "auto_merged": True,
                        },
                    }
                )

        RelationshipRepository.bulk_upsert_relationships(edges_to_insert)
        stats["same_as_edges_created"] = len(edges_to_insert)
        logger.info("Pipeline 1 Complete: %d deterministic SAME_AS edges created.", len(edges_to_insert))
        return stats
