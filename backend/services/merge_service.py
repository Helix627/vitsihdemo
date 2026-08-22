"""Identity Merging and Human-in-the-Loop Audit Service."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from core.logging import logger
from database.connection import transaction
from database.repositories.identity_repo import IdentityRepository
from database.repositories.merge_repo import MergeRepository
from database.repositories.relationship_repo import RelationshipRepository


class MergeService:
    """Executes deterministic and human-approved identity merges."""

    @classmethod
    def execute_merge(
        cls,
        primary_id: int,
        merged_id: int,
        method: str = "probabilistic_manual",
        confidence: float = 1.0,
        reviewer_notes: str = "",
    ) -> Dict[str, Any]:
        """
        Merge two identities:
        1. Creates a bidirectional SAME_AS relationship edge in IdentityRelationships.
        2. Records the merge audit in IdentityMerges.
        3. Updates mappings so queries resolve correctly.
        """
        if primary_id == merged_id:
            return {"success": False, "error": "Cannot merge an identity into itself."}

        primary = IdentityRepository.get_by_id(primary_id)
        merged = IdentityRepository.get_by_id(merged_id)

        if not primary or not merged:
            return {"success": False, "error": "One or both identities not found."}

        # 1. Insert/Update SAME_AS edge
        RelationshipRepository.bulk_upsert_relationships(
            [
                {
                    "identity1_id": min(primary_id, merged_id),
                    "identity2_id": max(primary_id, merged_id),
                    "relationship_type": "SAME_AS",
                    "weight": confidence,
                    "evidence": {
                        "resolution_method": method,
                        "confidence": confidence,
                        "reviewer_notes": reviewer_notes,
                        "primary_value": primary["value"],
                        "merged_value": merged["value"],
                    },
                }
            ]
        )

        # 2. Record in IdentityMerges audit table
        merge_log_id = MergeRepository.record_merge(
            primary_id=primary_id,
            merged_id=merged_id,
            method=method,
            confidence=confidence,
            notes=reviewer_notes,
            status="merged",
        )

        logger.info(
            "Successfully merged Identity #%d into #%d (method=%s, confidence=%.2f, log_id=%d)",
            merged_id,
            primary_id,
            method,
            confidence,
            merge_log_id,
        )

        return {
            "success": True,
            "merge_id": merge_log_id,
            "primary_identity": primary,
            "merged_identity": merged,
            "confidence": confidence,
            "status": "merged",
        }
