"""Database connection pooling and transaction management utilities."""

from __future__ import annotations

import contextlib
from typing import Any, Dict, Generator, Optional
import mysql.connector
from mysql.connector import Error, pooling

from config import DB_CONFIG
from core.logging import logger

_POOL: Optional[pooling.MySQLConnectionPool] = None


def init_connection_pool(pool_size: int = 10, pool_name: str = "cti_db_pool") -> pooling.MySQLConnectionPool:
    """Initialize or return the global MySQL connection pool."""
    global _POOL
    if _POOL is None:
        try:
            logger.info("Initializing MySQL connection pool (size=%d)...", pool_size)
            pool_config = dict(DB_CONFIG)
            pool_config["pool_name"] = pool_name
            pool_config["pool_size"] = pool_size
            pool_config["pool_reset_session"] = True
            _POOL = pooling.MySQLConnectionPool(**pool_config)
            logger.info("MySQL connection pool initialized successfully.")
        except Error as exc:
            logger.error("Failed to initialize connection pool: %s", exc)
            raise RuntimeError(f"Database connection pool initialization error: {exc}") from exc
    return _POOL


def get_connection():
    """Acquire a connection from the pool or fallback to direct connect."""
    global _POOL
    if _POOL is None:
        try:
            init_connection_pool()
        except Exception:
            pass

    if _POOL is not None:
        try:
            return _POOL.get_connection()
        except Error as exc:
            logger.warning("Pool connection checkout failed (%s), falling back to direct connection", exc)

    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Error as exc:
        logger.error("Direct connection failed: %s", exc)
        raise RuntimeError(f"Failed to connect to MySQL: {exc}") from exc


@contextlib.contextmanager
def get_db_cursor(dictionary: bool = True, commit: bool = True) -> Generator[Any, None, None]:
    """Context manager for obtaining a database cursor with automatic cleanup and commit."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=dictionary)
    try:
        yield cursor
        if commit:
            conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        cursor.close()
        conn.close()


@contextlib.contextmanager
def transaction() -> Generator[Any, None, None]:
    """Context manager for executing operations within an atomic database transaction."""
    conn = get_connection()
    conn.autocommit = False
    cursor = conn.cursor(dictionary=True)
    try:
        yield cursor
        conn.commit()
    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        logger.error("Transaction rolled back due to error: %s", exc)
        raise
    finally:
        cursor.close()
        conn.close()
