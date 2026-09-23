"""Database Connection Pool and Atomic Transaction Manager."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional

import time
import mysql.connector
from config import DB_CONFIG
from core.logging import logger
from mysql.connector import errorcode, pooling

_POOL: Optional[pooling.MySQLConnectionPool] = None
_LAST_CONNECT_FAIL_TIME: float = 0.0
_CONNECT_COOLDOWN: float = 30.0  # seconds between reconnection attempts if offline


def is_db_available() -> bool:
    global _POOL, _LAST_CONNECT_FAIL_TIME
    if _POOL is not None:
        return True
    if time.time() - _LAST_CONNECT_FAIL_TIME < _CONNECT_COOLDOWN:
        return False
    try:
        init_connection_pool()
        return True
    except Exception:
        return False


def init_connection_pool(pool_name: str = "cti_db_pool", pool_size: int = 16) -> pooling.MySQLConnectionPool:
    """Initialize the MySQL connection pool."""
    global _POOL, _LAST_CONNECT_FAIL_TIME
    if _POOL is None:
        if time.time() - _LAST_CONNECT_FAIL_TIME < _CONNECT_COOLDOWN:
            raise mysql.connector.Error(msg="MySQL connection pool offline (cooldown active).")
        try:
            logger.info("Initializing MySQL connection pool '%s' (size=%d)...", pool_name, pool_size)
            config = dict(DB_CONFIG)
            if "connection_timeout" not in config:
                config["connection_timeout"] = 2
            _POOL = pooling.MySQLConnectionPool(
                pool_name=pool_name,
                pool_size=pool_size,
                pool_reset_session=True,
                **config,
            )
            logger.info("MySQL connection pool initialized successfully.")
        except Exception as err:
            _LAST_CONNECT_FAIL_TIME = time.time()
            logger.error("Failed to initialize MySQL connection pool: %s", err)
            raise
    return _POOL


def get_connection() -> mysql.connector.MySQLConnection:
    """Acquire a raw MySQL connection from the pool."""
    global _POOL
    if _POOL is None:
        init_connection_pool()
    return _POOL.get_connection()


@contextmanager
def get_db_cursor(dictionary: bool = True) -> Generator[mysql.connector.cursor.MySQLCursor, None, None]:
    """
    Context manager that yields a database cursor and automatically
    handles connection commits and returns the connection to the pool.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=dictionary)
    try:
        yield cursor
        conn.commit()
    except Exception as exc:
        conn.rollback()
        logger.error("Database query failed, rolled back: %s", exc)
        raise
    finally:
        cursor.close()
        conn.close()


@contextmanager
def transaction() -> Generator[mysql.connector.cursor.MySQLCursor, None, None]:
    """
    Context manager for multi-statement atomic transactions.
    Explicitly commits on success or rolls back on any exception.
    """
    conn = get_connection()
    conn.autocommit = False
    cursor = conn.cursor(dictionary=True)
    try:
        yield cursor
        conn.commit()
    except Exception as exc:
        conn.rollback()
        logger.error("Transaction failed and was rolled back: %s", exc)
        raise
    finally:
        cursor.close()
        conn.close()
