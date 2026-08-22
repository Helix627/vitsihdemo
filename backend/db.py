"""Database connection utilities."""

import mysql.connector
from mysql.connector import Error

from config import DB_CONFIG


def get_connection():
    """Create and return a MySQL connection."""
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Error as exc:
        raise RuntimeError(f"Failed to connect to MySQL: {exc}") from exc
