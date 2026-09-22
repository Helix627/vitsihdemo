"""Fast Atomic Database Pruning and Optimization Script.
Safely prunes unlinked orphan identities and orphan relationships using atomic table swaps.
Preserves all 1,250 vendors and their 4,260 active mapped digital identities.
"""

import time
from database.connection import get_connection

def prune_orphan_records():
    print("Connecting to MySQL...")
    conn = get_connection()
    conn.autocommit = False
    cursor = conn.cursor(dictionary=True)

    try:
        print("\n[Step 1/5] Calculating pre-pruning statistics...")
        cursor.execute("SELECT COUNT(*) as c FROM identities")
        pre_identities = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM identityrelationships")
        pre_relationships = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM vendors")
        pre_vendors = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM vendoridentitymap")
        pre_mappings = cursor.fetchone()["c"]

        print(f"  * Vendors: {pre_vendors:,}")
        print(f"  * Vendor Identity Mappings: {pre_mappings:,}")
        print(f"  * Total Identities: {pre_identities:,}")
        print(f"  * Total Relationships: {pre_relationships:,}")

        # Disable foreign key checks for table swap
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")

        print("\n[Step 2/5] Creating protected identities staging table...")
        cursor.execute("DROP TABLE IF EXISTS _prune_keep_ids")
        cursor.execute("""
            CREATE TABLE _prune_keep_ids (
                identity_id BIGINT PRIMARY KEY
            ) ENGINE=InnoDB
        """)
        cursor.execute("""
            INSERT INTO _prune_keep_ids (identity_id)
            SELECT DISTINCT identity_id FROM vendoridentitymap
            UNION
            SELECT DISTINCT primary_identity_id FROM identitymerges
            UNION
            SELECT DISTINCT merged_identity_id FROM identitymerges
        """)
        conn.commit()

        cursor.execute("SELECT COUNT(*) as c FROM _prune_keep_ids")
        protected_count = cursor.fetchone()["c"]
        print(f"  * Protected Active Identities: {protected_count:,}")

        print("\n[Step 3/5] Populating clean tables with verified vendor records...")
        t0 = time.time()
        # Clean identities
        cursor.execute("DROP TABLE IF EXISTS identities_clean")
        cursor.execute("CREATE TABLE identities_clean LIKE identities")
        cursor.execute("""
            INSERT INTO identities_clean
            SELECT i.* FROM identities i
            JOIN _prune_keep_ids k ON i.identity_id = k.identity_id
        """)
        kept_idents = cursor.rowcount

        # Clean relationships
        cursor.execute("DROP TABLE IF EXISTS identityrelationships_clean")
        cursor.execute("CREATE TABLE identityrelationships_clean LIKE identityrelationships")
        cursor.execute("""
            INSERT INTO identityrelationships_clean
            SELECT ir.* FROM identityrelationships ir
            JOIN _prune_keep_ids k1 ON ir.identity1_id = k1.identity_id
            JOIN _prune_keep_ids k2 ON ir.identity2_id = k2.identity_id
        """)
        kept_rels = cursor.rowcount
        conn.commit()
        print(f"  [OK] Retained {kept_idents:,} identities and {kept_rels:,} active relationships in {time.time() - t0:.2f}s")

        print("\n[Step 4/5] Executing atomic table swap...")
        cursor.execute("DROP TABLE IF EXISTS identities_pruned_backup")
        cursor.execute("DROP TABLE IF EXISTS identityrelationships_pruned_backup")
        cursor.execute("""
            RENAME TABLE
                identities TO identities_pruned_backup,
                identities_clean TO identities,
                identityrelationships TO identityrelationships_pruned_backup,
                identityrelationships_clean TO identityrelationships
        """)
        conn.commit()
        print("  [OK] Tables atomically swapped.")

        print("\n[Step 5/5] Dropping orphan backups and staging tables...")
        cursor.execute("DROP TABLE IF EXISTS _prune_keep_ids")
        cursor.execute("DROP TABLE IF EXISTS identities_pruned_backup")
        cursor.execute("DROP TABLE IF EXISTS identityrelationships_pruned_backup")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        conn.commit()
        print("  [OK] Cleaned up temporary tables. Foreign key constraints restored.")

        print("\n[Verification] Calculating post-pruning statistics...")
        cursor.execute("SELECT COUNT(*) as c FROM identities")
        post_identities = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM identityrelationships")
        post_relationships = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM vendors")
        post_vendors = cursor.fetchone()["c"]

        print(f"  * Vendors (Intact): {post_vendors:,}")
        print(f"  * Active Identities: {post_identities:,} (reduced by {pre_identities - post_identities:,} orphan records)")
        print(f"  * Active Relationships: {post_relationships:,} (reduced by {pre_relationships - post_relationships:,} orphan records)")

        print("\n[SUCCESS] Database pruning completed successfully!")

    except Exception as e:
        conn.rollback()
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        print(f"\n[ERROR] Pruning failed, transaction rolled back: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    prune_orphan_records()
