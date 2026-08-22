"""End-to-End Test Suite for all Intelligence Studio Features."""

import json
import time
import unittest
from app import create_app
from database.connection import init_connection_pool, get_db_cursor
from services.stylometric_service import StylometricEngine


class TestIntelligenceStudio(unittest.TestCase):
    """Verifies all modes and workflows within the unified Intelligence Studio."""

    @classmethod
    def setUpClass(cls):
        init_connection_pool()
        StylometricEngine.initialize_from_csv()
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_feature_1_raw_text_analysis_and_pii_evaluation(self):
        """Feature 1: Raw Text Analysis, PII/OPSEC Evaluation & Stylometric Attribution."""
        payload = {
            "text": """
            *** VENDOR PROFILE & TERMS ***
            Vendor handle: ShadowTrader_2026
            Primary Contact: shadow_ops@protonmail.com
            Deposit BTC: 1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz
            Monero: 44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGeiSTHzFcubDZmCo96hUoWDL14PBBCHnoFXcDpTX
            PGP Fingerprint: 483F3631151FBA4895F9FF8404B63E9BA4772C78
            Telegram: @shadow_trader_hq
            Discord: shadowtrader#1337
            Hidden Service: http://shadowtrader7u4k.onion
            Password: ultra_secret_master_key_123!
            All orders shipped 100% stealth vacuum sealed within 24h. Stay safe!
            """
        }

        res = self.client.post("/analyze", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()

        # 1. Verify PII extraction
        entities = data.get("extracted_entities", {})
        self.assertIn("emails", entities)
        self.assertIn("bitcoin_wallets", entities)
        self.assertIn("pgp_fingerprints", entities)
        self.assertIn("credentials", entities)
        self.assertEqual(len(entities["emails"]), 1)
        self.assertEqual(entities["emails"][0], "shadow_ops@protonmail.com")
        self.assertEqual(entities["bitcoin_wallets"][0], "1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz")

        # 2. Verify Confidentiality & OPSEC Score
        conf = data.get("confidentiality", {})
        self.assertGreaterEqual(conf.get("score", 0), 60)
        self.assertIn(conf.get("level"), ["Sensitive", "Highly Confidential"])
        self.assertGreater(len(conf.get("actions", [])), 0)

        # 3. Verify Stylometric Feature Extraction
        stylo = data.get("stylometric_features", {})
        self.assertIn("vocabulary_richness", stylo)
        self.assertIn("avg_sentence_len", stylo)
        self.assertIn("upper_ratio", stylo)

    def test_feature_2_one_click_ingest_from_raw_analysis(self):
        """Feature 2: 1-Click Knowledge Graph Ingestion from Analyzed Intelligence."""
        uid = int(time.time() * 1000)
        payload = {
            "username": f"analyzed_actor_{uid}",
            "email": f"analyst_intake_{uid}@cock.li",
            "bitcoin": "1b2cToQTkrmsDUUDeP6YDAK34wXuQ", # Matches existing Agora wallet to test deterministic auto-merge
            "telegram": f"@analyzed_ops_{uid}",
            "description": "High quality vacuum sealed cardsharing servers.",
            "source_dataset": "1-Click Intake from Raw Text",
            "analyst_name": "Lead_Investigator",
        }

        res = self.client.post("/analyst/submit", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()

        # Deterministic match against wallet -> auto-merges & strengthens
        self.assertEqual(data.get("status"), "DETERMINISTIC_MERGE_SUCCESS")
        self.assertEqual(data.get("confidence_percentage"), 100.0)
        self.assertEqual(data.get("action"), "AUTO_MERGED")
        self.assertIn("evolution_report", data)
        report = data["evolution_report"]
        self.assertGreater(report["new_nodes_created"] + report["relationships_strengthened"], 0)

    def test_feature_3_structured_single_dossier_intake(self):
        """Feature 3: Single Actor Dossier Form Intake with Step 1 Preview and Step 2 Commit."""
        uid = int(time.time() * 1000)
        payload = {
            "username": f"dossier_actor_{uid}",
            "email": f"dossier_{uid}@tutanota.com",
            "bitcoin": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
            "monero": "888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkFxbTNsA2sPGLDctzU66W4sm2ghjWjBg63LJGkUhy6ugPrBBQD1ACYWVm5",
            "pgp": "994E8F231A4C5B6D7E8F901234567890ABCDEF12",
            "telegram": f"@dossier_tg_{uid}",
            "discord": f"dossier_dc_{uid}#9999",
            "forum_handle": f"dossier_forum_{uid}",
            "description": "Exploit developer and reverse engineering service.",
            "source_dataset": "Special Operations Dossier #402",
            "analyst_name": "Senior_Specialist",
        }

        # Step 1: Test Preview
        prev_res = self.client.post("/analyst/preview", json=payload)
        self.assertEqual(prev_res.status_code, 200)
        prev_data = prev_res.get_json()
        self.assertIn("linking_forecast", prev_data)
        self.assertIn("normalized_entities", prev_data)
        self.assertIn("confidentiality", prev_data)

        # Step 2: Test Commit
        res = self.client.post("/analyst/submit", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()

        self.assertIn(data.get("status"), ["NEW_ENTITY_CREATED", "SUGGESTION_CREATED", "DETERMINISTIC_MERGE_SUCCESS"])
        vid = data.get("vendor_id")
        self.assertIsNotNone(vid)

        # Verify evidence provenance was recorded
        prov_res = self.client.get(f"/vendor/{vid}/provenance")
        self.assertEqual(prov_res.status_code, 200)
        prov_data = prov_res.get_json()
        self.assertGreater(prov_data.get("timeline_count", 0), 0)

    def test_feature_4_bulk_dataset_json_ingestion(self):
        """Feature 4: Bulk Dataset Ingestion with Step 1 Batch Preview and Step 2 Batch Commit."""
        uid = int(time.time() * 1000)
        records = [
            {
                "username": f"bulk_courier_A_{uid}",
                "email": f"courierA_{uid}@protonmail.com",
                "telegram": f"@bulk_courier_A_{uid}",
                "description": "Stealth domestic drop logistics operator.",
            },
            {
                "username": f"bulk_vendor_B_{uid}",
                "email": f"vendorB_{uid}@cock.li",
                "bitcoin": "1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz",
                "description": "Verified merchant automated instant dispatch.",
            },
            {
                "username": f"bulk_swapper_C_{uid}",
                "monero": "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGeiSTHzFcubDZmCo96hUoWDL14PBBCHnoFXcDpTX",
                "discord": f"swapper_{uid}#7777",
                "description": "Instant BTC to XMR cross-chain bridge.",
            },
        ]

        payload = {
            "source_name": f"Bulk Dump {uid}",
            "analyst_name": "Lead_Investigator",
            "records": records,
        }

        # Step 1: Test Batch Preview
        prev_res = self.client.post("/datasets/preview", json=payload)
        self.assertEqual(prev_res.status_code, 200)
        prev_data = prev_res.get_json()
        self.assertEqual(prev_data.get("total_records"), 3)
        self.assertIn("predicted_auto_merges", prev_data)
        self.assertIn("records_preview", prev_data)
        self.assertEqual(len(prev_data["records_preview"]), 3)

        # Step 2: Test Batch Commit
        res = self.client.post("/datasets/import", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()

        self.assertEqual(data.get("status"), "DATASET_IMPORT_SUCCESS")
        self.assertEqual(data.get("records_processed"), 3)
        self.assertIn("new_nodes_created", data)
        self.assertIn("graph_statistics", data)
        self.assertGreater(data["graph_statistics"]["total_nodes"], 0)

    def test_feature_5_analyst_review_workflow_and_ml_logging(self):
        """Feature 5: Pending Suggestions Listing, 1-Click Adjudication & Supervised ML Logging."""
        # 1. Create a suggestion via fuzzy submission
        uid = int(time.time() * 1000)
        fuzzy_payload = {
            "username": f"m1ke_fuzzy_{uid}",
            "description": "100% stealth vacuum sealed shipping with tracking provided within 24h.",
            "source_dataset": "Fuzzy Test Dump",
        }
        res_sub = self.client.post("/analyst/submit", json=fuzzy_payload)
        self.assertEqual(res_sub.status_code, 200)

        # 2. Query pending suggestions
        sugg_res = self.client.get("/identity/suggestions")
        self.assertEqual(sugg_res.status_code, 200)
        suggs = sugg_res.get_json().get("suggestions", [])

        if suggs:
            sugg = suggs[0]
            sugg_id = sugg["suggestion_id"]

            # 3. Test Approval
            approve_res = self.client.post(
                "/identity/approve",
                json={
                    "suggestion_id": sugg_id,
                    "analyst_name": "Senior_Analyst",
                    "notes": "Verified match via PGP key signature.",
                },
            )
            self.assertEqual(approve_res.status_code, 200)
            app_data = approve_res.get_json()
            self.assertTrue(app_data.get("success"))
            self.assertEqual(app_data.get("status"), "APPROVED")

            # 4. Verify decision and features recorded in analyst_decisions_log for ML
            with get_db_cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM analyst_decisions_log WHERE suggestion_id = %s;",
                    (sugg_id,),
                )
                ml_row = cursor.fetchone()
                self.assertIsNotNone(ml_row)
                self.assertEqual(ml_row["decision"], "APPROVED")
                self.assertEqual(ml_row["analyst_id"], "Senior_Analyst")


if __name__ == "__main__":
    unittest.main()
