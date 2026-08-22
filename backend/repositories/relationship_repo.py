"""Repository for managing IdentityRelationships (graph edges)."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
from core.database import get_db_cursor


class RelationshipRepository:
    """Encapsulates data access for IdentityRelationships table."""

    @staticmethod
    def bulk_upsert_relationships(relationships: List[Dict[str, Any]]) -> None:
        """
        Bulk upsert relationships.
        Ensures canonical undirected ordering: identity1_id <= identity2_id.
        Each item has: identity1_id, identity2_id, relationship_type, weight, evidence (dict)
        """
        if not relationships:
            return

        insert_sql = """
        INSERT INTO IdentityRelationships (identity1_id, identity2_id, relationship_type, weight, evidence)
        VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            weight = VALUES(weight),
            evidence = VALUES(evidence)
        """

        params = []
        for r in relationships:
            id1 = min(int(r["identity1_id"]), int(r["identity2_id"]))
            id2 = max(int(r["identity1_id"]), int(r["identity2_id"]))
            if id1 == id2:
                continue  # Skip self loops

            evidence_str = (
                json.dumps(r["evidence"])
                if r.get("evidence") is not None and not isinstance(r.get("evidence"), str)
                else (r.get("evidence") or None)
            )
            params.append(
                (
                    id1,
                    id2,
                    r.get("relationship_type", "same_vendor"),
                    float(r.get("weight", 1.0)),
                    evidence_str,
                )
            )

        if not params:
            return

        with get_db_cursor() as cursor:
            cursor.executemany(insert_sql, params)

    @staticmethod
    def get_relationships_for_identity(identity_id: int) -> List[Dict[str, Any]]:
        """Fetch all connected relationships for a given identity with adjacent identity details."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    ir.relationship_id,
                    ir.identity1_id,
                    ir.identity2_id,
                    ir.relationship_type,
                    ir.weight,
                    ir.evidence,
                    ir.created_at,
                    i1.identity_type AS i1_type,
                    i1.value AS i1_value,
                    i2.identity_type AS i2_type,
                    i2.value AS i2_value
                FROM IdentityRelationships ir
                JOIN Identities i1 ON ir.identity1_id = i1.identity_id
                JOIN Identities i2 ON ir.identity2_id = i2.identity_id
                WHERE ir.identity1_id = %s OR ir.identity2_id = %s
                """,
                (identity_id, identity_id),
            )
            rows = cursor.fetchall()
            for r in rows:
                if isinstance(r.get("evidence"), str):
                    try:
                        r["evidence"] = json.loads(r["evidence"])
                    except Exception:
                        pass
            return rows

    @staticmethod
    def get_all(limit: int = 50000) -> List[Dict[str, Any]]:
        """Fetch graph edges up to limit."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    relationship_id, identity1_id, identity2_id,
                    relationship_type, weight, evidence, created_at
                FROM IdentityRelationships
                LIMIT %s
                """,
                (limit,),
            )
            rows = cursor.fetchall()
            for r in rows:
                if isinstance(r.get("evidence"), str):
                    try:
                        r["evidence"] = json.loads(r["evidence"])
                    except Exception:
                        pass
            return rows

    @staticmethod
    def count() -> int:
        """Count total relationships."""
        with get_db_cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS cnt FROM IdentityRelationships")
            res = cursor.fetchone()
            return res["cnt"] if res else 0
