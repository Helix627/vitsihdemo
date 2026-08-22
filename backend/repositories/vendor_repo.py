"""Repository for querying canonical vendor records."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from core.database import get_db_cursor


class VendorRepository:
    """Encapsulates data access for Vendors table."""

    @staticmethod
    def get_by_id(vendor_id: int) -> Optional[Dict[str, Any]]:
        """Fetch a single vendor by primary key."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    vendor_id, user_name, market_id, user_id, link,
                    profile, vendor_link, added, updated, scraped, imposter
                FROM vendors
                WHERE vendor_id = %s
                """,
                (vendor_id,),
            )
            return cursor.fetchone()

    @staticmethod
    def get_all(limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Fetch paginated vendors."""
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    vendor_id, user_name, market_id, user_id, link,
                    profile, vendor_link, added, updated, scraped, imposter
                FROM vendors
                ORDER BY vendor_id ASC
                LIMIT %s OFFSET %s
                """,
                (limit, offset),
            )
            return cursor.fetchall()

    @staticmethod
    def count() -> int:
        """Count total vendors in database."""
        with get_db_cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS cnt FROM vendors")
            res = cursor.fetchone()
            return res["cnt"] if res else 0

    @staticmethod
    def search(query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search vendors by user_name or vendor_id."""
        cleaned = query.strip()
        if not cleaned:
            return []

        with get_db_cursor() as cursor:
            pattern = f"%{cleaned}%"
            cursor.execute(
                """
                SELECT
                    vendor_id, user_name, market_id, profile, vendor_link
                FROM vendors
                WHERE user_name LIKE %s OR CAST(vendor_id AS CHAR) = %s
                LIMIT %s
                """,
                (pattern, cleaned, limit),
            )
            return cursor.fetchall()
