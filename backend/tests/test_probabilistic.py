"""Unit tests for 5-Stage Identity Resolution Pipeline."""

import unittest
from pipelines.probabilistic_pipeline import ProbabilisticResolutionPipeline
from services.behavioral_service import BehavioralEngine
from services.stylometric_service import StylometricEngine


class TestProbabilisticResolution(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        pass

    def test_stage2_username_similarity_and_leetspeak(self):
        # 1. Leetspeak translation (m1ke -> mike)
        res_leet = ProbabilisticResolutionPipeline.calculate_username_similarity("m1ke", "mike")
        self.assertEqual(res_leet["score"], 1.0)
        self.assertEqual(res_leet["normalized_u1"], "mike")

        # 2. Underscore / symbol stripping (cyber_king vs cyberking)
        res_sym = ProbabilisticResolutionPipeline.calculate_username_similarity("cyber_king", "cyberking")
        self.assertEqual(res_sym["score"], 1.0)

        # 3. Fuzzy typo (darkman145 vs drkman145)
        res_fuzzy = ProbabilisticResolutionPipeline.calculate_username_similarity("darkman145", "drkman145")
        self.assertGreaterEqual(res_fuzzy["score"], 0.80)

        # 4. Unrelated handles
        res_diff = ProbabilisticResolutionPipeline.calculate_username_similarity("dark_trader", "sunshine_flower")
        self.assertLess(res_diff["score"], 0.50)

    def test_stage3_behavioral_similarity(self):
        p1 = {
            "categories": ["Drugs/Cannabis/Weed"],
            "shipping_origin": "USA",
            "shipping_destination": "Worldwide",
            "avg_price": 50.0,
            "rating": 4.9,
            "cryptos": ["BTC"],
        }
        p2 = {
            "categories": ["Drugs/Cannabis/Weed"],
            "shipping_origin": "USA",
            "shipping_destination": "Worldwide",
            "avg_price": 52.0,
            "rating": 4.9,
            "cryptos": ["BTC"],
        }
        b_res = BehavioralEngine.compute_behavioral_score(p1, p2)
        self.assertGreaterEqual(b_res["score"], 0.90)
        self.assertEqual(b_res["category_similarity"], 1.0)

    def test_stage4_stylometric_similarity(self):
        t1 = "Hello customers! 100% stealth vacuum sealed shipping with tracking. BTC accepted. Stay safe!"
        t2 = "Hello friends! Vacuum sealed packaging with stealth escrow. Fast tracking. BTC only. Stay safe!"
        s_res = StylometricEngine.compute_composite_stylometry_score(t1, t2)
        self.assertGreaterEqual(s_res["score"], 0.50)
        self.assertIn("feature_similarity", s_res)
        self.assertIn("tfidf_similarity", s_res)
        self.assertIn("embedding_similarity", s_res)

    def test_stage5_decision_rules_matrix(self):
        # Case A: Auto Linked (>= 95%)
        v1 = {"user_name": "darkman", "categories": ["Drugs/Cannabis"], "shipping_origin": "USA", "avg_price": 50.0, "rating": 5.0}
        v2 = {"user_name": "darkman", "categories": ["Drugs/Cannabis"], "shipping_origin": "USA", "avg_price": 50.0, "rating": 5.0}
        text = "Hello! 100% stealth vacuum sealed shipping. Tracking provided. BTC accepted. Regards!"
        res_a = ProbabilisticResolutionPipeline.evaluate_vendor_pair(v1, v2, text1=text, text2=text, infra_score=1.0)
        self.assertGreaterEqual(res_a["confidence_percentage"], 95.0)
        self.assertEqual(res_a["decision"], "AUTO_LINKED")
        self.assertEqual(res_a["action"], "MERGED")

        # Case B: High Confidence Suggestion (80-95%)
        v_b1 = {"user_name": "cyber_king", "categories": ["Fraud"], "shipping_origin": "UK", "avg_price": 100.0, "rating": 4.8}
        v_b2 = {"user_name": "cyberlord", "categories": ["Fraud"], "shipping_origin": "UK", "avg_price": 110.0, "rating": 4.7}
        res_b = ProbabilisticResolutionPipeline.evaluate_vendor_pair(v_b1, v_b2, text1=text, text2=text, infra_score=0.8)
        self.assertGreaterEqual(res_b["confidence_percentage"], 80.0)
        self.assertEqual(res_b["action"], "SUGGESTION")

        # Case C: Weak / Ignored (< 60%)
        v_c1 = {"user_name": "botnet_seller", "categories": ["Malware"], "shipping_origin": "Russia", "avg_price": 500.0, "rating": 5.0}
        v_c2 = {"user_name": "flower_tea", "categories": ["Tea"], "shipping_origin": "China", "avg_price": 10.0, "rating": 3.0}
        res_c = ProbabilisticResolutionPipeline.evaluate_vendor_pair(v_c1, v_c2, text1="Malware source code", text2="Organic green tea", infra_score=0.0)
        self.assertLess(res_c["confidence_percentage"], 60.0)
        self.assertEqual(res_c["decision"], "IGNORED")
        self.assertEqual(res_c["action"], "IGNORED")


if __name__ == "__main__":
    unittest.main()
