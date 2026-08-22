"""Resolution and Merge REST API Blueprints."""

from flask import Blueprint, jsonify, request
from pipelines.deterministic_pipeline import DeterministicResolutionPipeline
from pipelines.probabilistic_pipeline import ProbabilisticResolutionPipeline
from services.merge_service import MergeService

resolution_bp = Blueprint("resolution_bp", __name__)


@resolution_bp.route("/resolve", methods=["POST"])
def resolve_identity():
    """
    Triggers deterministic resolution first (exact match).
    If no exact matches exist, runs probabilistic resolution and returns candidate review cards.
    """
    payload = request.get_json(silent=True) or {}
    identity_type = payload.get("type", "alias")
    value = payload.get("value", "")
    text = payload.get("text", value)

    # 1. Pipeline 1: Deterministic Exact Match
    det_result = DeterministicResolutionPipeline.resolve_entity(identity_type, value)
    if det_result.get("matched"):
        return jsonify(
            {
                "status": "deterministic_match",
                "pipeline": "Pipeline 1 (Deterministic)",
                "confidence": 1.0,
                "confidence_percentage": 100.0,
                "auto_merged": True,
                "result": det_result,
            }
        )

    # 2. Pipeline 2: Probabilistic Resolution
    prob_candidates = ProbabilisticResolutionPipeline.find_probabilistic_matches(
        text=text,
        alias_hint=value if identity_type in ("alias", "username") else None,
        top_k=5,
        threshold=0.50,
    )

    return jsonify(
        {
            "status": "probabilistic_review_required",
            "pipeline": "Pipeline 2 (Probabilistic)",
            "query_entity": {"type": identity_type, "value": value},
            "candidates_count": len(prob_candidates),
            "candidates": prob_candidates,
            "requires_human_review": True,
        }
    )


@resolution_bp.route("/merge", methods=["POST"])
def merge_identities():
    """
    Human-in-the-loop action endpoint to merge, reject, or mark identities for later review.
    """
    payload = request.get_json(silent=True) or {}
    primary_id = payload.get("primary_identity_id")
    merged_id = payload.get("merged_identity_id")
    action = payload.get("action", "merge")  # merge, keep_separate, review_later
    confidence = float(payload.get("confidence", 1.0))
    notes = payload.get("notes", "")

    if not primary_id or not merged_id:
        return jsonify({"error": "Both 'primary_identity_id' and 'merged_identity_id' are required."}), 400

    if action == "keep_separate":
        return jsonify(
            {
                "success": True,
                "action": "keep_separate",
                "message": f"Identities #{primary_id} and #{merged_id} marked as distinct.",
            }
        )

    if action == "review_later":
        return jsonify(
            {
                "success": True,
                "action": "review_later",
                "message": f"Pair #{primary_id} <-> #{merged_id} queued for deferred review.",
            }
        )

    # Execute merge
    merge_result = MergeService.execute_merge(
        primary_id=int(primary_id),
        merged_id=int(merged_id),
        method="probabilistic_manual",
        confidence=confidence,
        reviewer_notes=notes,
    )

    return jsonify(merge_result)
