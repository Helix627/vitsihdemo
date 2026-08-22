"""Flask API for vendor-PGP graph visualization."""

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import DEBUG, SERVER_HOST, SERVER_PORT
from graph_builder import (
    get_graph_json,
    get_pgp_details,
    get_stats,
    get_vendor_details,
    load_graph,
    search_graph,
)

app = Flask(__name__)
CORS(app)


@app.route("/", methods=["GET"])
def home():
    """Health endpoint."""
    return "Backend Running"


@app.route("/graph", methods=["GET"])
def graph():
    """Return graph data in Cytoscape format."""
    return jsonify(get_graph_json())


@app.route("/stats", methods=["GET"])
def stats():
    """Return graph stats."""
    return jsonify(get_stats())


@app.route("/vendor/<int:vendor_id>", methods=["GET"])
def vendor_details(vendor_id):
    """Return one vendor and all associated PGP keys."""
    data = get_vendor_details(vendor_id)
    if not data:
        return jsonify({"error": "Vendor not found in demo graph"}), 404

    return jsonify(data)


@app.route("/pgp/<int:pgp_id>", methods=["GET"])
def pgp_details(pgp_id):
    """Return one PGP key and all associated vendors."""
    data = get_pgp_details(pgp_id)
    if not data:
        return jsonify({"error": "PGP key not found in demo graph"}), 404

    return jsonify(data)


@app.route("/search", methods=["GET"])
def search():
    """Search vendors by username or PGP keys by alias."""
    query = request.args.get("q", "")
    return jsonify(search_graph(query))


if __name__ == "__main__":
    # Build and cache the graph once at startup.
    load_graph()
    app.run(host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG)
