"""Unit tests for Confidentiality Rating and PII Risk Scoring Engine."""

import unittest
from services.confidentiality_service import ConfidentialityService


class TestConfidentialityService(unittest.TestCase):
    def test_public_tier_evaluation(self):
        text = "Hello we are active in digital tech discussions."
        res = ConfidentialityService.evaluate(text)
        self.assertLessEqual(res["score"], 20)
        self.assertEqual(res["level"], "Public")

    def test_sensitive_tier_evaluation(self):
        text = """
        Contact: trader_secure@protonmail.com
        Bitcoin address: 1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz
        PGP: 483F3631151FBA4895F9FF8404B63E9BA4772C78
        """
        res = ConfidentialityService.evaluate(text)
        self.assertGreaterEqual(res["score"], 60)
        self.assertIn(res["level"], ["Sensitive", "Highly Confidential"])
        self.assertIn("emails", res["breakdown"])
        self.assertIn("bitcoin_wallets", res["breakdown"])
        self.assertIn("pgp_fingerprints", res["breakdown"])

    def test_credentials_risk_escalation(self):
        text = "Admin login password: ultra_secret_password_123!"
        res = ConfidentialityService.evaluate(text)
        self.assertGreaterEqual(res["score"], 40)
        self.assertIn("credentials", res["breakdown"])

    def test_score_saturation_cap(self):
        # Even with many PII items, score should not exceed 100
        text = """
        user1@protonmail.com, user2@gmail.com, user3@yahoo.com
        1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz
        bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq
        483F3631151FBA4895F9FF8404B63E9BA4772C78
        Password: pass123
        Phone: +1 555 839 2041
        SSN: 000-12-3456
        """
        res = ConfidentialityService.evaluate(text)
        self.assertLessEqual(res["score"], 100)
        self.assertEqual(res["level"], "Highly Confidential")


if __name__ == "__main__":
    unittest.main()
