"""Merge Repository: Data Access for Human-in-the-Loop Identity Merge Audits."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from database.connection import get_db_cursor
from core.logging import logger


class MergeRepository:
    """Encapsulates all SQL queries for IdentityMerges."""

    @staticmethod
    def record_merge(
        primary_id: int,
        merged_id: int,
        method: str,
        confidence: float,
        notes: str = "",
        status: str = "merged",
    ) -> int:
        query = """
        INSERT INTO IdentityMerges (primary_identity_id, merged_identity_id, resolution_method, confidence_score, reviewer_notes, status)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        with get_db_cursor() as cursor:
            cursor.execute(query, (primary_id, merged_id, method, confidence, notes, status))
            return cursor.lastrowid

    @staticmethod
    def get_merge_history(limit: int = 50) -> List[Dict[str, Any]]:
        query = """
        SELECT m.*,
               i1.value AS primary_value, i1.identity_type AS primary_type,
               i2.value AS merged_value, i2.identity_type AS merged_type
        FROM IdentityMerges m
        JOIN Identities i1 ON m.primary_identity_id = i1.identity_id
        JOIN Identities i2 ON m.merged_identity_id = i2.identity_id
        ORDER BY m.merged_at DESC
        LIMIT %s
        """
        with get_db_cursor() as cursor:
            cursor.execute(query, (limit,))
            return cursor.fetchall()
