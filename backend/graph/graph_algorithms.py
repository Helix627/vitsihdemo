"""Graph Analytics Algorithms for Threat Network Topologies."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set
import networkx as nx
from core.logging import logger
from graph.graph_engine import NetworkXGraphEngine


class GraphAnalytics:
    """Executes network analysis algorithms over the active NetworkX graph."""

    @classmethod
    def get_centrality_metrics(cls, top_k: int = 10) -> List[Dict[str, Any]]:
        """Calculate degree centrality and return highest ranked nodes."""
        G = NetworkXGraphEngine.get_graph()
        if G.number_of_nodes() == 0:
            return []

        centrality = nx.degree_centrality(G)
        sorted_nodes = sorted(centrality.items(), key=lambda x: x[1], reverse=True)[:top_k]

        return [
            {
                "id": node_id,
                "label": G.nodes[node_id].get("label", node_id),
                "type": G.nodes[node_id].get("type", "unknown"),
                "centrality": round(score, 4),
            }
            for node_id, score in sorted_nodes
        ]

    @classmethod
    def get_community_detection(cls) -> Dict[str, Any]:
        """Group connected nodes into threat syndicates using Greedy Modularity communities."""
        G = NetworkXGraphEngine.get_graph()
        if G.number_of_nodes() == 0:
            return {"communities_count": 0, "communities": []}

        try:
            communities = list(nx.community.greedy_modularity_communities(G))
        except Exception as exc:
            logger.warning("Community detection fallback to connected components: %s", exc)
            communities = list(nx.connected_components(G))

        results = []
        for idx, comm in enumerate(communities):
            results.append(
                {
                    "community_id": idx + 1,
                    "size": len(comm),
                    "members": list(comm)[:10],
                }
            )

        return {
            "communities_count": len(communities),
            "communities": results[:15],
        }

    @classmethod
    def find_shortest_path(cls, source_id: str, target_id: str) -> Optional[List[str]]:
        """Compute the shortest path sequence of nodes connecting two digital entities."""
        G = NetworkXGraphEngine.get_graph()
        if not G.has_node(source_id) or not G.has_node(target_id):
            return None

        try:
            return nx.shortest_path(G, source=source_id, target=target_id)
        except nx.NetworkXNoPath:
            return None

    @classmethod
    def expand_neighborhood(cls, node_id: str, radius: int = 1) -> Dict[str, Any]:
        """Extract ego subgraph around a target node for localized inspection."""
        G = NetworkXGraphEngine.get_graph()
        if not G.has_node(node_id):
            return {"nodes": [], "edges": []}

        subgraph = nx.ego_graph(G, node_id, radius=radius)
        nodes = [{"data": {"id": n, **subgraph.nodes[n]}} for n in subgraph.nodes()]
        edges = [
            {"data": {"id": f"{u}_{v}", "source": u, "target": v, **subgraph.edges[u, v]}}
            for u, v in subgraph.edges()
        ]

        return {"nodes": nodes, "edges": edges}
