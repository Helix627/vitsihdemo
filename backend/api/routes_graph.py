"""Graph REST API Blueprints."""

from flask import Blueprint, jsonify, request, make_response
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
    resp = make_response(jsonify(cytoscape_data))
    # Allow browser / proxy to cache graph for 30 seconds
    resp.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=60"
    return resp


@graph_bp.route("/statistics", methods=["GET"])
@graph_bp.route("/stats", methods=["GET"])
def get_statistics():
    """Returns aggregate graph topology metrics and entity distribution.
    Results are computed once and cached for 60 s in the analytics module.
    """
    stats = GraphAnalytics.get_full_stats_cached()
    resp = make_response(jsonify(stats))
    resp.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=120"
    return resp


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
