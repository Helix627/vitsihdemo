"""Identity Analyzer & Intelligence Intake API endpoints."""

from flask import Blueprint, jsonify, request
from services.analyzer_service import AnalyzerService

analyzer_bp = Blueprint("analyzer_bp", __name__)


@analyzer_bp.route("/api/v1/analyze", methods=["POST"])
@analyzer_bp.route("/analyze", methods=["POST"])
def analyze_intelligence():
    """
    Intake arbitrary intelligence text / documents, extract entities,
    score confidentiality risk, and match against the darknet graph.
    """
    payload = request.get_json(silent=True) or {}
    text = payload.get("text", "")
    if not text:
        return jsonify({"error": "Field 'text' is required"}), 400

    results = AnalyzerService.analyze_text(text)
    return jsonify(results)
