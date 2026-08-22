"""Analysis and Intelligence Intake REST API Blueprints."""

from flask import Blueprint, jsonify, request
from pipelines.probabilistic_pipeline import ProbabilisticResolutionPipeline
from services.confidentiality_service import ConfidentialityService
from services.normalization_service import NormalizationService
from services.stylometric_service import StylometricEngine

analysis_bp = Blueprint("analysis_bp", __name__)


@analysis_bp.route("/analyze", methods=["POST"])
@analysis_bp.route("/api/v1/analyze", methods=["POST"])
def analyze_intelligence():
    """
    Complete intelligence intake endpoint:
    Normalizes input, extracts PII entities, calculates 0-100 confidentiality score,
    computes Agora stylometry matches, and retrieves probabilistic candidates for human review.
    """
    payload = request.get_json(silent=True) or {}
    text = payload.get("text") or payload.get("raw_text") or ""

    if not text.strip():
        return jsonify({"error": "No input text provided."}), 400

    # 1. Normalization & Entity Extraction
    clean_text = NormalizationService.clean_text(text)
    extracted_entities = NormalizationService.extract_all_entities(clean_text)

    # 2. Confidentiality & PII Risk Evaluation
    confidentiality_report = ConfidentialityService.evaluate(clean_text)

    # 3. Agora Stylometric Authorship Attribution
    stylometry_matches = StylometricEngine.match_author(clean_text, top_k=3)

    # 4. Probabilistic Resolution Candidates (Human-in-the-Loop)
    probable_matches = ProbabilisticResolutionPipeline.find_probabilistic_matches(
        text=clean_text,
        top_k=4,
        threshold=0.55,
    )

    return jsonify(
        {
            "summary": {
                "character_count": len(clean_text),
                "token_count": len(NormalizationService.tokenize(clean_text)),
                "confidentiality_score": confidentiality_report["score"],
                "confidentiality_level": confidentiality_report["level"],
            },
            "confidentiality": confidentiality_report,
            "extracted_entities": extracted_entities,
            "stylometric_matches": stylometry_matches,
            "probable_matches": probable_matches,
        }
    )


@analysis_bp.route("/normalize", methods=["POST"])
def normalize_input():
    """Dedicated normalization utility endpoint."""
    payload = request.get_json(silent=True) or {}
    text = payload.get("text", "")
    return jsonify(
        {
            "cleaned_text": NormalizationService.clean_text(text),
            "tokens": NormalizationService.tokenize(text),
            "entities": NormalizationService.extract_all_entities(text),
        }
    )


@analysis_bp.route("/stylometry", methods=["POST"])
def calculate_stylometry():
    """Extract stylometric linguistic features and compare against Agora dataset."""
    payload = request.get_json(silent=True) or {}
    text = payload.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    features = StylometricEngine.extract_features(text)
    matches = StylometricEngine.match_author(text, top_k=5)

    return jsonify({"features": features, "top_matches": matches})
