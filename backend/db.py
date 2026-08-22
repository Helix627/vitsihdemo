"""Database connection utilities (compatibility wrapper for core.database)."""

from core.database import get_connection, get_db_cursor, transaction

__all__ = ["get_connection", "get_db_cursor", "transaction"]
