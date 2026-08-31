"""Unit tests for Tor Hidden Service Misconfiguration & Clearnet Origin Attribution Engine."""

import unittest
from app import create_app
from database.connection import init_connection_pool
from services.infrastructure_service import InfrastructureService


class TestInfrastructureEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_connection_pool()
        InfrastructureService.initialize_from_json()
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_1_server_status_parser(self):
        sample_status = """
        Apache Server Status for silkroad3.ops-direct.net (via 127.0.0.1)
        Server Version: Apache/2.4.41 (Ubuntu) OpenSSL/1.1.1f
        Server MPM: event
        Server Built: 2020-04-10T12:00:00
        Current Time: Wednesday, 10-Jan-2024 15:30:00 UTC
        Restart Time: Monday, 01-Jan-2024 00:00:00 UTC
        Parent Server Config. Generation: 1
        Server Uptime: 9 days 15 hours 30 minutes
        Server load: 0.12 0.08 0.05
        Total Accesses: 492019 - Total Traffic: 1.2 GB
        CPU Usage: u2.15 s1.04 cu0 cs0 - .00382% CPU load
        VirtualHost: silkroad3.ops-direct.net (185.220.101.5)
        Srv PID Acc M CPU SS Req Conn Child Slot Client VHost Request
        0-0 1204 0/14/14 _ 0.02 12 0 0.0 0.05 0.05 185.220.101.5 silkroad3.ops-direct.net GET /server-status HTTP/1.1
        """
        res = InfrastructureService.parse_server_status_page(sample_status)
        self.assertTrue(res["is_exposed"])
        self.assertIn("185.220.101.5", res["leaked_ips"])
        self.assertTrue(any("silkroad3.ops-direct.net" in d for d in res["leaked_domains"]))
        self.assertEqual(res["server_banner"], "Apache/2.4.41 (Ubuntu) OpenSSL/1.1.1f")

    def test_2_ssl_certificate_san_matching(self):
        cert_data = {
            "cn": "shadowbay-market.su",
            "san_entries": [
                "shadowbay-market.su",
                "api.shadowbay-cluster.com",
                "shadowbay4m3k9l2p7x5c1v8b4n6m3k1l9p8x7c6v5b4n3m2k1l0p9x8c7.onion",
            ],
            "sha256_fingerprint": "3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D",
            "issuer": "ZeroSSL RSA Domain Secure Site CA",
        }
        res = InfrastructureService.match_ssl_certificate(cert_data)
        self.assertTrue(res["has_clearnet_san"])
        self.assertIn("api.shadowbay-cluster.com", res["san_domains"])
        self.assertIn("shadowbay-market.su", res["san_domains"])
        self.assertGreaterEqual(res["confidence_score"], 0.90)

    def test_3_attribution_score_calculator(self):
        indicators = [
            {"type": "SERVER_STATUS", "confidence_score": 0.99},
            {"type": "SSL_SAN", "confidence_score": 0.98},
            {"type": "FAVICON_MMH3", "confidence_score": 0.90},
        ]
        score_res = InfrastructureService.compute_attribution_score(indicators)
        self.assertGreaterEqual(score_res["score"], 0.90)
        self.assertEqual(score_res["threat_level"], "CONFIRMED")
        self.assertEqual(score_res["dominant_indicator"], "SERVER_STATUS")

    def test_4_infrastructure_database_retrieval(self):
        services = InfrastructureService.get_all_services(limit=10)
        self.assertGreater(len(services), 0)
        first_svc = services[0]
        self.assertIn("onion_address", first_svc)
        self.assertIn("attribution_percentage", first_svc)

        # Detail query
        svc_detail = InfrastructureService.get_service_detail(first_svc["service_id"])
        self.assertIsNotNone(svc_detail)
        self.assertIn("indicators", svc_detail)
        self.assertGreater(len(svc_detail["indicators"]), 0)

    def test_5_correlate_query(self):
        # Search by IP
        res_ip = InfrastructureService.correlate_query("185.220.101.5")
        self.assertGreaterEqual(res_ip["matches_count"], 1)

        # Search by domain
        res_dom = InfrastructureService.correlate_query("shadowbay")
        self.assertGreaterEqual(res_dom["matches_count"], 1)

    def test_6_live_scan_ingestion(self):
        payload = {
            "onion_address": "testmarket4x8c1v4b6n9m2k7l5p0q8w3e1r9t6y4u2i0o7p5a3s1d.onion",
            "title": "Test Undercover Node",
            "server_status_content": "Apache Server Status - VirtualHost: test-ops.clearweb.is (198.51.100.77)",
            "favicon_hash": "-99887766",
            "vendor_id": 1,
        }
        res = InfrastructureService.ingest_live_scan(payload)
        self.assertIn("service_id", res)
        self.assertEqual(res["discovered_origin_ip"], "198.51.100.77")
        self.assertGreaterEqual(res["attribution_score"], 0.40)

    def test_7_rest_api_endpoints(self):
        # 1. GET /api/v1/infrastructure/services
        r_list = self.client.get("/api/v1/infrastructure/services")
        self.assertEqual(r_list.status_code, 200)
        data_list = r_list.get_json()
        self.assertIn("services", data_list)
        self.assertGreater(len(data_list["services"]), 0)

        # 2. GET /api/v1/infrastructure/service/<id>
        svc_id = data_list["services"][0]["service_id"]
        r_detail = self.client.get(f"/api/v1/infrastructure/service/{svc_id}")
        self.assertEqual(r_detail.status_code, 200)
        data_detail = r_detail.get_json()
        self.assertEqual(data_detail["service_id"], svc_id)
        self.assertIn("indicators", data_detail)

        # 3. GET /api/v1/infrastructure/correlate
        r_corr = self.client.get("/api/v1/infrastructure/correlate?q=silkroad")
        self.assertEqual(r_corr.status_code, 200)
        data_corr = r_corr.get_json()
        self.assertGreaterEqual(data_corr["matches_count"], 1)


if __name__ == "__main__":
    unittest.main()
