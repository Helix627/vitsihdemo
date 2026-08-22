"""Graph REST API Blueprints."""

from flask import Blueprint, jsonify, request
from graph.graph_algorithms import GraphAnalytics
from graph.graph_engine import NetworkXGraphEngine
from graph.serializers import CytoscapeSerializer
import networkx as nx

graph_bp = Blueprint("graph_bp", __name__)


@graph_bp.route("/graph", methods=["GET"])
def get_graph():
    """Returns the Cytoscape graph elements payload."""
    min_confidence = request.args.get("min_confidence", default=0.0, type=float)
    limit = request.args.get("limit", default=50, type=int)

    # Rebuild if limit is changed
    if limit != NetworkXGraphEngine._ACTIVE_VENDOR_LIMIT:
        NetworkXGraphEngine.build_graph(vendor_limit=limit)

    cytoscape_data = CytoscapeSerializer.to_cytoscape_json(min_confidence=min_confidence)
    return jsonify(cytoscape_data)


@graph_bp.route("/statistics", methods=["GET"])
@graph_bp.route("/stats", methods=["GET"])
def get_statistics():
    """Returns aggregate graph topology metrics and entity distribution."""
    G = NetworkXGraphEngine.get_graph()

    type_counts = {}
    for _, data in G.nodes(data=True):
        ntype = data.get("type", "unknown")
        type_counts[ntype] = type_counts.get(ntype, 0) + 1

    node_count = G.number_of_nodes()
    edge_count = G.number_of_edges()
    density = nx.density(G) if node_count > 1 else 0.0

    components = nx.number_connected_components(G) if node_count > 0 else 0
    top_central = GraphAnalytics.get_centrality_metrics(top_k=5)
    communities = GraphAnalytics.get_community_detection()

    return jsonify(
        {
            "total_nodes": node_count,
            "edges": edge_count,
            "connected_components": components,
            "density": f"{density:.4f}",
            "communities_count": communities["communities_count"],
            "top_central_nodes": top_central,
            "type_counts": type_counts,
            "aliases": type_counts.get("alias", 0) + type_counts.get("vendor", 0),
            "vendors": type_counts.get("vendor", 0),
            "usernames": type_counts.get("username", 0),
            "pgp_keys": type_counts.get("pgp", 0),
            "emails": type_counts.get("email", 0),
            "bitcoin_wallets": type_counts.get("bitcoin", 0),
        }
    )


@graph_bp.route("/path", methods=["GET"])
def get_path():
    """Find the shortest path connecting two graph node IDs."""
    source = request.args.get("source")
    target = request.args.get("target")
    if not source or not target:
        return jsonify({"error": "Both 'source' and 'target' query parameters are required."}), 400

    path = GraphAnalytics.find_shortest_path(source, target)
    if path is None:
        return jsonify({"found": False, "path": [], "message": "No connecting path found."})

    return jsonify({"found": True, "path": path, "length": len(path) - 1})
