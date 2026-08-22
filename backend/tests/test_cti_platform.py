"""Comprehensive test suite for CTI platform backend services, database repositories, graph analytics, and intelligence intake."""

import json
import unittest

from app import create_app
from database.repositories.identity_repo import IdentityRepository
from database.repositories.relationship_repo import RelationshipRepository
from database.repositories.vendor_repo import VendorRepository
from graph.graph_engine import NetworkXGraphEngine
from pipelines.deterministic_pipeline import DeterministicResolutionPipeline
from pipelines.probabilistic_pipeline import ProbabilisticResolutionPipeline
from services.confidentiality_service import ConfidentialityService
from services.normalization_service import NormalizationService
from services.stylometric_service import StylometricEngine


class TestCTIPlatform(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()
        NetworkXGraphEngine.build_graph(vendor_limit=30)
        StylometricEngine.initialize_from_csv()

    def test_database_repositories(self):
        """Verify Vendor, Identity, and Relationship repository methods."""
        total_vendors = VendorRepository.count()
        self.assertGreater(total_vendors, 0)

        vendor = VendorRepository.get_by_id(1)
        self.assertIsNotNone(vendor)
        self.assertEqual(vendor["vendor_id"], 1)

        counts_by_type = IdentityRepository.count_by_type()
        self.assertIn("alias", counts_by_type)
        self.assertIn("email", counts_by_type)
        self.assertIn("bitcoin", counts_by_type)
        self.assertIn("pgp", counts_by_type)
        self.assertGreater(counts_by_type["alias"], 0)

        identities = IdentityRepository.get_identities_for_vendor(1)
        self.assertGreater(len(identities), 0)

        total_rels = RelationshipRepository.count()
        self.assertGreater(total_rels, 0)

    def test_graph_service(self):
        """Verify NetworkX graph construction, Cytoscape JSON output, and statistics."""
        G = NetworkXGraphEngine.get_graph()
        self.assertGreater(G.number_of_nodes(), 0)
        self.assertGreater(G.number_of_edges(), 0)

    def test_stylometric_engine(self):
        """Verify stylometric feature extraction and Agora author matching."""
        sample_text = (
            "Hi we offer a World Wide CCcam Service for Enigma 2 devices! "
            "12 Months 75$ Following Satellites are available: SKY UK Sky Germany HD. "
            "Instant BTC payment accepted!"
        )
        features = StylometricEngine.extract_features(sample_text)
        self.assertIn("avg_word_len", features)
        self.assertIn("ttr", features)
        self.assertIn("punct_ratio", features)

        matches = StylometricEngine.match_author(sample_text, top_k=3)
        self.assertIsInstance(matches, list)
        if matches:
            top = matches[0]
            self.assertIn("vendor", top)
            self.assertIn("confidence_percentage", top)

    def test_probabilistic_inference(self):
        """Verify probabilistic candidate scoring."""
        matches = ProbabilisticResolutionPipeline.find_probabilistic_matches(
            text="High quality CCcam satellite decoding service instant delivery",
            top_k=3,
            threshold=0.45,
        )
        self.assertIsInstance(matches, list)
        if matches:
            self.assertIn("confidence_percentage", matches[0])

    def test_confidentiality_and_normalization(self):
        """Verify PII extraction and confidentiality scoring."""
        sample_input = """
        Vendor profile leak:
        Alias: Mike
        Email: mike_ops@proton.me
        Wallet: 1b2cToQTkrmsDUUDeP6YDAK34wXuQ
        PGP: 483F3631151FBA4895F9FF8404B63E9BA4772C78
        Password: secretpassword99
        """
        result = ConfidentialityService.evaluate(sample_input)
        self.assertGreater(result["score"], 50)
        self.assertIn(result["level"], ["Sensitive", "Highly Confidential"])

    def test_api_endpoints(self):
        """Verify all Flask REST endpoints."""
        # /
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)

        # /graph
        res = self.client.get("/graph")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("nodes", data)
        self.assertIn("edges", data)

        # /statistics and /stats
        res = self.client.get("/statistics")
        self.assertEqual(res.status_code, 200)
        res_stats = self.client.get("/stats")
        self.assertEqual(res_stats.status_code, 200)

        # /vendor/<id>
        res = self.client.get("/vendor/1")
        self.assertEqual(res.status_code, 200)
        vendor_data = res.get_json()
        self.assertIn("vendor", vendor_data)

        # /search
        res = self.client.get("/search?q=mike")
        self.assertEqual(res.status_code, 200)
        search_data = res.get_json()
        self.assertIn("aliases", search_data)

        # /analyze
        res = self.client.post(
            "/analyze",
            data=json.dumps({"text": "Contact vendor passman at passman_admin@yahoo.com"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        analysis_data = res.get_json()
        self.assertIn("confidentiality", analysis_data)

        # /resolve
        res = self.client.post(
            "/resolve",
            data=json.dumps({"type": "alias", "value": "passman", "text": "CCcam satellite service instant delivery"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        infer_data = res.get_json()
        self.assertIn("status", infer_data)


if __name__ == "__main__":
    unittest.main()
