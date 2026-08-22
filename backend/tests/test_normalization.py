"""Unit tests for Input Normalization and Entity Extraction Service."""

import unittest
from services.normalization_service import NormalizationService


class TestNormalizationService(unittest.TestCase):
    def test_unicode_and_whitespace_cleaning(self):
        raw = "   Vendor \u200B\u00A0 \t\n Name   "
        clean = NormalizationService.clean_text(raw)
        self.assertEqual(clean, "Vendor Name")

    def test_email_normalization(self):
        self.assertEqual(NormalizationService.normalize_email("Trader@Proton.ME"), "trader@protonmail.com")
        self.assertEqual(NormalizationService.normalize_email("Ops@GMAIL.com"), "ops@gmail.com")
        self.assertIsNone(NormalizationService.normalize_email("invalid-email-address"))

    def test_bitcoin_and_crypto_validation(self):
        btc_legacy = "1LPiyimWVLtWHJkvgGcvY8mKjZwpVgyaz"
        btc_segwit = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"
        invalid_btc = "not-a-bitcoin-wallet-12345"

        self.assertEqual(NormalizationService.normalize_wallet(btc_legacy), btc_legacy)
        self.assertEqual(NormalizationService.normalize_wallet(btc_segwit), btc_segwit)
        self.assertIsNone(NormalizationService.normalize_wallet(invalid_btc))

    def test_pgp_fingerprint_extraction(self):
        raw_pgp = "483F 3631 151F BA48 95F9  FF84 04B6 3E9B A477 2C78"
        expected = "483F3631151FBA4895F9FF8404B63E9BA4772C78"
        self.assertEqual(NormalizationService.normalize_pgp_fingerprint(raw_pgp), expected)

    def test_tokenization_and_stopwords(self):
        text = "The vendor is selling high quality goods and tools on Agora"
        tokens = NormalizationService.tokenize(text, remove_stopwords=True)
        self.assertNotIn("the", tokens)
        self.assertNotIn("is", tokens)
        self.assertIn("vendor", tokens)
        self.assertIn("goods", tokens)


if __name__ == "__main__":
    unittest.main()
