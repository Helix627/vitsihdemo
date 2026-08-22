"""Idempotent Database Ingestion Pipeline for Synthetic Marketplace Data."""

from __future__ import annotations

import csv
import json
import os
import sys
from typing import Any, Dict, List, Optional, Set, Tuple

from core.logging import logger
from database.connection import get_db_cursor
from services.normalization_service import NormalizationService
from .config import GeneratorConfig
from .migration_simulator import MigrationSimulator


class IngestionPipeline:
    """Inserts synthetic marketplace data directly into normalized MySQL 3NF schema."""

    def __init__(self, config: Optional[GeneratorConfig] = None):
        self.config = config or GeneratorConfig()
        self.simulator = MigrationSimulator(self.config)

    def prepare_database(self) -> None:
        """Create ground truth mapping table if it doesn't exist and ensure idempotency."""
        ddl = """
        CREATE TABLE IF NOT EXISTS ground_truth_vendor_migrations (
            id INT PRIMARY KEY AUTO_INCREMENT,
            agora_vendor_id INT NULL,
            agora_username VARCHAR(255) NULL,
            target_marketplace VARCHAR(64) NOT NULL,
            synthetic_vendor_id INT NOT NULL,
            synthetic_username VARCHAR(255) NOT NULL,
            synthetic_alias VARCHAR(255) NOT NULL,
            alias_mutation_type VARCHAR(64) NOT NULL,
            pgp_status VARCHAR(32) NOT NULL,
            wallet_status VARCHAR(32) NOT NULL,
            email_status VARCHAR(32) NOT NULL,
            listing_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_gt_agora (agora_vendor_id),
            KEY idx_gt_synth (synthetic_vendor_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        with get_db_cursor() as cursor:
            cursor.execute(ddl)

    def clean_existing_synthetic_records(self) -> None:
        """Remove previously ingested synthetic records for ShadowBay (101) and NightMarket (102)."""
        logger.info("Cleaning previously generated synthetic records (market_id IN 101, 102)...")
        with get_db_cursor() as cursor:
            # Find synthetic vendor IDs
            cursor.execute("SELECT vendor_id FROM vendors WHERE market_id IN (101, 102);")
            v_rows = cursor.fetchall()
            v_ids = [r["vendor_id"] for r in v_rows]

            if v_ids:
                chunk_size = 500
                for i in range(0, len(v_ids), chunk_size):
                    chunk = v_ids[i : i + chunk_size]
                    format_strings = ",".join(["%s"] * len(chunk))
                    
                    # Delete from vendoridentitymap
                    cursor.execute(f"DELETE FROM vendoridentitymap WHERE vendor_id IN ({format_strings})", tuple(chunk))
                    # Delete from vendor_profile
                    cursor.execute(f"DELETE FROM vendor_profile WHERE vendor_id IN ({format_strings})", tuple(chunk))
                    # Delete from vendors
                    cursor.execute(f"DELETE FROM vendors WHERE vendor_id IN ({format_strings})", tuple(chunk))

            # Clean ground truth table
            cursor.execute("DELETE FROM ground_truth_vendor_migrations WHERE target_marketplace IN ('ShadowBay', 'NightMarket');")
        logger.info("Previous synthetic records cleaned successfully.")

    def run(self, export_csv: bool = True) -> Dict[str, Any]:
        """
        Execute end-to-end simulation and ingestion pipeline.
        """
        self.prepare_database()
        self.clean_existing_synthetic_records()

        logger.info("Starting vendor migration simulation (Random Seed: %d)...", self.config.random_seed)
        sim_data = self.simulator.simulate_migration()

        all_synthetic_vendors = sim_data["shadowbay_vendors"] + sim_data["nightmarket_vendors"]
        logger.info("Total synthetic vendors to ingest: %d", len(all_synthetic_vendors))

        # ------------------------------------------------------------------
        # Step 1: Pre-cache existing Identities in main_db
        # ------------------------------------------------------------------
        logger.info("Indexing existing digital identities from main_db...")
        identity_cache: Dict[Tuple[str, str], int] = {}
        with get_db_cursor() as cursor:
            cursor.execute("SELECT identity_id, identity_type, normalized_value FROM identities;")
            for row in cursor.fetchall():
                identity_cache[(row["identity_type"], (row["normalized_value"] or "").lower())] = row["identity_id"]
        logger.info("Indexed %d existing digital identities.", len(identity_cache))

        # ------------------------------------------------------------------
        # Step 2: Insert into `vendors` table (Calculating next vendor_id)
        # ------------------------------------------------------------------
        logger.info("Ingesting vendors into `vendors` table...")
        with get_db_cursor() as cursor:
            cursor.execute("SELECT COALESCE(MAX(vendor_id), 0) AS max_vid FROM vendors;")
            start_vid = cursor.fetchone()["max_vid"] + 1

        curr_vid = start_vid
        vendor_id_mapping: List[int] = []

        with get_db_cursor() as cursor:
            for v in all_synthetic_vendors:
                v_id = curr_vid
                curr_vid += 1
                cursor.execute(
                    """
                    INSERT INTO vendors (vendor_id, user_name, market_id, user_id, link, profile, vendor_link, added, updated, scraped, imposter)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """,
                    (
                        v_id,
                        v["user_name"],
                        v["market_id"],
                        0,
                        0,
                        v["profile"],
                        v["vendor_link"],
                        v["added"],
                        v["updated"],
                        v["scraped"],
                        0,
                    ),
                )
                v["new_vendor_id"] = v_id
                vendor_id_mapping.append(v_id)

        logger.info("Inserted %d records into `vendors` (vendor_id %d to %d).", len(vendor_id_mapping), start_vid, curr_vid - 1)

        # ------------------------------------------------------------------
        # Step 3: Insert into `vendor_profile`
        # ------------------------------------------------------------------
        logger.info("Ingesting vendor profiles into `vendor_profile`...")
        with get_db_cursor() as cursor:
            for v in all_synthetic_vendors:
                cursor.execute(
                    """
                    INSERT INTO vendor_profile (vendor_id, alias, username, email, bitcoin_wallet)
                    VALUES (%s, %s, %s, %s, %s);
                    """,
                    (
                        v["new_vendor_id"],
                        v["alias"],
                        v["user_name"],
                        v["email"],
                        v["bitcoin_wallet"],
                    ),
                )

        # ------------------------------------------------------------------
        # Step 4: Insert into `vendor_pgp_keys`
        # ------------------------------------------------------------------
        logger.info("Ingesting PGP keys into `vendor_pgp_keys`...")
        pgp_count = 0
        with get_db_cursor() as cursor:
            for v in all_synthetic_vendors:
                pgp = v.get("pgp")
                if pgp:
                    cursor.execute("SELECT id FROM vendor_pgp_keys WHERE fingerprint = %s LIMIT 1;", (pgp["fingerprint"],))
                    existing_pgp = cursor.fetchone()
                    if not existing_pgp:
                        cursor.execute(
                            """
                            INSERT INTO vendor_pgp_keys (alias, fingerprint_f, fingerprint, public_key, vendor_ids, user_hash, review_count, star_rate)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                            """,
                            (
                                v["alias"],
                                pgp["fingerprint_f"],
                                pgp["fingerprint"],
                                pgp["public_key"],
                                str(v["new_vendor_id"]),
                                "",
                                pgp.get("review_count", 0),
                                pgp.get("star_rate", 0.0),
                            ),
                        )
                        pgp_count += 1
                    else:
                        cursor.execute("SELECT vendor_ids FROM vendor_pgp_keys WHERE id = %s;", (existing_pgp["id"],))
                        curr_vids = cursor.fetchone()["vendor_ids"] or ""
                        new_vids = f"{curr_vids},{v['new_vendor_id']}".strip(",")
                        cursor.execute("UPDATE vendor_pgp_keys SET vendor_ids = %s WHERE id = %s;", (new_vids, existing_pgp["id"]))

        logger.info("Ingested/updated %d unique PGP keys.", pgp_count)

        # ------------------------------------------------------------------
        # Step 5: Resolve and Insert Digital Identities into `identities`
        # ------------------------------------------------------------------
        logger.info("Resolving and ingesting digital identities into `identities`...")
        
        def get_or_create_identity(cursor, itype: str, raw_val: str, norm_val: str) -> int:
            norm_clean = (norm_val or "").strip()
            key = (itype, norm_clean.lower())
            if key in identity_cache:
                return identity_cache[key]

            cursor.execute(
                """
                INSERT INTO identities (identity_type, value, normalized_value)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE identity_id=LAST_INSERT_ID(identity_id);
                """,
                (itype, raw_val, norm_clean),
            )
            new_id = cursor.lastrowid
            if not new_id:
                # If LAST_INSERT_ID didn't return, select directly
                cursor.execute(
                    "SELECT identity_id FROM identities WHERE identity_type = %s AND normalized_value = %s LIMIT 1;",
                    (itype, norm_clean),
                )
                row = cursor.fetchone()
                new_id = row["identity_id"] if row else 0

            identity_cache[key] = new_id
            return new_id

        vim_records: List[Tuple[int, int, str, float]] = []
        relationships_to_insert: List[Tuple[int, int, str, float, str]] = []

        with get_db_cursor() as cursor:
            for v in all_synthetic_vendors:
                v_id = v["new_vendor_id"]
                curr_ident_ids: List[int] = []

                # 1. Alias Identity
                alias_val = v["alias"]
                alias_norm = NormalizationService.normalize_alias(alias_val)
                alias_iid = get_or_create_identity(cursor, "alias", alias_val, alias_norm)
                vim_records.append((v_id, alias_iid, "vendor_profile", 1.0))
                curr_ident_ids.append(alias_iid)

                # 2. Username Identity
                user_val = v["user_name"]
                user_norm = user_val.lower()
                user_iid = get_or_create_identity(cursor, "username", user_val, user_norm)
                vim_records.append((v_id, user_iid, "vendor_profile", 1.0))
                curr_ident_ids.append(user_iid)

                # 3. Email Identity (if present)
                if v.get("email"):
                    email_val = v["email"]
                    email_norm = NormalizationService.normalize_email(email_val) or email_val.lower()
                    email_iid = get_or_create_identity(cursor, "email", email_val, email_norm)
                    vim_records.append((v_id, email_iid, "vendor_profile", 1.0))
                    curr_ident_ids.append(email_iid)

                # 4. Bitcoin Wallet Identity (if present)
                if v.get("bitcoin_wallet"):
                    btc_val = v["bitcoin_wallet"]
                    btc_norm = NormalizationService.normalize_wallet(btc_val) or btc_val
                    btc_iid = get_or_create_identity(cursor, "bitcoin", btc_val, btc_norm)
                    vim_records.append((v_id, btc_iid, "vendor_profile", 1.0))
                    curr_ident_ids.append(btc_iid)

                # 5. PGP Key Identity (if present)
                if v.get("pgp"):
                    pgp_val = v["pgp"]["fingerprint"]
                    pgp_norm = NormalizationService.normalize_pgp_fingerprint(pgp_val) or pgp_val.upper()
                    pgp_iid = get_or_create_identity(cursor, "pgp", pgp_val, pgp_norm)
                    vim_records.append((v_id, pgp_iid, "vendor_pgp_keys", 1.0))
                    curr_ident_ids.append(pgp_iid)

                # Build cluster edges (same_vendor)
                for i in range(len(curr_ident_ids)):
                    for j in range(i + 1, len(curr_ident_ids)):
                        id1, id2 = sorted([curr_ident_ids[i], curr_ident_ids[j]])
                        ev_json = json.dumps({"rule": "same_vendor_cluster", "vendor_id": v_id, "market": v["marketplace_name"]})
                        relationships_to_insert.append((id1, id2, "same_vendor", 1.0, ev_json))

        # ------------------------------------------------------------------
        # Step 6: Bulk Insert into `vendoridentitymap`
        # ------------------------------------------------------------------
        logger.info("Ingesting %d vendor identity mappings into `vendoridentitymap`...", len(vim_records))
        with get_db_cursor() as cursor:
            # Batch in chunks of 1000
            for i in range(0, len(vim_records), 1000):
                cursor.executemany(
                    """
                    INSERT IGNORE INTO vendoridentitymap (vendor_id, identity_id, source_table, confidence_score)
                    VALUES (%s, %s, %s, %s);
                    """,
                    vim_records[i : i + 1000],
                )

        # ------------------------------------------------------------------
        # Step 7: Bulk Insert into `identityrelationships`
        # ------------------------------------------------------------------
        logger.info("Ingesting %d intra-cluster identity relationships...", len(relationships_to_insert))
        unique_rels: Dict[Tuple[int, int, str], Tuple[int, int, str, float, str]] = {}
        for r in relationships_to_insert:
            key = (r[0], r[1], r[2])
            unique_rels[key] = r

        rel_list = list(unique_rels.values())
        with get_db_cursor() as cursor:
            for i in range(0, len(rel_list), 1000):
                cursor.executemany(
                    """
                    INSERT IGNORE INTO identityrelationships (identity1_id, identity2_id, relationship_type, weight, evidence)
                    VALUES (%s, %s, %s, %s, %s);
                    """,
                    rel_list[i : i + 1000],
                )

        # ------------------------------------------------------------------
        # Step 8: Ingest into `ground_truth_vendor_migrations`
        # ------------------------------------------------------------------
        logger.info("Ingesting ground truth evaluation mappings...")
        gt_records = sim_data["ground_truth_records"]
        for i, gt in enumerate(gt_records):
            gt["synthetic_vendor_id"] = all_synthetic_vendors[i]["new_vendor_id"]

        with get_db_cursor() as cursor:
            for i in range(0, len(gt_records), 1000):
                cursor.executemany(
                    """
                    INSERT INTO ground_truth_vendor_migrations 
                    (agora_vendor_id, agora_username, target_marketplace, synthetic_vendor_id, synthetic_username, synthetic_alias, alias_mutation_type, pgp_status, wallet_status, email_status, listing_count)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """,
                    [
                        (
                            gt["agora_vendor_id"],
                            gt["agora_username"],
                            gt["target_marketplace"],
                            gt["synthetic_vendor_id"],
                            gt["synthetic_username"],
                            gt["synthetic_alias"],
                            gt["alias_mutation_type"],
                            gt["pgp_status"],
                            gt["wallet_status"],
                            gt["email_status"],
                            gt["listing_count"],
                        )
                        for gt in gt_records[i : i + 1000]
                    ],
                )
        logger.info("Inserted %d ground truth evaluation records.", len(gt_records))

        # ------------------------------------------------------------------
        # Step 9: Export Synthetic CSV Listings
        # ------------------------------------------------------------------
        if export_csv:
            data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
            os.makedirs(data_dir, exist_ok=True)
            sb_csv_path = os.path.join(data_dir, "shadowbay_listings.csv")
            nm_csv_path = os.path.join(data_dir, "nightmarket_listings.csv")
            
            headers = ["Vendor", "Category", "Item", "Item Description", "Price", "Origin", "Destination", "Rating", "Remarks"]

            # ShadowBay CSV
            with open(sb_csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
                writer.writeheader()
                for l in sim_data["shadowbay_listings"]:
                    writer.writerow(l)
            logger.info("Exported %d ShadowBay listings to %s", len(sim_data["shadowbay_listings"]), sb_csv_path)

            # NightMarket CSV
            with open(nm_csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
                writer.writeheader()
                for l in sim_data["nightmarket_listings"]:
                    writer.writerow(l)
            logger.info("Exported %d NightMarket listings to %s", len(sim_data["nightmarket_listings"]), nm_csv_path)

        # ------------------------------------------------------------------
        # Step 10: Validation & Summary Output
        # ------------------------------------------------------------------
        validation_report = self.validate_integrity()

        return {
            "statistics": sim_data["statistics"],
            "shadowbay_listings_count": len(sim_data["shadowbay_listings"]),
            "nightmarket_listings_count": len(sim_data["nightmarket_listings"]),
            "total_vendors_ingested": len(all_synthetic_vendors),
            "vendor_identity_mappings_count": len(vim_records),
            "relationships_created": len(unique_rels),
            "ground_truth_records_count": len(gt_records),
            "validation_report": validation_report,
        }

    def validate_integrity(self) -> Dict[str, Any]:
        """Perform database foreign key and data integrity verification."""
        report = {}
        with get_db_cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as cnt FROM vendors WHERE market_id = 101;")
            report["shadowbay_vendors_db"] = cursor.fetchone()["cnt"]

            cursor.execute("SELECT COUNT(*) as cnt FROM vendors WHERE market_id = 102;")
            report["nightmarket_vendors_db"] = cursor.fetchone()["cnt"]

            cursor.execute("SELECT COUNT(*) as cnt FROM ground_truth_vendor_migrations;")
            report["ground_truth_records_db"] = cursor.fetchone()["cnt"]

            # Orphan check: vendoridentitymap referencing non-existent vendors
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM vendoridentitymap vim 
                LEFT JOIN vendors v ON vim.vendor_id = v.vendor_id 
                WHERE v.vendor_id IS NULL;
            """)
            report["orphan_vim_records"] = cursor.fetchone()["cnt"]

            # Orphan check: vendor_profile referencing non-existent vendors
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM vendor_profile vp 
                LEFT JOIN vendors v ON vp.vendor_id = v.vendor_id 
                WHERE v.vendor_id IS NULL;
            """)
            report["orphan_profile_records"] = cursor.fetchone()["cnt"]

            # Orphan check: identityrelationships referencing non-existent identities
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM identityrelationships ir 
                LEFT JOIN identities i1 ON ir.identity1_id = i1.identity_id
                LEFT JOIN identities i2 ON ir.identity2_id = i2.identity_id
                WHERE i1.identity_id IS NULL OR i2.identity_id IS NULL;
            """)
            report["orphan_relationship_records"] = cursor.fetchone()["cnt"]

            report["integrity_status"] = "PERFECT" if (
                report["orphan_vim_records"] == 0 and
                report["orphan_profile_records"] == 0 and
                report["orphan_relationship_records"] == 0
            ) else "INTEGRITY_VIOLATIONS_DETECTED"

        return report
