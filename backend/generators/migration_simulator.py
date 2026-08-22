"""Vendor Migration and Marketplace Evolution Simulator."""

from __future__ import annotations

import csv
import os
import random
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from core.logging import logger
from database.connection import get_db_cursor
from .config import GeneratorConfig
from .mutation_engine import MutationEngine


class MigrationSimulator:
    """Simulates realistic dark web vendor migration from Agora to ShadowBay and NightMarket."""

    def __init__(self, config: Optional[GeneratorConfig] = None):
        self.config = config or GeneratorConfig()
        self.mutator = MutationEngine(self.config)
        random.seed(self.config.random_seed)

    def load_agora_database_vendors(self) -> List[Dict[str, Any]]:
        """Fetch all canonical Agora vendors from MySQL main_db."""
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT v.vendor_id, v.user_name, v.added, v.updated, v.scraped, 
                       vp.alias, vp.username, vp.email, vp.bitcoin_wallet
                FROM vendors v
                LEFT JOIN vendor_profile vp ON v.vendor_id = vp.vendor_id
                WHERE v.market_id = 1
                ORDER BY v.vendor_id ASC
            """)
            agora_vendors = cursor.fetchall()

            # Query all PGP keys
            cursor.execute("SELECT alias, fingerprint, fingerprint_f, public_key, star_rate, review_count FROM vendor_pgp_keys;")
            pgp_rows = cursor.fetchall()
            pgp_map = {r["alias"]: r for r in pgp_rows}

            for v in agora_vendors:
                alias = v.get("alias") or v.get("user_name")
                v["pgp"] = pgp_map.get(alias)

        logger.info("Loaded %d Agora vendors from main_db.", len(agora_vendors))
        return agora_vendors

    def load_agora_csv_listings(self, csv_path: str = "data/agora.csv") -> Dict[str, List[Dict[str, Any]]]:
        """Group Agora CSV listings by vendor name."""
        if not os.path.exists(csv_path):
            alt_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "agora.csv")
            if os.path.exists(alt_path):
                csv_path = alt_path

        vendor_listings: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        if not os.path.exists(csv_path):
            logger.warning("Agora CSV not found at %s. Proceeding with synthetic default listings.", csv_path)
            return vendor_listings

        with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                clean_row = {k.strip(): v.strip() for k, v in row.items()}
                v_name = clean_row.get("Vendor", "")
                if v_name:
                    vendor_listings[v_name].append(clean_row)

        logger.info("Loaded %d Agora listings across %d vendors from CSV.", sum(len(l) for l in vendor_listings.values()), len(vendor_listings))
        return vendor_listings

    def simulate_migration(
        self,
    ) -> Dict[str, Any]:
        """
        Execute migration simulation across Agora vendors.
        Returns:
            {
                "shadowbay_vendors": [...],
                "nightmarket_vendors": [...],
                "shadowbay_listings": [...],
                "nightmarket_listings": [...],
                "ground_truth_records": [...],
                "statistics": {...}
            }
        """
        agora_vendors = self.load_agora_database_vendors()
        agora_listings_map = self.load_agora_csv_listings()

        # Shuffle deterministically
        shuffled = list(agora_vendors)
        random.shuffle(shuffled)
        total_agora = len(shuffled)

        # Calculate exact cohort sizes based on configured probabilities
        # 60% of Agora vendors migrate to ShadowBay (1,975 vendors)
        # 35% migrate to NightMarket (1,152 vendors)
        # 20% appear in both (658 vendors)
        # 15% disappear completely (494 vendors)
        count_both = int(total_agora * self.config.PROB_BOTH_MARKETS)
        count_sb_only = int(total_agora * (self.config.PROB_SHADOWBAY_TOTAL - self.config.PROB_BOTH_MARKETS))
        count_nm_only = int(total_agora * (self.config.PROB_NIGHTMARKET_TOTAL - self.config.PROB_BOTH_MARKETS))
        count_disappear = int(total_agora * self.config.PROB_DISAPPEAR)

        # Total partition covering the full population
        cohort_sb_only = shuffled[:count_sb_only]
        cohort_both = shuffled[count_sb_only : count_sb_only + count_both]
        cohort_nm_only = shuffled[count_sb_only + count_both : count_sb_only + count_both + count_nm_only]
        cohort_disappear = shuffled[count_sb_only + count_both + count_nm_only :]

        logger.info(
            "Migration Cohorts: SB Only=%d (%.1f%%), Both=%d (%.1f%%), NM Only=%d (%.1f%%), Disappear=%d (%.1f%%)",
            len(cohort_sb_only), len(cohort_sb_only)/total_agora*100,
            len(cohort_both), len(cohort_both)/total_agora*100,
            len(cohort_nm_only), len(cohort_nm_only)/total_agora*100,
            len(cohort_disappear), len(cohort_disappear)/total_agora*100,
        )

        shadowbay_vendors: List[Dict[str, Any]] = []
        nightmarket_vendors: List[Dict[str, Any]] = []
        shadowbay_listings: List[Dict[str, Any]] = []
        nightmarket_listings: List[Dict[str, Any]] = []
        ground_truth_records: List[Dict[str, Any]] = []

        # Statistics trackers
        stats = {
            "agora_total": total_agora,
            "shadowbay_migrated": 0,
            "shadowbay_new": 0,
            "nightmarket_migrated": 0,
            "nightmarket_new": 0,
            "both_migrated": len(cohort_both),
            "disappeared": len(cohort_disappear),
            "alias_mutations": defaultdict(int),
            "pgp_status": defaultdict(int),
            "wallet_status": defaultdict(int),
            "email_status": defaultdict(int),
        }

        # ------------------------------------------------------------------
        # Helper: Generate Migrated Vendor Instance
        # ------------------------------------------------------------------
        def build_migrated_vendor(
            origin_v: Dict[str, Any],
            target_market_name: str,
        ) -> Tuple[Dict[str, Any], List[Dict[str, Any]], Dict[str, Any]]:
            m_config = self.config.MARKETPLACES[target_market_name]
            market_id = m_config["market_id"]
            origin_alias = origin_v.get("alias") or origin_v.get("user_name") or "vendor"

            # 1. Alias Mutation
            mutated_alias, mutation_type = self.mutator.mutate_alias(origin_alias)
            stats["alias_mutations"][mutation_type] += 1

            # 2. PGP Key Simulation (50% reuse, 25% rotate, 25% none)
            pgp_choice = random.choices(["reuse", "rotate", "none"], weights=[0.50, 0.25, 0.25], k=1)[0]
            stats["pgp_status"][pgp_choice] += 1
            pgp_data = None
            if pgp_choice == "reuse" and origin_v.get("pgp"):
                pgp_data = origin_v["pgp"]
            elif pgp_choice == "rotate" or (pgp_choice == "reuse" and not origin_v.get("pgp")):
                fp, fp_f, pkey_bytes = self.mutator.generate_pgp_key(mutated_alias)
                pgp_data = {
                    "fingerprint": fp,
                    "fingerprint_f": fp_f,
                    "public_key": pkey_bytes,
                    "star_rate": round(random.uniform(4.5, 5.0), 2),
                    "review_count": random.randint(10, 300),
                }

            # 3. Bitcoin Wallet Simulation (40% reuse, 30% new, 30% none)
            wallet_choice = random.choices(["reuse", "new", "none"], weights=[0.40, 0.30, 0.30], k=1)[0]
            stats["wallet_status"][wallet_choice] += 1
            wallet_str = None
            if wallet_choice == "reuse" and origin_v.get("bitcoin_wallet"):
                wallet_str = origin_v["bitcoin_wallet"]
            elif wallet_choice == "new" or (wallet_choice == "reuse" and not origin_v.get("bitcoin_wallet")):
                wallet_str = self.mutator.generate_bitcoin_wallet()

            # 4. Email Simulation (30% reuse, 30% new, 40% none)
            email_choice = random.choices(["reuse", "new", "none"], weights=[0.30, 0.30, 0.40], k=1)[0]
            stats["email_status"][email_choice] += 1
            email_str = None
            if email_choice == "reuse" and origin_v.get("email"):
                email_str = origin_v["email"]
            elif email_choice == "new" or (email_choice == "reuse" and not origin_v.get("email")):
                email_str = self.mutator.generate_privacy_email(mutated_alias)

            # 5. Timestamps
            span = m_config["active_span"]
            added_ts = random.randint(span[0], span[0] + (span[1] - span[0]) // 2)
            updated_ts = random.randint(added_ts, span[1])
            scraped_ts = updated_ts + random.randint(10, 300)

            # Vendor Profile Text
            profile_text = f"Official {target_market_name} presence of {mutated_alias}. Verified vendor with guaranteed stealth."

            vendor_dict = {
                "user_name": mutated_alias,
                "alias": mutated_alias,
                "market_id": market_id,
                "marketplace_name": target_market_name,
                "email": email_str,
                "bitcoin_wallet": wallet_str,
                "pgp": pgp_data,
                "profile": profile_text,
                "vendor_link": f"http://{m_config['domain']}/vendor/{mutated_alias}",
                "added": added_ts,
                "updated": updated_ts,
                "scraped": scraped_ts,
                "is_migrated": True,
                "origin_agora_id": origin_v["vendor_id"],
                "origin_agora_user": origin_v["user_name"],
            }

            # 6. Listings Paraphrasing
            base_listings = agora_listings_map.get(origin_alias, [])
            synth_listings: List[Dict[str, Any]] = []
            if base_listings:
                sample_count = min(len(base_listings), random.randint(3, 25))
                sampled = random.sample(base_listings, sample_count)
                for item_row in sampled:
                    try:
                        p_val = float(item_row.get("Price", "0.05").replace("BTC", "").strip())
                    except ValueError:
                        p_val = 0.05
                    try:
                        r_val = float(item_row.get("Rating", "4.9").split("/")[0].strip())
                    except ValueError:
                        r_val = 4.90

                    synth_l = self.mutator.synthesize_listing(
                        base_item=item_row.get("Item", "Product"),
                        base_desc=item_row.get("Item Description", "High quality product"),
                        category=item_row.get("Category", "Drugs/Cannabis/Weed"),
                        base_price_btc=p_val,
                        base_rating=r_val,
                        origin=item_row.get("Origin", "USA"),
                        destination=item_row.get("Destination", "Worldwide"),
                        target_market=target_market_name,
                        vendor_alias=mutated_alias,
                    )
                    synth_listings.append(synth_l)
            else:
                # Default synthetic listing
                synth_l = self.mutator.synthesize_listing(
                    base_item=f"{mutated_alias} Specialty Product",
                    base_desc=f"Direct delivery from {mutated_alias}.",
                    category="Drugs/Cannabis/Weed",
                    base_price_btc=round(random.uniform(0.01, 0.50), 4),
                    base_rating=round(random.uniform(4.7, 5.0), 2),
                    origin="USA",
                    destination="Worldwide",
                    target_market=target_market_name,
                    vendor_alias=mutated_alias,
                )
                synth_listings.append(synth_l)

            # Ground truth record
            gt_record = {
                "agora_vendor_id": origin_v["vendor_id"],
                "agora_username": origin_v["user_name"],
                "target_marketplace": target_market_name,
                "synthetic_username": mutated_alias,
                "synthetic_alias": mutated_alias,
                "alias_mutation_type": mutation_type,
                "pgp_status": pgp_choice,
                "wallet_status": wallet_choice,
                "email_status": email_choice,
                "listing_count": len(synth_listings),
            }

            return vendor_dict, synth_listings, gt_record

        # Process ShadowBay-Only Cohort
        for v in cohort_sb_only:
            v_dict, l_list, gt = build_migrated_vendor(v, "ShadowBay")
            shadowbay_vendors.append(v_dict)
            shadowbay_listings.extend(l_list)
            ground_truth_records.append(gt)
            stats["shadowbay_migrated"] += 1

        # Process NightMarket-Only Cohort
        for v in cohort_nm_only:
            v_dict, l_list, gt = build_migrated_vendor(v, "NightMarket")
            nightmarket_vendors.append(v_dict)
            nightmarket_listings.extend(l_list)
            ground_truth_records.append(gt)
            stats["nightmarket_migrated"] += 1

        # Process Both-Markets Cohort
        for v in cohort_both:
            # ShadowBay instance
            sb_dict, sb_l, sb_gt = build_migrated_vendor(v, "ShadowBay")
            shadowbay_vendors.append(sb_dict)
            shadowbay_listings.extend(sb_l)
            ground_truth_records.append(sb_gt)
            stats["shadowbay_migrated"] += 1

            # NightMarket instance
            nm_dict, nm_l, nm_gt = build_migrated_vendor(v, "NightMarket")
            nightmarket_vendors.append(nm_dict)
            nightmarket_listings.extend(nm_l)
            ground_truth_records.append(nm_gt)
            stats["nightmarket_migrated"] += 1

        # ------------------------------------------------------------------
        # Generate 25 Completely New Vendors for ShadowBay and NightMarket
        # ------------------------------------------------------------------
        for mkt_name, v_list, l_list, stats_key in [
            ("ShadowBay", shadowbay_vendors, shadowbay_listings, "shadowbay_new"),
            ("NightMarket", nightmarket_vendors, nightmarket_listings, "nightmarket_new"),
        ]:
            m_config = self.config.MARKETPLACES[mkt_name]
            market_id = m_config["market_id"]
            span = m_config["active_span"]

            for i in range(self.config.NEW_VENDORS_PER_MARKET):
                new_alias = self.mutator.faker.unique.user_name()
                has_pgp = random.random() < 0.80
                has_wallet = random.random() < 0.70
                has_email = random.random() < 0.65

                pgp_data = None
                if has_pgp:
                    fp, fp_f, pkey_bytes = self.mutator.generate_pgp_key(new_alias)
                    pgp_data = {
                        "fingerprint": fp,
                        "fingerprint_f": fp_f,
                        "public_key": pkey_bytes,
                        "star_rate": round(random.uniform(4.6, 5.0), 2),
                        "review_count": random.randint(5, 120),
                    }

                wallet_str = self.mutator.generate_bitcoin_wallet() if has_wallet else None
                email_str = self.mutator.generate_privacy_email(new_alias) if has_email else None

                added_ts = random.randint(span[0], span[0] + (span[1] - span[0]) // 2)
                updated_ts = random.randint(added_ts, span[1])

                new_vendor = {
                    "user_name": new_alias,
                    "alias": new_alias,
                    "market_id": market_id,
                    "marketplace_name": mkt_name,
                    "email": email_str,
                    "bitcoin_wallet": wallet_str,
                    "pgp": pgp_data,
                    "profile": f"New verified merchant {new_alias} on {mkt_name}. 100% escrow protected.",
                    "vendor_link": f"http://{m_config['domain']}/vendor/{new_alias}",
                    "added": added_ts,
                    "updated": updated_ts,
                    "scraped": updated_ts + 60,
                    "is_migrated": False,
                    "origin_agora_id": None,
                    "origin_agora_user": None,
                }
                v_list.append(new_vendor)
                stats[stats_key] += 1

                # Generate 2-8 synthetic listings for new vendor
                cat_choices = ["Drugs/Cannabis/Weed", "Drugs/Stimulants/Cocaine", "Drugs/Ecstasy/MDMA", "Services/Hacking", "Digital/Security"]
                num_items = random.randint(2, 8)
                for _ in range(num_items):
                    cat = random.choice(cat_choices)
                    item_name = f"{new_alias} {cat.split('/')[-1]} Supply"
                    synth_l = self.mutator.synthesize_listing(
                        base_item=item_name,
                        base_desc=f"High quality direct supply from {new_alias}.",
                        category=cat,
                        base_price_btc=round(random.uniform(0.02, 0.45), 4),
                        base_rating=round(random.uniform(4.8, 5.0), 2),
                        origin="USA",
                        destination="Worldwide",
                        target_market=mkt_name,
                        vendor_alias=new_alias,
                    )
                    l_list.append(synth_l)

                # Ground truth record for new vendor
                ground_truth_records.append({
                    "agora_vendor_id": None,
                    "agora_username": None,
                    "target_marketplace": mkt_name,
                    "synthetic_username": new_alias,
                    "synthetic_alias": new_alias,
                    "alias_mutation_type": "new_vendor",
                    "pgp_status": "rotated" if has_pgp else "none",
                    "wallet_status": "new" if has_wallet else "none",
                    "email_status": "new" if has_email else "none",
                    "listing_count": num_items,
                })

        return {
            "shadowbay_vendors": shadowbay_vendors,
            "nightmarket_vendors": nightmarket_vendors,
            "shadowbay_listings": shadowbay_listings,
            "nightmarket_listings": nightmarket_listings,
            "ground_truth_records": ground_truth_records,
            "statistics": stats,
        }
