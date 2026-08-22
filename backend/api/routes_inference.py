"""Probabilistic Relationship Inference API endpoints."""

from flask import Blueprint, jsonify, request
from services.probabilistic_service import ProbabilisticInferenceEngine

inference_bp = Blueprint("inference_bp", __name__)


@inference_bp.route("/api/v1/infer", methods=["GET", "POST"])
@inference_bp.route("/infer", methods=["GET", "POST"])
def run_probabilistic_inference():
    """
    Execute AI embedding generation over the Agora dataset
    and generate probabilistic relationship edges across vendors.
    """
    threshold = request.args.get("threshold", default=0.76, type=float)
    if request.is_json and request.get_json(silent=True):
        payload = request.get_json()
        threshold = float(payload.get("threshold", threshold))
        query_text = payload.get("text")
        if query_text:
            matches = ProbabilisticInferenceEngine.infer_alias_connection(query_text, top_k=5)
            return jsonify({"query": query_text, "predicted_vendors": matches})

    results = ProbabilisticInferenceEngine.build_probabilistic_graph_edges(similarity_threshold=threshold)
    return jsonify(results)
