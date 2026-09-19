"""Unit Tests for Autonomous Collector & Behavioral Profiling Engines."""

import unittest
from app import create_app
from services.autonomous_collector import AutonomousCollector
from services.behavioral_service import BehavioralEngine


class TestAutonomousAndBehavioral(unittest.TestCase):
    """Test background autonomous collection daemon and vendor behavioral profiling."""

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_autonomous_status_endpoint(self):
        """Verify /api/v1/autonomous/status returns valid daemon metrics."""
        res = self.client.get("/api/v1/autonomous/status")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("is_running", data)
        self.assertIn("total_feeds_scanned", data)
        self.assertIn("auto_merged_count", data)
        self.assertIn("review_queued_count", data)
        self.assertIn("recent_events", data)

    def test_autonomous_trigger_endpoint(self):
        """Verify /api/v1/autonomous/trigger performs an on-demand scan pulse."""
        res = self.client.post("/api/v1/autonomous/trigger")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "TRIGGERED")
        self.assertIn("event", data)
        self.assertIn("source", data["event"])

    def test_autonomous_toggle_endpoint(self):
        """Verify /api/v1/autonomous/toggle starts and stops the collector."""
        res = self.client.post("/api/v1/autonomous/toggle", json={"enable": False})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.get_json()["is_running"])

        res2 = self.client.post("/api/v1/autonomous/toggle", json={"enable": True})
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(res2.get_json()["is_running"])

    def test_vendor_behavioral_profile_generation(self):
        """Verify BehavioralEngine synthesizes timezone, categories, and proof chain."""
        dummy_vendor = {"vendor_id": 1, "user_name": "DarkTrader", "marketplace_name": "Agora", "added": 1400000000}
        dummy_idents = [
            {"identity_type": "bitcoin", "value": "1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz"},
            {"identity_type": "pgp", "value": "9F8E7D6C5B4A3210"},
        ]
        dummy_cross = [{"user_name": "DarkTrader_SB", "marketplace_name": "ShadowBay", "shared_types": ["bitcoin"]}]

        profile = BehavioralEngine.generate_vendor_behavioral_profile(dummy_vendor, dummy_idents, dummy_cross)
        self.assertIn("estimated_timezone", profile)
        self.assertIn("threat_tier", profile)
        self.assertIn("categories", profile)
        self.assertIn("proof_chain", profile)
        self.assertGreater(len(profile["proof_chain"]), 2)


if __name__ == "__main__":
    unittest.main()
