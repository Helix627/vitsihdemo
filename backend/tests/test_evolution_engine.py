"""Unit tests for EvolutionEngine and Continuous Intelligence Pipeline."""

import unittest
from database.connection import init_connection_pool, get_db_cursor
from services.evolution_engine import EvolutionEngine


class TestEvolutionEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_connection_pool()

    def test_stage2_deterministic_enrichment(self):
        # Ingest submission sharing exact existing Bitcoin wallet with Vendor #1
        payload = {
            "username": "Mike_Telegram_Drop",
            "bitcoin": "1b2cToQTkrmsDUUDeP6YDAK34wXuQ",
            "telegram": "@mike_darkops",
            "discord": "darkmike#9999",
            "monero": "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGeiSTHzFcubDZmCo96hUoWDL14PBBCHnoFXcDpTX",
            "source_dataset": "Telegram Leak #104",
        }
        res = EvolutionEngine.ingest_submission(payload, source_dataset="Telegram Leak #104", analyst_name="analyst_test")
        self.assertEqual(res["status"], "DETERMINISTIC_MERGE_SUCCESS")
        self.assertEqual(res["confidence_percentage"], 100.0)
        self.assertEqual(res["action"], "AUTO_MERGED")

        # Verify provenance recorded
        prov = EvolutionEngine.get_provenance_for_target("vendor", res["vendor_id"])
        self.assertGreater(len(prov), 0)

    def test_stage4_suggestion_approval_workflow(self):
        # 1. Ingest submission with fuzzy similarity generating a pending suggestion
        payload = {
            "username": "drkman_fuzzy_test",
            "description": "100% stealth vacuum sealed shipping with tracking provided.",
            "source_dataset": "Forum Dump Alpha",
        }
        res = EvolutionEngine.ingest_submission(payload, source_dataset="Forum Dump Alpha", analyst_name="analyst_test")

        if res["status"] == "SUGGESTION_CREATED":
            sugg_id = res["suggestion_id"]
            self.assertIsNotNone(sugg_id)

            # 2. Approve suggestion
            app_res = EvolutionEngine.approve_suggestion(sugg_id, analyst_name="analyst_senior", notes="Confirmed via forum signature")
            self.assertTrue(app_res.get("success"))
            self.assertEqual(app_res.get("status"), "APPROVED")

            # Verify logged in analyst_decisions_log for ML
            with get_db_cursor() as cursor:
                cursor.execute("SELECT * FROM analyst_decisions_log WHERE suggestion_id = %s;", (sugg_id,))
                row = cursor.fetchone()
                self.assertIsNotNone(row)
                self.assertEqual(row["decision"], "APPROVED")

    def test_new_standalone_persona_intake(self):
        import time
        uid = int(time.time() * 1000)
        payload = {
            "username": f"fresh_threat_actor_{uid}",
            "email": f"actor_{uid}@tutanota.com",
            "telegram": f"@threat_actor_{uid}",
            "description": "Specialized ransomware builder and bulletproof hosting operator.",
            "source_dataset": "Darknet Forum Intel",
        }
        res = EvolutionEngine.ingest_submission(payload, source_dataset="Darknet Forum Intel", analyst_name="analyst_test")
        self.assertIn(res["status"], ["NEW_ENTITY_CREATED", "SUGGESTION_CREATED", "DETERMINISTIC_MERGE_SUCCESS"])
        self.assertIsNotNone(res["vendor_id"])


if __name__ == "__main__":
    unittest.main()
