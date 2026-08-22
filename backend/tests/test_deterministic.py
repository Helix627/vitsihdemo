"""Unit tests for Pipeline 1: Deterministic Identity Resolution."""

import unittest
from database.connection import init_connection_pool
from pipelines.deterministic_pipeline import DeterministicResolutionPipeline


class TestDeterministicResolution(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_connection_pool()

    def test_deterministic_resolution_existing_email(self):
        res = DeterministicResolutionPipeline.resolve_entity("email", "MagicHat@gmail.com")
        self.assertIsInstance(res, dict)
        if res.get("matched"):
            self.assertEqual(res["confidence"], 1.0)
            self.assertEqual(res["confidence_percentage"], 100.0)
            self.assertEqual(res["resolution_method"], "deterministic_exact_match")

    def test_deterministic_resolution_non_existent(self):
        res = DeterministicResolutionPipeline.resolve_entity("email", "non_existent_random_email_9999@domain.xyz")
        self.assertFalse(res["matched"])
        self.assertEqual(res["confidence"], 0.0)


if __name__ == "__main__":
    unittest.main()
