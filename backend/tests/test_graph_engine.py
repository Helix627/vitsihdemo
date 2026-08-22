"""Unit tests for Extended NetworkX Graph Engine and Analytics."""

import unittest
from graph.graph_algorithms import GraphAnalytics
from graph.graph_engine import NetworkXGraphEngine
from graph.serializers import CytoscapeSerializer


class TestGraphEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        NetworkXGraphEngine.build_graph(vendor_limit=30)

    def test_graph_node_types_and_edges(self):
        G = NetworkXGraphEngine.get_graph()
        self.assertGreater(G.number_of_nodes(), 0)
        self.assertGreater(G.number_of_edges(), 0)

        # Check for marketplace node
        self.assertTrue(G.has_node("market_agora"))

    def test_centrality_and_communities(self):
        central = GraphAnalytics.get_centrality_metrics(top_k=5)
        self.assertIsInstance(central, list)
        self.assertGreater(len(central), 0)

        comm = GraphAnalytics.get_community_detection()
        self.assertIn("communities_count", comm)
        self.assertGreater(comm["communities_count"], 0)

    def test_cytoscape_serializer(self):
        data = CytoscapeSerializer.to_cytoscape_json(min_confidence=0.0)
        self.assertIn("nodes", data)
        self.assertIn("edges", data)
        self.assertGreater(len(data["nodes"]), 0)


if __name__ == "__main__":
    unittest.main()
