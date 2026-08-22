"""CLI Entrypoint for Synthetic Marketplace Data Generation & Ingestion."""

import argparse
import json
import os
import sys
import time

sys.path.append(os.path.dirname(__file__))

from core.logging import logger
from generators.config import GeneratorConfig
from generators.ingestion_pipeline import IngestionPipeline


def main():
    parser = argparse.ArgumentParser(description="Synthetic Marketplace Data Generator & Ingestion Engine")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducible generation")
    parser.add_argument("--no-csv", action="store_true", help="Skip exporting CSV listing files")
    args = parser.parse_args()

    print("=" * 70)
    print(" DARK WEB CTI: SYNTHETIC MARKETPLACE GENERATOR & INGESTION PIPELINE")
    print("=" * 70)
    print(f"[*] Configured Random Seed: {args.seed}")
    print(f"[*] Target Marketplaces: ShadowBay (market_id=101), NightMarket (market_id=102)")
    print(f"[*] Database: MySQL main_db (Preserving 3NF Normalized Schema)")
    print("-" * 70)

    config = GeneratorConfig(random_seed=args.seed)
    pipeline = IngestionPipeline(config)

    start_time = time.time()
    results = pipeline.run(export_csv=not args.no_csv)
    elapsed = time.time() - start_time

    stats = results["statistics"]
    val = results["validation_report"]

    print("\n" + "=" * 70)
    print(f" GENERATION & INGESTION SUMMARY (Completed in {elapsed:.2f}s)")
    print("=" * 70)
    print(f"\n[1] VENDOR MIGRATION STATISTICS:")
    print(f"  • Source Agora Vendors Analyzed:      {stats['agora_total']:,}")
    print(f"  • ShadowBay Total Vendors:            {val['shadowbay_vendors_db']:,}")
    print(f"      - Migrated from Agora:            {stats['shadowbay_migrated']:,} ({stats['shadowbay_migrated']/stats['agora_total']*100:.1f}%)")
    print(f"      - Completely New Vendors:         {stats['shadowbay_new']:,}")
    print(f"  • NightMarket Total Vendors:          {val['nightmarket_vendors_db']:,}")
    print(f"      - Migrated from Agora:            {stats['nightmarket_migrated']:,} ({stats['nightmarket_migrated']/stats['agora_total']*100:.1f}%)")
    print(f"      - Completely New Vendors:         {stats['nightmarket_new']:,}")
    print(f"  • Overlap (Appeared in Both Markets): {stats['both_migrated']:,} ({stats['both_migrated']/stats['agora_total']*100:.1f}%)")
    print(f"  • Inactive / Disappeared:             {stats['disappeared']:,} ({stats['disappeared']/stats['agora_total']*100:.1f}%)")

    print(f"\n[2] IDENTITY MUTATION STATISTICS:")
    print("  • Alias Mutation Breakdown:")
    for mut_type, count in stats["alias_mutations"].items():
        total_muts = sum(stats["alias_mutations"].values())
        print(f"      - {mut_type:<20}: {count:>5,} ({count/total_muts*100:>5.1f}%)")

    print("  • PGP Key Usage Breakdown:")
    total_pgp = sum(stats["pgp_status"].values())
    for status, count in stats["pgp_status"].items():
        print(f"      - {status:<20}: {count:>5,} ({count/total_pgp*100:>5.1f}%)")

    print("  • Bitcoin Wallet Usage Breakdown:")
    total_wal = sum(stats["wallet_status"].values())
    for status, count in stats["wallet_status"].items():
        print(f"      - {status:<20}: {count:>5,} ({count/total_wal*100:>5.1f}%)")

    print("  • Email Address Usage Breakdown:")
    total_em = sum(stats["email_status"].values())
    for status, count in stats["email_status"].items():
        print(f"      - {status:<20}: {count:>5,} ({count/total_em*100:>5.1f}%)")

    print(f"\n[3] LISTINGS & INVENTORY GENERATED:")
    print(f"  • ShadowBay Listings Synthesized:     {results['shadowbay_listings_count']:,} (Exported: data/shadowbay_listings.csv)")
    print(f"  • NightMarket Listings Synthesized:   {results['nightmarket_listings_count']:,} (Exported: data/nightmarket_listings.csv)")

    print(f"\n[4] DATABASE GRAPH INGESTION & INTEGRITY REPORT:")
    print(f"  • Total Vendors Ingested:             {results['total_vendors_ingested']:,}")
    print(f"  • Vendor Identity Mappings:           {results['vendor_identity_mappings_count']:,}")
    print(f"  • Intra-Cluster Graph Edges:          {results['relationships_created']:,}")
    print(f"  • Ground Truth Evaluation Mappings:   {results['ground_truth_records_count']:,} (Table: ground_truth_vendor_migrations)")
    print(f"  • Orphan Mappings Check:              {val['orphan_vim_records']} (Expected: 0)")
    print(f"  • Orphan Profiles Check:              {val['orphan_profile_records']} (Expected: 0)")
    print(f"  • Orphan Relationships Check:         {val['orphan_relationship_records']} (Expected: 0)")
    print(f"  • Schema Integrity Status:            [{val['integrity_status']}]")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
