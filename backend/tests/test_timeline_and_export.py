"""Unit Tests for Phase 4 (Timeline) and Phase 5 (Export) REST APIs."""

import unittest
import json
from app import create_app


class TestTimelineAndExport(unittest.TestCase):
    """Test timeline querying, histogram endpoints, and multi-format export."""

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    # -----------------------------------------------------------------------
    # Phase 4: Timeline Tests
    # -----------------------------------------------------------------------
    def test_timeline_range_endpoint(self):
        """Verify /api/v1/timeline/range returns 2014-2015 month-wise bounds."""
        res = self.client.get("/api/v1/timeline/range")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("min_ts", data)
        self.assertIn("max_ts", data)
        self.assertIn("min_label", data)
        self.assertIn("max_label", data)
        self.assertEqual(data["total_months"], 24)
        self.assertIsInstance(data["min_ts"], int)
        self.assertIsInstance(data["max_ts"], int)

    def test_timeline_activity_endpoint(self):
        """Verify /api/v1/timeline/activity returns 24 monthly histogram buckets."""
        res = self.client.get("/api/v1/timeline/activity")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("buckets", data)
        self.assertEqual(len(data["buckets"]), 24)
        self.assertIn("key", data["buckets"][0])
        self.assertIn("vendors", data["buckets"][0])

    def test_graph_with_timeline_filter(self):
        """Verify /graph endpoint handles start_ts and end_ts params."""
        res = self.client.get("/graph?limit=20&start_ts=1398902400&end_ts=1443657599")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("nodes", data)
        self.assertIn("edges", data)

    # -----------------------------------------------------------------------
    # Phase 5: Export Tests
    # -----------------------------------------------------------------------
    def test_export_preview(self):
        """Verify /api/v1/export/preview returns count estimates."""
        res = self.client.post("/api/v1/export/preview", json={"start_ts": 0, "end_ts": 2000000000})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("vendor_count", data)
        self.assertIn("graph_nodes", data)
        self.assertIn("graph_edges", data)

    def test_export_csv(self):
        """Verify /api/v1/export/csv returns valid CSV data and headers."""
        res = self.client.get("/api/v1/export/csv?limit=10")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res.content_type)
        self.assertIn(b"vendor_id,user_name,market_id", res.data)

    def test_export_json(self):
        """Verify /api/v1/export/json returns structured CTI bundle."""
        res = self.client.post("/api/v1/export/json", json={"limit": 10})
        self.assertEqual(res.status_code, 200)
        self.assertIn("application/json", res.content_type)
        data = res.get_json()
        self.assertEqual(data.get("type"), "cti-bundle")
        self.assertIn("objects", data)
        self.assertIsInstance(data["objects"], list)

    def test_export_graph_snapshot(self):
        """Verify /api/v1/export/graph-snapshot returns Cytoscape JSON."""
        res = self.client.get("/api/v1/export/graph-snapshot")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("nodes", data)
        self.assertIn("edges", data)


if __name__ == "__main__":
    unittest.main()
