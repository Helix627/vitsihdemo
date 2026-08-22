"""Repository for managing Identities and VendorIdentityMap."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set, Tuple
from core.database import get_db_cursor


class IdentityRepository:
    """Encapsulates data access for Identities and VendorIdentityMap tables."""

    @staticmethod
    def get_by_id(identity_id: int) -> Optional[Dict[str, Any]]:
        """Fetch a single identity by primary key."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT identity_id, identity_type, value, normalized_value, created_at
                FROM Identities
                WHERE identity_id = %s
                """,
                (identity_id,),
            )
            return cursor.fetchone()

    @staticmethod
    def get_by_type_and_normalized_val(identity_type: str, normalized_val: str) -> Optional[Dict[str, Any]]:
        """Fetch identity by unique key pair."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT identity_id, identity_type, value, normalized_value, created_at
                FROM Identities
                WHERE identity_type = %s AND normalized_value = %s
                """,
                (identity_type, normalized_val),
            )
            return cursor.fetchone()

    @staticmethod
    def bulk_upsert_identities(identities: List[Dict[str, str]]) -> Dict[Tuple[str, str], int]:
        """
        Bulk upsert identities and return a mapping of (identity_type, normalized_value) -> identity_id.
        Each item in `identities` should have:
          - identity_type: str
          - value: str
          - normalized_value: str
        """
        if not identities:
            return {}

        # Deduplicate incoming payload in memory
        unique_map: Dict[Tuple[str, str], str] = {}
        for item in identities:
            itype = item["identity_type"]
            nval = item["normalized_value"]
            val = item["value"]
            if nval and (itype, nval) not in unique_map:
                unique_map[(itype, nval)] = val

        if not unique_map:
            return {}

        insert_sql = """
        INSERT INTO Identities (identity_type, value, normalized_value)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE
            value = VALUES(value)
        """
        params = [(k[0], v, k[1]) for k, v in unique_map.items()]

        with get_db_cursor() as cursor:
            cursor.executemany(insert_sql, params)

        # Retrieve identity_ids for the inserted/updated items
        # To avoid query size limits, retrieve in chunks
        id_map: Dict[Tuple[str, str], int] = {}
        keys = list(unique_map.keys())
        chunk_size = 500

        with get_db_cursor() as cursor:
            for i in range(0, len(keys), chunk_size):
                chunk = keys[i : i + chunk_size]
                format_strings = ",".join(["(%s, %s)"] * len(chunk))
                flat_params = [val for pair in chunk for val in pair]
                cursor.execute(
                    f"""
                    SELECT identity_id, identity_type, normalized_value
                    FROM Identities
                    WHERE (identity_type, normalized_value) IN ({format_strings})
                    """,
                    flat_params,
                )
                for row in cursor.fetchall():
                    id_map[(row["identity_type"], row["normalized_value"])] = row["identity_id"]

        return id_map

    @staticmethod
    def bulk_map_vendor_identities(mappings: List[Dict[str, Any]]) -> None:
        """
        Bulk upsert VendorIdentityMap records.
        Each item has: vendor_id, identity_id, source_table, confidence_score
        """
        if not mappings:
            return

        insert_sql = """
        INSERT INTO VendorIdentityMap (vendor_id, identity_id, source_table, confidence_score)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            confidence_score = VALUES(confidence_score)
        """
        params = [
            (
                m["vendor_id"],
                m["identity_id"],
                m.get("source_table", "unknown"),
                m.get("confidence_score", 1.0),
            )
            for m in mappings
        ]

        with get_db_cursor() as cursor:
            cursor.executemany(insert_sql, params)

    @staticmethod
    def get_identities_for_vendor(vendor_id: int) -> List[Dict[str, Any]]:
        """Fetch all identities mapped to a given vendor."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    i.identity_id,
                    i.identity_type,
                    i.value,
                    i.normalized_value,
                    i.created_at,
                    vim.source_table,
                    vim.confidence_score
                FROM VendorIdentityMap vim
                JOIN Identities i ON vim.identity_id = i.identity_id
                WHERE vim.vendor_id = %s
                ORDER BY i.identity_type ASC, i.identity_id ASC
                """,
                (vendor_id,),
            )
            return cursor.fetchall()

    @staticmethod
    def get_vendors_for_identity(identity_id: int) -> List[Dict[str, Any]]:
        """Fetch all vendors mapped to a specific identity."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    v.vendor_id,
                    v.user_name,
                    v.market_id,
                    v.profile,
                    v.vendor_link,
                    vim.source_table,
                    vim.confidence_score,
                    vim.created_at AS mapped_at
                FROM VendorIdentityMap vim
                JOIN vendors v ON vim.vendor_id = v.vendor_id
                WHERE vim.identity_id = %s
                ORDER BY v.vendor_id ASC
                """,
                (identity_id,),
            )
            return cursor.fetchall()

    @staticmethod
    def search(query: str, identity_type: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Search identities by substring matching on value / normalized_value."""
        cleaned = query.strip()
        if not cleaned:
            return []

        pattern = f"%{cleaned}%"
        with get_db_cursor() as cursor:
            if identity_type:
                cursor.execute(
                    """
                    SELECT identity_id, identity_type, value, normalized_value, created_at
                    FROM Identities
                    WHERE identity_type = %s AND (value LIKE %s OR normalized_value LIKE %s)
                    LIMIT %s
                    """,
                    (identity_type, pattern, pattern, limit),
                )
            else:
                cursor.execute(
                    """
                    SELECT identity_id, identity_type, value, normalized_value, created_at
                    FROM Identities
                    WHERE value LIKE %s OR normalized_value LIKE %s
                    LIMIT %s
                    """,
                    (pattern, pattern, limit),
                )
            return cursor.fetchall()

    @staticmethod
    def count_by_type() -> Dict[str, int]:
        """Return counts of identities grouped by identity_type."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT identity_type, COUNT(*) AS cnt
                FROM Identities
                GROUP BY identity_type
                """
            )
            results = {row["identity_type"]: row["cnt"] for row in cursor.fetchall()}
            return results
