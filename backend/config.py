"""Application configuration for database and server settings."""

import os

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "root"),
    "database": os.getenv("DB_NAME", "main_db"),
}

# Optional SSL configuration for managed cloud MySQL (e.g. Aiven, TiDB Cloud)
if os.getenv("DB_SSL_CA"):
    DB_CONFIG["ssl_ca"] = os.getenv("DB_SSL_CA")
elif os.getenv("DB_SSL_VERIFY_IDENTITY", "false").lower() == "true":
    DB_CONFIG["ssl_verify_identity"] = True

VENDOR_LIMIT = int(os.getenv("VENDOR_LIMIT", 50))

SERVER_HOST = os.getenv("HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("PORT", 5000))
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
