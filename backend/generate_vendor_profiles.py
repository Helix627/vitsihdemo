"""Generate realistic vendor profile data for main_db.Vendor_Profile."""

import os
import random
import string
from typing import Dict, List, Optional, Tuple

import mysql.connector
from faker import Faker
from mysql.connector import Error

# -------------------------------
# Configuration
# -------------------------------
DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = ""
DB_NAME = "main_db"

# Allow runtime overrides from environment variables.
DB_HOST = os.getenv("DB_HOST", DB_HOST)
DB_USER = os.getenv("DB_USER", DB_USER)
DB_PASSWORD = os.getenv("DB_PASSWORD", DB_PASSWORD)
DB_NAME = os.getenv("DB_NAME", DB_NAME)

EMAIL_PROVIDERS = [
    "gmail.com",
    "outlook.com",
    "proton.me",
    "tutanota.com",
    "mail.com",
    "yahoo.com",
]

BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

faker = Faker()


def connect_db():
    """Connect to MySQL and return connection."""
    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
        )
        print(f"Connected to {DB_NAME}")
        return connection
    except Error as exc:
        print(f"Database connection failed: {exc}")
        raise


def create_table(connection) -> None:
    """Create Vendor_Profile table if it does not exist."""
    create_sql = """
    CREATE TABLE IF NOT EXISTS Vendor_Profile (
        vendor_id INT PRIMARY KEY,
        alias VARCHAR(255),
        username VARCHAR(255),
        email VARCHAR(255) NULL,
        bitcoin_wallet VARCHAR(64) NULL,
        CONSTRAINT fk_vendor_profile_vendor
            FOREIGN KEY (vendor_id)
            REFERENCES Vendors(vendor_id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
    )
    """

    cursor = connection.cursor()
    try:
        cursor.execute(create_sql)
        connection.commit()
    finally:
        cursor.close()


def fetch_vendors(connection) -> List[Tuple[int, str]]:
    """Fetch vendor_id and alias from Vendors table."""
    query = """
    SELECT vendor_id, user_name
    FROM Vendors
    """

    cursor = connection.cursor()
    try:
        cursor.execute(query)
        rows = cursor.fetchall()
        print(f"Fetched {len(rows)} vendors")
        return rows
    finally:
        cursor.close()


def _sanitize_alias(alias: str) -> str:
    """Normalize alias into lowercase alphanumeric token."""
    cleaned = "".join(ch.lower() for ch in alias if ch.isalnum())
    return cleaned or "vendor"


def _split_alias_tokens(alias: str) -> List[str]:
    """Split alias into alphanumeric lowercase tokens."""
    token = []
    tokens = []
    for ch in alias:
        if ch.isalnum():
            token.append(ch.lower())
        elif token:
            tokens.append("".join(token))
            token = []

    if token:
        tokens.append("".join(token))

    if not tokens:
        tokens = ["vendor"]

    return tokens


def generate_username(alias: str) -> str:
    """Generate varied usernames inspired by alias."""
    base = _sanitize_alias(alias)
    tokens = _split_alias_tokens(alias)
    head = tokens[0]

    patterns = [
        lambda: f"{base}{random.randint(10, 9999)}",
        lambda: f"{head}_{random.choice(['dev', 'ops', 'admin', 'official'])}",
        lambda: f"official_{head}",
        lambda: f"{head}_{random.randint(1, 99)}",
        lambda: f"{head}{faker.lexify(text='??').lower()}",
        lambda: f"{head}_{random.choice(['prime', 'node', 'vault', 'market'])}",
    ]

    username = random.choice(patterns)()

    # Keep username practical and consistent.
    allowed = string.ascii_lowercase + string.digits + "_"
    username = "".join(ch for ch in username.lower() if ch in allowed)

    if not username:
        username = f"vendor{random.randint(100, 9999)}"

    return username[:40]


def generate_email(username: str) -> Optional[str]:
    """Generate an email for ~70 percent of profiles."""
    if random.random() > 0.70:
        return None

    provider = random.choice(EMAIL_PROVIDERS)
    return f"{username}@{provider}"


def generate_bitcoin_wallet() -> Optional[str]:
    """Generate a realistic-looking legacy Bitcoin address for ~60 percent."""
    if random.random() > 0.60:
        return None

    prefix = random.choice(["1", "3"])
    total_length = random.randint(26, 35)
    body_length = total_length - 1
    body = "".join(random.choice(BASE58_ALPHABET) for _ in range(body_length))
    return prefix + body


def insert_profiles(connection, profiles: List[Dict[str, Optional[str]]]) -> None:
    """Insert or update profile rows safely using upsert."""
    upsert_sql = """
    INSERT INTO Vendor_Profile (vendor_id, alias, username, email, bitcoin_wallet)
    VALUES (%s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
        alias = VALUES(alias),
        username = VALUES(username),
        email = VALUES(email),
        bitcoin_wallet = VALUES(bitcoin_wallet)
    """

    payload = [
        (
            profile["vendor_id"],
            profile["alias"],
            profile["username"],
            profile["email"],
            profile["bitcoin_wallet"],
        )
        for profile in profiles
    ]

    cursor = connection.cursor()
    try:
        cursor.executemany(upsert_sql, payload)
        connection.commit()
        print("Inserted successfully")
    except Error:
        connection.rollback()
        print("Insert failed, transaction rolled back")
        raise
    finally:
        cursor.close()


def main() -> None:
    """Orchestrate table creation, profile generation, and insertion."""
    connection = None
    try:
        connection = connect_db()
        create_table(connection)
        vendors = fetch_vendors(connection)

        profiles = []
        for vendor_id, alias in vendors:
            alias_value = alias or f"vendor_{vendor_id}"
            username = generate_username(alias_value)

            profiles.append(
                {
                    "vendor_id": vendor_id,
                    "alias": alias_value,
                    "username": username,
                    "email": generate_email(username),
                    "bitcoin_wallet": generate_bitcoin_wallet(),
                }
            )

        print(f"Generated {len(profiles)} profiles")

        if profiles:
            insert_profiles(connection, profiles)

        print("Done.")
    except Error as exc:
        print(f"MySQL error: {exc}")
    except Exception as exc:
        print(f"Unexpected error: {exc}")
    finally:
        if connection is not None and connection.is_connected():
            connection.close()


if __name__ == "__main__":
    main()
