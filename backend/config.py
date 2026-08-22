"""Application configuration for database and server settings."""

import os

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "main_db"),
}

VENDOR_LIMIT = 50

SERVER_HOST = "0.0.0.0"
SERVER_PORT = 5000
DEBUG = True
