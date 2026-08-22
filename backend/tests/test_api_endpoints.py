"""Unit tests for Flask REST API Endpoints."""

import json
import unittest
from app import create_app
from graph.graph_engine import NetworkXGraphEngine
from services.stylometric_service import StylometricEngine


class TestAPIEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()
        NetworkXGraphEngine.build_graph(vendor_limit=20)
        StylometricEngine.initialize_from_csv()

    def test_health_endpoint(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)

    def test_graph_and_statistics(self):
        res_graph = self.client.get("/graph")
        self.assertEqual(res_graph.status_code, 200)
        data = res_graph.get_json()
        self.assertIn("nodes", data)
        self.assertIn("edges", data)

        res_stats = self.client.get("/statistics")
        self.assertEqual(res_stats.status_code, 200)
        stats = res_stats.get_json()
        self.assertIn("total_nodes", stats)

    def test_analyze_endpoint(self):
        payload = {"text": "Vendor passman at passman@protonmail.com with wallet 1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz"}
        res = self.client.post("/analyze", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("confidentiality", data)
        self.assertIn("extracted_entities", data)

    def test_resolve_endpoint(self):
        # Deterministic check
        payload_det = {"type": "email", "value": "MagicHat@gmail.com"}
        res = self.client.post("/resolve", data=json.dumps(payload_det), content_type="application/json")
        self.assertEqual(res.status_code, 200)

        # Probabilistic check
        payload_prob = {"type": "alias", "value": "passman", "text": "Satellite TV CCcam server 12 months"}
        res_prob = self.client.post("/resolve", data=json.dumps(payload_prob), content_type="application/json")
        self.assertEqual(res_prob.status_code, 200)
        data = res_prob.get_json()
        self.assertIn("status", data)

    def test_merge_endpoint(self):
        payload = {
            "primary_identity_id": 1,
            "merged_identity_id": 2,
            "action": "keep_separate",
        }
        res = self.client.post("/merge", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json()["success"])

    def test_search_endpoint(self):
        res = self.client.get("/search?q=mike")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("vendors", data)


if __name__ == "__main__":
    unittest.main()
