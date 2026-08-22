"""Relationship Repository: Data Access for Graph Edges (Deterministic and Probabilistic)."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
from database.connection import get_db_cursor
from core.logging import logger


class RelationshipRepository:
    """Encapsulates all SQL queries for IdentityRelationships."""

    @staticmethod
    def get_relationships_for_identity(identity_id: int) -> List[Dict[str, Any]]:
        query = """
        SELECT r.*,
               i1.identity_type AS id1_type, i1.normalized_value AS id1_val,
               i2.identity_type AS id2_type, i2.normalized_value AS id2_val
        FROM IdentityRelationships r
        JOIN Identities i1 ON r.identity1_id = i1.identity_id
        JOIN Identities i2 ON r.identity2_id = i2.identity_id
        WHERE r.identity1_id = %s OR r.identity2_id = %s
        """
        with get_db_cursor() as cursor:
            cursor.execute(query, (identity_id, identity_id))
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
        query = "SELECT COUNT(*) AS total FROM IdentityRelationships"
        with get_db_cursor() as cursor:
            cursor.execute(query)
            row = cursor.fetchone()
            return int(row["total"]) if row else 0

    @staticmethod
    def count_by_type() -> Dict[str, int]:
        query = "SELECT relationship_type, COUNT(*) AS count FROM IdentityRelationships GROUP BY relationship_type"
        with get_db_cursor() as cursor:
            cursor.execute(query)
            return {row["relationship_type"]: int(row["count"]) for row in cursor.fetchall()}

    @staticmethod
    def bulk_upsert_relationships(relationships: List[Dict[str, Any]], batch_size: int = 1000) -> int:
        if not relationships:
            return 0

        insert_sql = """
        INSERT INTO IdentityRelationships (identity1_id, identity2_id, relationship_type, weight, evidence)
        VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            weight = VALUES(weight),
            evidence = VALUES(evidence)
        """

        total_inserted = 0
        with get_db_cursor() as cursor:
            for i in range(0, len(relationships), batch_size):
                batch = relationships[i : i + batch_size]
                params = [
                    (
                        min(r["identity1_id"], r["identity2_id"]),
                        max(r["identity1_id"], r["identity2_id"]),
                        r["relationship_type"],
                        r.get("weight", 1.000),
                        json.dumps(r.get("evidence", {})),
                    )
                    for r in batch
                ]
                cursor.executemany(insert_sql, params)
                total_inserted += len(batch)

        return total_inserted
