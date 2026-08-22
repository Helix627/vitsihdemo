"""Vendor Repository: Data Access for Canonical Marketplace Vendors."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from database.connection import get_db_cursor
from core.logging import logger


class VendorRepository:
    """Encapsulates all SQL queries related to canonical Vendors."""

    MARKET_NAMES = {
        1: "Agora",
        2: "Pandora",
        5: "Nucleus",
        6: "Evolution",
        7: "Abraxas",
        17: "Mango",
        19: "Outlaw",
        21: "Silkkitie",
        23: "Tochka",
        59: "TraderDeal",
        60: "Hansa",
        63: "Oasis",
        65: "Alphabay",
        66: "Acropolis",
        67: "WallStreet",
        101: "ShadowBay",
        102: "NightMarket",
    }

    @staticmethod
    def get_by_id(vendor_id: int) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM Vendors WHERE vendor_id = %s"
        with get_db_cursor() as cursor:
            cursor.execute(query, (vendor_id,))
            row = cursor.fetchone()
            if row:
                row["marketplace_name"] = VendorRepository.MARKET_NAMES.get(row.get("market_id"), "Darknet Market")
            return row

    @staticmethod
    def get_by_username(username: str) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM Vendors WHERE user_name = %s LIMIT 1"
        with get_db_cursor() as cursor:
            cursor.execute(query, (username,))
            row = cursor.fetchone()
            if row:
                row["marketplace_name"] = VendorRepository.MARKET_NAMES.get(row.get("market_id"), "Darknet Market")
            return row

    @staticmethod
    def list_vendors(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        query = "SELECT * FROM Vendors ORDER BY vendor_id ASC LIMIT %s OFFSET %s"
        with get_db_cursor() as cursor:
            cursor.execute(query, (limit, offset))
            rows = cursor.fetchall()
            for r in rows:
                r["marketplace_name"] = VendorRepository.MARKET_NAMES.get(r.get("market_id"), "Darknet Market")
            return rows

    @staticmethod
    def list_cross_market_sample(limit_per_market: int = 25) -> List[Dict[str, Any]]:
        """Fetch balanced cross-marketplace vendor slice for multi-market graph visualization."""
        query = """
        (SELECT * FROM Vendors WHERE market_id = 1 ORDER BY vendor_id ASC LIMIT %s)
        UNION ALL
        (SELECT * FROM Vendors WHERE market_id = 101 ORDER BY vendor_id ASC LIMIT %s)
        UNION ALL
        (SELECT * FROM Vendors WHERE market_id = 102 ORDER BY vendor_id ASC LIMIT %s);
        """
        with get_db_cursor() as cursor:
            cursor.execute(query, (limit_per_market, limit_per_market, limit_per_market))
            rows = cursor.fetchall()
            for r in rows:
                r["marketplace_name"] = VendorRepository.MARKET_NAMES.get(r.get("market_id"), "Darknet Market")
            return rows

    @staticmethod
    def get_cross_market_links(vendor_id: int) -> List[Dict[str, Any]]:
        """
        Find all other vendor personas across different marketplaces that share
        identities (PGP, Bitcoin Wallet, Email, or Alias) with this vendor.
        """
        query = """
        SELECT v2.vendor_id, v2.user_name, v2.market_id, v2.vendor_link,
               i.identity_type, i.value, i.normalized_value
        FROM vendoridentitymap vim1
        JOIN vendoridentitymap vim2 ON vim1.identity_id = vim2.identity_id AND vim1.vendor_id != vim2.vendor_id
        JOIN vendors v2 ON vim2.vendor_id = v2.vendor_id
        JOIN identities i ON vim1.identity_id = i.identity_id
        WHERE vim1.vendor_id = %s;
        """
        with get_db_cursor() as cursor:
            cursor.execute(query, (vendor_id,))
            rows = cursor.fetchall()

            # Group by target vendor_id
            grouped: Dict[int, Dict[str, Any]] = {}
            for r in rows:
                t_vid = r["vendor_id"]
                if t_vid not in grouped:
                    grouped[t_vid] = {
                        "vendor_id": t_vid,
                        "user_name": r["user_name"],
                        "market_id": r["market_id"],
                        "marketplace_name": VendorRepository.MARKET_NAMES.get(r["market_id"], f"Market #{r['market_id']}"),
                        "vendor_link": r["vendor_link"],
                        "shared_identities": [],
                        "shared_types": set(),
                        "confidence_score": 1.0000,
                    }
                grouped[t_vid]["shared_identities"].append({
                    "type": r["identity_type"],
                    "value": r["value"],
                })
                grouped[t_vid]["shared_types"].add(r["identity_type"])

            result = []
            for item in grouped.values():
                item["shared_types"] = sorted(list(item["shared_types"]))
                result.append(item)

            return sorted(result, key=lambda x: len(x["shared_identities"]), reverse=True)

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
            rows = cursor.fetchall()
            for r in rows:
                r["marketplace_name"] = VendorRepository.MARKET_NAMES.get(r.get("market_id"), "Darknet Market")
            return rows
