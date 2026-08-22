"""Pipeline 1: Deterministic Identity Resolution (100% Exact Matching & Automatic Merging)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set, Tuple
from core.logging import logger
from database.connection import get_db_cursor, transaction
from database.repositories.identity_repo import IdentityRepository
from database.repositories.relationship_repo import RelationshipRepository
from database.repositories.vendor_repo import VendorRepository
from services.normalization_service import NormalizationService


class DeterministicResolutionPipeline:
    """
    Stage 1 — Deterministic Matching:
    Whenever two entities contain an identical high-confidence identifier,
    they must automatically belong to the same Identity Cluster.
    
    Supported Strong Identifiers:
    - Exact PGP Fingerprint
    - Exact Bitcoin Wallet
    - Exact Email Address
    - Exact Vendor Username
    - Exact Onion URL
    - Exact Listing URL
    
    Rule:
    - Automatically merge. No user approval required.
    - Confidence = 100% (1.000).
    - Status = AUTO_MERGED.
    """

    MATCHABLE_TYPES = ("pgp", "bitcoin", "email", "username", "alias", "onion", "listing_url", "phone")

    @classmethod
    def resolve_entity(cls, identity_type: str, raw_value: str) -> Dict[str, Any]:
        """
        Check if a given raw identity value matches existing database records exactly.
        Returns match candidates, correlated vendor syndicates, and auto-merge details.
        """
        # 1. Canonicalize input
        itype = identity_type.lower().strip()
        if itype == "email":
            norm_val = NormalizationService.normalize_email(raw_value)
            evidence_label = "Exact Email Address Match"
        elif itype in ("bitcoin", "btc", "wallet"):
            itype = "bitcoin"
            norm_val = NormalizationService.normalize_wallet(raw_value)
            evidence_label = "Exact Bitcoin Wallet Match"
        elif itype in ("pgp", "pgp_key", "fingerprint"):
            itype = "pgp"
            norm_val = NormalizationService.normalize_pgp_fingerprint(raw_value)
            evidence_label = "Exact PGP Fingerprint Match"
        elif itype in ("alias", "username"):
            itype = "alias"
            norm_val = NormalizationService.normalize_alias(raw_value)
            evidence_label = "Exact Vendor Username Match"
        elif itype in ("onion", "onion_url"):
            itype = "onion"
            norm_val = NormalizationService.normalize_onion_url(raw_value)
            evidence_label = "Exact Onion URL Match"
        elif itype in ("listing_url", "product_url"):
            itype = "listing_url"
            norm_val = NormalizationService.normalize_listing_url(raw_value)
            evidence_label = "Exact Listing URL Match"
        else:
            norm_val = raw_value.strip().lower()
            evidence_label = f"Exact {itype.capitalize()} Match"

        if not norm_val:
            return {"matched": False, "reason": "Invalid or blank identifier format."}

        existing_id = IdentityRepository.find_by_type_and_value(itype, norm_val)
        if not existing_id:
            return {
                "matched": False,
                "identity_type": itype,
                "normalized_value": norm_val,
                "confidence": 0.0,
                "confidence_percentage": 0.0,
                "linked_vendors": [],
            }

        linked_vendors = IdentityRepository.get_vendors_for_identity(existing_id["identity_id"])
        relationships = RelationshipRepository.get_relationships_for_identity(existing_id["identity_id"])

        return {
            "matched": True,
            "identity_id": existing_id["identity_id"],
            "identity_type": itype,
            "normalized_value": norm_val,
            "confidence": 1.0,
            "confidence_percentage": 100.0,
            "status": "AUTO_MERGED",
            "action": "MERGED",
            "resolution_method": "deterministic_exact_match",
            "linked_vendors": linked_vendors,
            "linked_vendors_count": len(linked_vendors),
            "existing_relationships_count": len(relationships),
            "evidence": {
                "match_type": "exact_unique_identifier",
                "label": evidence_label,
                "identifier_type": itype,
                "identifier_value": norm_val,
                "confidence": 1.0,
                "reason": f"{evidence_label}: {norm_val}",
            },
        }

    @classmethod
    def match_two_vendors_deterministically(
        cls,
        vendor1_id: int,
        vendor2_id: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Check if two specific vendors share any deterministic strong identifier.
        If found, returns 100% confidence match and evidence.
        """
        if vendor1_id == vendor2_id:
            return None

        query = """
        SELECT i.identity_id, i.identity_type, i.value, i.normalized_value
        FROM vendoridentitymap vim1
        JOIN vendoridentitymap vim2 ON vim1.identity_id = vim2.identity_id
        JOIN identities i ON vim1.identity_id = i.identity_id
        WHERE vim1.vendor_id = %s AND vim2.vendor_id = %s
          AND i.identity_type IN ('pgp', 'bitcoin', 'email', 'alias', 'username', 'onion', 'listing_url')
        LIMIT 1;
        """
        with get_db_cursor() as cursor:
            cursor.execute(query, (vendor1_id, vendor2_id))
            row = cursor.fetchone()
            if not row:
                return None

            itype = row["identity_type"]
            label_map = {
                "bitcoin": "Exact Bitcoin Wallet Match",
                "pgp": "Exact PGP Fingerprint Match",
                "email": "Exact Email Address Match",
                "alias": "Exact Vendor Username Match",
                "username": "Exact Vendor Username Match",
                "onion": "Exact Onion URL Match",
                "listing_url": "Exact Listing URL Match",
            }
            evidence_label = label_map.get(itype, f"Exact {itype.upper()} Match")

            return {
                "matched": True,
                "vendor1_id": vendor1_id,
                "vendor2_id": vendor2_id,
                "identity_id": row["identity_id"],
                "identity_type": itype,
                "shared_value": row["value"],
                "confidence": 1.0,
                "confidence_percentage": 100.0,
                "status": "AUTO_MERGED",
                "action": "MERGED",
                "evidence": f"{evidence_label}: {row['value']}",
                "reason": evidence_label,
            }

    @classmethod
    def run_full_deterministic_resolution(cls) -> Dict[str, int]:
        """
        Scans all multi-vendor shared unique identifiers (PGP, BTC, Email, Aliases, Onion)
        and persists 100% confidence SAME_AS relationships and cluster merges.
        """
        logger.info("Executing Pipeline 1: Full Deterministic Identity Resolution...")
        stats = {
            "same_as_edges_created": 0,
            "shared_pgp": 0,
            "shared_email": 0,
            "shared_wallet": 0,
            "shared_alias": 0,
        }

        query = """
        SELECT
            vim1.vendor_id AS v1_id,
            vim2.vendor_id AS v2_id,
            i.identity_id,
            i.identity_type,
            i.value,
            i.normalized_value
        FROM vendoridentitymap vim1
        JOIN vendoridentitymap vim2 ON vim1.identity_id = vim2.identity_id AND vim1.vendor_id < vim2.vendor_id
        JOIN identities i ON vim1.identity_id = i.identity_id
        WHERE i.identity_type IN ('pgp', 'email', 'bitcoin', 'alias', 'onion', 'listing_url')
        """

        # Fast in-memory lookup of vendor_id -> primary alias identity_id
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT vim.vendor_id, vim.identity_id
                FROM vendoridentitymap vim
                JOIN identities i ON vim.identity_id = i.identity_id
                WHERE i.identity_type = 'alias'
                """
            )
            vendor_to_alias: Dict[int, int] = {row["vendor_id"]: row["identity_id"] for row in cursor.fetchall()}

        relationships_to_insert: List[Dict[str, Any]] = []

        with get_db_cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()
            logger.info("Discovered %d shared deterministic identity instances.", len(rows))

            for r in rows:
                itype = r["identity_type"]
                if itype == "pgp":
                    stats["shared_pgp"] += 1
                elif itype == "email":
                    stats["shared_email"] += 1
                elif itype == "bitcoin":
                    stats["shared_wallet"] += 1
                elif itype == "alias":
                    stats["shared_alias"] += 1

                id1 = vendor_to_alias.get(r["v1_id"])
                id2 = vendor_to_alias.get(r["v2_id"])

                if id1 and id2 and id1 != id2:
                    evidence_payload = {
                        "pipeline": "Stage 1 — Deterministic Matching",
                        "match_type": "exact_unique_identifier",
                        "shared_identity_type": itype,
                        "shared_value": r["value"],
                        "confidence": 1.0000,
                        "status": "AUTO_MERGED",
                    }
                    relationships_to_insert.append(
                        {
                            "identity1_id": min(id1, id2),
                            "identity2_id": max(id1, id2),
                            "relationship_type": "SAME_AS",
                            "weight": 1.000,
                            "evidence": evidence_payload,
                        }
                    )

        if relationships_to_insert:
            inserted = RelationshipRepository.bulk_upsert_relationships(relationships_to_insert)
            stats["same_as_edges_created"] = inserted
            logger.info("Upserted %d deterministic SAME_AS edges into IdentityRelationships.", inserted)

        return stats
