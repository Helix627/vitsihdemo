"""Identity Repository: Data Access for Generic Normalized Identities and Mappings."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set
from database.connection import get_db_cursor
from core.logging import logger


class IdentityRepository:
    """Encapsulates all SQL queries for Identities and VendorIdentityMap."""

    @staticmethod
    def get_by_id(identity_id: int) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM Identities WHERE identity_id = %s"
        with get_db_cursor() as cursor:
            cursor.execute(query, (identity_id,))
            return cursor.fetchone()

    @staticmethod
    def find_by_type_and_value(identity_type: str, normalized_val: str) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM Identities WHERE identity_type = %s AND normalized_value = %s"
        with get_db_cursor() as cursor:
            cursor.execute(query, (identity_type, normalized_val))
            return cursor.fetchone()

    @staticmethod
    def get_identities_for_vendor(vendor_id: int) -> List[Dict[str, Any]]:
        query = """
        SELECT i.*, vim.source_table, vim.confidence_score
        FROM Identities i
        JOIN VendorIdentityMap vim ON i.identity_id = vim.identity_id
        WHERE vim.vendor_id = %s
        ORDER BY i.identity_type, i.identity_id
        """
        with get_db_cursor() as cursor:
            cursor.execute(query, (vendor_id,))
            return cursor.fetchall()

    @staticmethod
    def get_vendors_for_identity(identity_id: int) -> List[Dict[str, Any]]:
        query = """
        SELECT v.*, vim.source_table, vim.confidence_score
        FROM Vendors v
        JOIN VendorIdentityMap vim ON v.vendor_id = vim.vendor_id
        WHERE vim.identity_id = %s
        """
        with get_db_cursor() as cursor:
            cursor.execute(query, (identity_id,))
            return cursor.fetchall()

    @staticmethod
    def count_by_type() -> Dict[str, int]:
        query = "SELECT identity_type, COUNT(*) AS count FROM Identities GROUP BY identity_type"
        with get_db_cursor() as cursor:
            cursor.execute(query)
            return {row["identity_type"]: int(row["count"]) for row in cursor.fetchall()}

    @staticmethod
    def search_identities(query_str: str, identity_type: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        if identity_type:
            query = "SELECT * FROM Identities WHERE identity_type = %s AND normalized_value LIKE %s LIMIT %s"
            params = (identity_type, f"%{query_str}%", limit)
        else:
            query = "SELECT * FROM Identities WHERE normalized_value LIKE %s LIMIT %s"
            params = (f"%{query_str}%", limit)

        with get_db_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()
