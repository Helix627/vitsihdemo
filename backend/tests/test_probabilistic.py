"""Unit tests for Pipeline 2: Probabilistic Identity Resolution."""

import unittest
from pipelines.probabilistic_pipeline import ProbabilisticResolutionPipeline
from services.stylometric_service import StylometricEngine


class TestProbabilisticResolution(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        StylometricEngine.initialize_from_csv()

    def test_alias_similarity_levenshtein(self):
        # Identical
        self.assertEqual(ProbabilisticResolutionPipeline.calculate_alias_similarity("dark_trader", "dark_trader"), 1.0)
        # Minor typo
        sim = ProbabilisticResolutionPipeline.calculate_alias_similarity("dark_trader", "darktrader")
        self.assertGreater(sim, 0.85)
        # Completely different
        diff = ProbabilisticResolutionPipeline.calculate_alias_similarity("dark_trader", "sunshine_flower")
        self.assertLess(diff, 0.40)

    def test_probabilistic_candidate_scoring(self):
        query_text = "High quality CCcam satellite decoding service instant automated delivery"
        candidates = ProbabilisticResolutionPipeline.find_probabilistic_matches(
            text=query_text,
            alias_hint="passman",
            top_k=3,
            threshold=0.45,
        )
        self.assertIsInstance(candidates, list)
        if candidates:
            top = candidates[0]
            self.assertIn("vendor", top)
            self.assertIn("overall_confidence", top)
            self.assertIn("scores", top)
            self.assertIn("alias_similarity", top["scores"])
            self.assertIn("stylometry_similarity", top["scores"])
            self.assertIn("embedding_similarity", top["scores"])


if __name__ == "__main__":
    unittest.main()
