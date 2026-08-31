"""Graph Analytics Algorithms for Threat Network Topologies."""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional
import networkx as nx
from core.logging import logger
from graph.graph_engine import NetworkXGraphEngine


class GraphAnalytics:
    """Executes network analysis algorithms over the active NetworkX graph."""

    # -------------------------------------------------------------------
    # In-process cache: TTL-based so hot paths don't recompute every request
    # -------------------------------------------------------------------
    _stats_cache: Dict[str, Any] = {}
    _stats_cache_graph_id: int = -1
    _stats_cache_ts: float = 0.0
    _STATS_TTL: float = 60.0  # seconds

    @classmethod
    def _is_cache_valid(cls) -> bool:
        """Return True when cached stats are still fresh for the current graph snapshot."""
        graph_changed = id(NetworkXGraphEngine.get_graph()) != cls._stats_cache_graph_id
        expired = (time.monotonic() - cls._stats_cache_ts) > cls._STATS_TTL
        return bool(cls._stats_cache) and not graph_changed and not expired

    @classmethod
    def get_centrality_metrics(cls, top_k: int = 10) -> List[Dict[str, Any]]:
        """Calculate degree centrality and return highest ranked nodes.
        Returns cached result if the graph snapshot hasn't changed since last call.
        """
        if cls._is_cache_valid() and "top_central_nodes" in cls._stats_cache:
            cached = cls._stats_cache["top_central_nodes"]
            return cached[:top_k]

        G = NetworkXGraphEngine.get_graph()
        if G.number_of_nodes() == 0:
            return []

        centrality = nx.degree_centrality(G)
        sorted_nodes = sorted(centrality.items(), key=lambda x: x[1], reverse=True)[:top_k]

        result = [
            {
                "id": node_id,
                "label": G.nodes[node_id].get("label", node_id),
                "type": G.nodes[node_id].get("type", "unknown"),
                "centrality": round(score, 4),
            }
            for node_id, score in sorted_nodes
        ]
        return result

    @classmethod
    def get_community_detection(cls) -> Dict[str, Any]:
        """Group connected nodes into threat syndicates.

        Uses fast connected-component labelling (O(n+e)) as the primary
        algorithm instead of greedy_modularity_communities (O(n²)).  The
        result is cached for _STATS_TTL seconds so repeated /stats calls
        within the same minute are instant.
        """
        if cls._is_cache_valid() and "communities" in cls._stats_cache:
            return {
                "communities_count": cls._stats_cache["communities_count"],
                "communities": cls._stats_cache["communities"],
            }

        G = NetworkXGraphEngine.get_graph()
        if G.number_of_nodes() == 0:
            return {"communities_count": 0, "communities": []}

        # Use fast connected_components (O(n+e)) instead of greedy_modularity_communities (O(n²))
        try:
            communities = list(nx.connected_components(G))
            communities.sort(key=len, reverse=True)
        except Exception as exc:
            logger.warning("Community detection failed: %s", exc)
            return {"communities_count": 0, "communities": []}

        results = [
            {
                "community_id": idx + 1,
                "size": len(comm),
                "members": list(comm)[:10],
            }
            for idx, comm in enumerate(communities)
        ]

        # Store in cache
        cls._stats_cache["communities_count"] = len(communities)
        cls._stats_cache["communities"] = results[:15]
        cls._stats_cache_graph_id = id(G)
        cls._stats_cache_ts = time.monotonic()

        return {
            "communities_count": len(communities),
            "communities": results[:15],
        }

    @classmethod
    def get_full_stats_cached(cls) -> Dict[str, Any]:
        """Compute and cache ALL stats in a single pass. Reused by /stats endpoint."""
        if cls._is_cache_valid():
            return cls._stats_cache

        G = NetworkXGraphEngine.get_graph()
        node_count = G.number_of_nodes()
        edge_count = G.number_of_edges()

        if node_count == 0:
            empty: Dict[str, Any] = {
                "total_nodes": 0, "edges": 0, "connected_components": 0,
                "density": "0.0000", "communities_count": 0, "communities": [],
                "top_central_nodes": [], "type_counts": {},
                "aliases": 0, "vendors": 0, "usernames": 0,
                "pgp_keys": 0, "emails": 0, "bitcoin_wallets": 0,
            }
            cls._stats_cache = empty
            cls._stats_cache_graph_id = id(G)
            cls._stats_cache_ts = time.monotonic()
            return empty

        # Type counts (single iteration)
        type_counts: Dict[str, int] = {}
        for _, data in G.nodes(data=True):
            ntype = data.get("type", "unknown")
            type_counts[ntype] = type_counts.get(ntype, 0) + 1

        # Density
        density = nx.density(G) if node_count > 1 else 0.0

        # Connected components (fast O(n+e))
        communities_raw = list(nx.connected_components(G))
        communities_raw.sort(key=len, reverse=True)
        num_components = len(communities_raw)
        communities_out = [
            {"community_id": idx + 1, "size": len(c), "members": list(c)[:10]}
            for idx, c in enumerate(communities_raw)
        ][:15]

        # Degree centrality (O(n))
        centrality = nx.degree_centrality(G)
        top_central_raw = sorted(centrality.items(), key=lambda x: x[1], reverse=True)[:10]
        top_central_nodes = [
            {
                "id": nid,
                "label": G.nodes[nid].get("label", nid),
                "type": G.nodes[nid].get("type", "unknown"),
                "centrality": round(sc, 4),
            }
            for nid, sc in top_central_raw
        ]

        result: Dict[str, Any] = {
            "total_nodes": node_count,
            "edges": edge_count,
            "connected_components": num_components,
            "density": f"{density:.4f}",
            "communities_count": num_components,
            "communities": communities_out,
            "top_central_nodes": top_central_nodes,
            "type_counts": type_counts,
            "aliases": type_counts.get("alias", 0) + type_counts.get("vendor", 0),
            "vendors": type_counts.get("vendor", 0),
            "usernames": type_counts.get("username", 0),
            "pgp_keys": type_counts.get("pgp", 0),
            "emails": type_counts.get("email", 0),
            "bitcoin_wallets": type_counts.get("bitcoin", 0),
        }

        cls._stats_cache = result
        cls._stats_cache_graph_id = id(G)
        cls._stats_cache_ts = time.monotonic()
        return result

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
