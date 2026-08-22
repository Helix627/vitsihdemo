"""Migration service: Transforms denormalized tables into 3NF graph schema."""

from __future__ import annotations

import itertools
import time
from typing import Any, Dict, List, Set, Tuple

from core.database import get_connection, get_db_cursor, transaction
from core.logging import logger
from repositories.identity_repo import IdentityRepository
from repositories.relationship_repo import RelationshipRepository


class MigrationService:
    """Manages transactional schema creation, data normalization, and relationship generation."""

    @staticmethod
    def create_schema() -> None:
        """Create 3NF tables and indexes if they do not exist."""
        logger.info("Ensuring 3NF schema tables exist...")
        ddl_statements = [
            """
            CREATE TABLE IF NOT EXISTS Identities (
                identity_id INT AUTO_INCREMENT PRIMARY KEY,
                identity_type ENUM('alias', 'username', 'email', 'bitcoin', 'pgp') NOT NULL,
                value VARCHAR(512) NOT NULL,
                normalized_value VARCHAR(512) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uk_identity_type_val (identity_type, normalized_value(255)),
                KEY idx_identity_type (identity_type),
                KEY idx_value (value(191)),
                KEY idx_normalized_value (normalized_value(191))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """,
            """
            CREATE TABLE IF NOT EXISTS VendorIdentityMap (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendor_id INT NOT NULL,
                identity_id INT NOT NULL,
                source_table VARCHAR(64) NOT NULL,
                confidence_score DECIMAL(4,3) DEFAULT 1.000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_vim_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_vim_identity FOREIGN KEY (identity_id) REFERENCES Identities(identity_id) ON DELETE CASCADE ON UPDATE CASCADE,
                UNIQUE KEY uk_vendor_identity_source (vendor_id, identity_id, source_table),
                KEY idx_vim_vendor_id (vendor_id),
                KEY idx_vim_identity_id (identity_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """,
            """
            CREATE TABLE IF NOT EXISTS IdentityRelationships (
                relationship_id INT AUTO_INCREMENT PRIMARY KEY,
                identity1_id INT NOT NULL,
                identity2_id INT NOT NULL,
                relationship_type VARCHAR(64) NOT NULL,
                weight DECIMAL(4,3) DEFAULT 1.000,
                evidence JSON NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_ir_identity1 FOREIGN KEY (identity1_id) REFERENCES Identities(identity_id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_ir_identity2 FOREIGN KEY (identity2_id) REFERENCES Identities(identity_id) ON DELETE CASCADE ON UPDATE CASCADE,
                UNIQUE KEY uk_rel_pair (identity1_id, identity2_id, relationship_type),
                KEY idx_ir_identity1 (identity1_id),
                KEY idx_ir_identity2 (identity2_id),
                KEY idx_ir_rel_type (relationship_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """,
        ]

        conn = get_connection()
        cursor = conn.cursor()
        try:
            for statement in ddl_statements:
                cursor.execute(statement)
            conn.commit()
            logger.info("3NF schema tables verified successfully.")
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def normalize_value(identity_type: str, raw_value: Any) -> Tuple[str, str]:
        """
        Normalize and clean identity values.
        Returns: (clean_value, normalized_value)
        """
        if not raw_value:
            return "", ""

        val = str(raw_value).strip()
        if not val:
            return "", ""

        if identity_type == "email":
            return val, val.lower()
        elif identity_type == "bitcoin":
            return val, val
        elif identity_type == "pgp":
            clean_fp = val.upper().replace(" ", "")
            return clean_fp, clean_fp
        elif identity_type == "username":
            return val, val.lower()
        elif identity_type == "alias":
            return val, val.strip()
        return val, val

    @classmethod
    def migrate_vendor_profiles(cls, batch_size: int = 2000) -> Dict[str, int]:
        """Read all rows from vendor_profile and populate Identities and VendorIdentityMap."""
        logger.info("Starting migration of vendor_profile records...")
        stats = {"profiles_read": 0, "identities_upserted": 0, "mappings_created": 0}

        offset = 0
        while True:
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    SELECT vendor_id, alias, username, email, bitcoin_wallet
                    FROM vendor_profile
                    ORDER BY vendor_id ASC
                    LIMIT %s OFFSET %s
                    """,
                    (batch_size, offset),
                )
                rows = cursor.fetchall()

            if not rows:
                break

            stats["profiles_read"] += len(rows)

            identities_to_upsert: List[Dict[str, str]] = []
            vendor_profile_extracted: List[Tuple[int, List[Tuple[str, str, str]]]] = []

            for row in rows:
                v_id = int(row["vendor_id"])
                extracted: List[Tuple[str, str, str]] = []

                # Alias
                if row.get("alias"):
                    val, nval = cls.normalize_value("alias", row["alias"])
                    if nval:
                        extracted.append(("alias", val, nval))
                        identities_to_upsert.append(
                            {"identity_type": "alias", "value": val, "normalized_value": nval}
                        )

                # Username
                if row.get("username"):
                    val, nval = cls.normalize_value("username", row["username"])
                    if nval:
                        extracted.append(("username", val, nval))
                        identities_to_upsert.append(
                            {"identity_type": "username", "value": val, "normalized_value": nval}
                        )

                # Email
                if row.get("email"):
                    val, nval = cls.normalize_value("email", row["email"])
                    if nval:
                        extracted.append(("email", val, nval))
                        identities_to_upsert.append(
                            {"identity_type": "email", "value": val, "normalized_value": nval}
                        )

                # Bitcoin
                if row.get("bitcoin_wallet"):
                    val, nval = cls.normalize_value("bitcoin", row["bitcoin_wallet"])
                    if nval:
                        extracted.append(("bitcoin", val, nval))
                        identities_to_upsert.append(
                            {"identity_type": "bitcoin", "value": val, "normalized_value": nval}
                        )

                vendor_profile_extracted.append((v_id, extracted))

            # Bulk upsert identities and get ID mapping
            id_map = IdentityRepository.bulk_upsert_identities(identities_to_upsert)
            stats["identities_upserted"] += len(id_map)

            # Build VendorIdentityMap records
            mappings: List[Dict[str, Any]] = []
            for v_id, extracted in vendor_profile_extracted:
                for itype, _, nval in extracted:
                    identity_id = id_map.get((itype, nval))
                    if identity_id:
                        mappings.append(
                            {
                                "vendor_id": v_id,
                                "identity_id": identity_id,
                                "source_table": "vendor_profile",
                                "confidence_score": 1.000,
                            }
                        )

            IdentityRepository.bulk_map_vendor_identities(mappings)
            stats["mappings_created"] += len(mappings)

            offset += len(rows)
            logger.info("Migrated %d vendor profiles...", stats["profiles_read"])

        logger.info("Finished vendor_profile migration: %s", stats)
        return stats

    @classmethod
    def migrate_pgp_keys(cls, batch_size: int = 2000) -> Dict[str, int]:
        """Read vendor_pgp_keys, populate PGP identities, parse vendor_ids, and populate VendorIdentityMap."""
        logger.info("Starting migration of vendor_pgp_keys records...")
        stats = {"pgp_keys_read": 0, "identities_upserted": 0, "mappings_created": 0}

        # Get set of all existing vendor_ids to ensure valid foreign keys
        valid_vendors: Set[int] = set()
        with get_db_cursor() as cursor:
            cursor.execute("SELECT vendor_id FROM vendors")
            for row in cursor.fetchall():
                valid_vendors.add(int(row["vendor_id"]))

        offset = 0
        while True:
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, alias, fingerprint, vendor_ids
                    FROM vendor_pgp_keys
                    ORDER BY id ASC
                    LIMIT %s OFFSET %s
                    """,
                    (batch_size, offset),
                )
                rows = cursor.fetchall()

            if not rows:
                break

            stats["pgp_keys_read"] += len(rows)

            identities_to_upsert: List[Dict[str, str]] = []
            pgp_vendor_extracted: List[Tuple[str, str, List[int]]] = []

            for row in rows:
                fingerprint = row.get("fingerprint") or ""
                alias = row.get("alias") or ""
                raw_val = fingerprint if fingerprint else alias

                val, nval = cls.normalize_value("pgp", raw_val)
                if not nval:
                    continue

                identities_to_upsert.append(
                    {"identity_type": "pgp", "value": val, "normalized_value": nval}
                )

                # Parse comma-separated vendor IDs
                raw_vids = row.get("vendor_ids") or ""
                linked_vids = []
                for token in raw_vids.split(","):
                    t = token.strip()
                    if t.isdigit():
                        vid = int(t)
                        if vid in valid_vendors:
                            linked_vids.append(vid)

                pgp_vendor_extracted.append((val, nval, linked_vids))

            id_map = IdentityRepository.bulk_upsert_identities(identities_to_upsert)
            stats["identities_upserted"] += len(id_map)

            mappings: List[Dict[str, Any]] = []
            for _, nval, linked_vids in pgp_vendor_extracted:
                identity_id = id_map.get(("pgp", nval))
                if identity_id:
                    for vid in linked_vids:
                        mappings.append(
                            {
                                "vendor_id": vid,
                                "identity_id": identity_id,
                                "source_table": "vendor_pgp_keys",
                                "confidence_score": 1.000,
                            }
                        )

            IdentityRepository.bulk_map_vendor_identities(mappings)
            stats["mappings_created"] += len(mappings)

            offset += len(rows)
            logger.info("Migrated %d PGP key records...", stats["pgp_keys_read"])

        logger.info("Finished vendor_pgp_keys migration: %s", stats)
        return stats

    @staticmethod
    def generate_same_vendor_relationships(batch_vendor_count: int = 1000) -> Dict[str, int]:
        """
        Generate pairwise undirected relationships (identity1 < identity2)
        for all identities belonging to the same vendor.
        """
        logger.info("Starting generation of 'same_vendor' identity relationships...")
        stats = {"vendors_processed": 0, "relationships_created": 0}

        # Query all distinct vendor IDs in VendorIdentityMap
        vendor_ids: List[int] = []
        with get_db_cursor() as cursor:
            cursor.execute("SELECT DISTINCT vendor_id FROM VendorIdentityMap ORDER BY vendor_id ASC")
            vendor_ids = [int(r["vendor_id"]) for r in cursor.fetchall()]

        logger.info("Found %d vendors with mapped identities.", len(vendor_ids))

        for i in range(0, len(vendor_ids), batch_vendor_count):
            chunk_vids = vendor_ids[i : i + batch_vendor_count]
            format_strings = ",".join(["%s"] * len(chunk_vids))

            vendor_identity_groups: Dict[int, Set[int]] = {}
            with get_db_cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT vendor_id, identity_id
                    FROM VendorIdentityMap
                    WHERE vendor_id IN ({format_strings})
                    """,
                    chunk_vids,
                )
                for row in cursor.fetchall():
                    vid = int(row["vendor_id"])
                    iid = int(row["identity_id"])
                    if vid not in vendor_identity_groups:
                        vendor_identity_groups[vid] = set()
                    vendor_identity_groups[vid].add(iid)

            relationships: List[Dict[str, Any]] = []
            for vid, id_set in vendor_identity_groups.items():
                if len(id_set) < 2:
                    continue

                # Generate all 2-combinations of identities
                for id1, id2 in itertools.combinations(sorted(id_set), 2):
                    relationships.append(
                        {
                            "identity1_id": id1,
                            "identity2_id": id2,
                            "relationship_type": "same_vendor",
                            "weight": 1.000,
                            "evidence": {"vendor_id": vid, "rule": "same_vendor_cluster"},
                        }
                    )

            RelationshipRepository.bulk_upsert_relationships(relationships)
            stats["vendors_processed"] += len(chunk_vids)
            stats["relationships_created"] += len(relationships)

            if stats["vendors_processed"] % 5000 == 0 or stats["vendors_processed"] == len(vendor_ids):
                logger.info(
                    "Processed %d/%d vendors, generated %d pairwise edges...",
                    stats["vendors_processed"],
                    len(vendor_ids),
                    stats["relationships_created"],
                )

        logger.info("Finished relationship generation: %s", stats)
        return stats

    @classmethod
    def run_full_migration(cls) -> Dict[str, Any]:
        """Execute complete end-to-end migration with schema creation and timing."""
        start_time = time.time()
        logger.info("=== STARTING FULL 3NF DATA MIGRATION ===")

        cls.create_schema()
        profile_stats = cls.migrate_vendor_profiles()
        pgp_stats = cls.migrate_pgp_keys()
        rel_stats = cls.generate_same_vendor_relationships()

        elapsed = time.time() - start_time
        summary = {
            "elapsed_seconds": round(elapsed, 2),
            "profile_stats": profile_stats,
            "pgp_stats": pgp_stats,
            "relationship_stats": rel_stats,
            "identities_count_by_type": IdentityRepository.count_by_type(),
            "total_relationships": RelationshipRepository.count(),
        }
        logger.info("=== 3NF DATA MIGRATION COMPLETED IN %.2fs ===", elapsed)
        logger.info("Summary: %s", summary)
        return summary


if __name__ == "__main__":
    MigrationService.run_full_migration()
