"""Vendor Repository: Data Access for Canonical Marketplace Vendors."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from database.connection import get_db_cursor
from core.logging import logger


class VendorRepository:
    """Encapsulates all SQL queries related to canonical Vendors."""

    @staticmethod
    def get_by_id(vendor_id: int) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM Vendors WHERE vendor_id = %s"
        with get_db_cursor() as cursor:
            cursor.execute(query, (vendor_id,))
            return cursor.fetchone()

    @staticmethod
    def get_by_username(username: str) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM Vendors WHERE user_name = %s LIMIT 1"
        with get_db_cursor() as cursor:
            cursor.execute(query, (username,))
            return cursor.fetchone()

    @staticmethod
    def list_vendors(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        query = "SELECT * FROM Vendors ORDER BY vendor_id ASC LIMIT %s OFFSET %s"
        with get_db_cursor() as cursor:
            cursor.execute(query, (limit, offset))
            return cursor.fetchall()

    @staticmethod
    def count() -> int:
        query = "SELECT COUNT(*) AS total FROM Vendors"
        with get_db_cursor() as cursor:
            cursor.execute(query)
            row = cursor.fetchone()
            return int(row["total"]) if row else 0

    @staticmethod
    def search_vendors(query_str: str, limit: int = 20) -> List[Dict[str, Any]]:
        query = "SELECT * FROM Vendors WHERE user_name LIKE %s LIMIT %s"
        with get_db_cursor() as cursor:
            cursor.execute(query, (f"%{query_str}%", limit))
            return cursor.fetchall()
