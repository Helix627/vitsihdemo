"""REST API Blueprints for Tor Hidden Service Infrastructure Intelligence."""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from core.logging import logger
from services.infrastructure_service import InfrastructureService

infrastructure_bp = Blueprint("infrastructure_bp", __name__)


@infrastructure_bp.route("/api/v1/infrastructure/services", methods=["GET"])
def get_all_onion_services():
    """List all scanned Tor hidden services with origin server attribution status."""
    limit = request.args.get("limit", default=50, type=int)
    offset = request.args.get("offset", default=0, type=int)

    services = InfrastructureService.get_all_services(limit=limit, offset=offset)
    return jsonify({
        "services": services,
        "count": len(services),
        "limit": limit,
        "offset": offset,
    })


@infrastructure_bp.route("/api/v1/infrastructure/service/<int:service_id>", methods=["GET"])
def get_onion_service_detail(service_id: int):
    """Retrieve full hidden service intelligence dossier with indicators and evidence."""
    service = InfrastructureService.get_service_detail(service_id)
    if not service:
        return jsonify({"error": f"Onion service #{service_id} not found."}), 404
    return jsonify(service)


@infrastructure_bp.route("/api/v1/infrastructure/correlate", methods=["GET"])
def correlate_infrastructure():
    """Correlate query across onion addresses, clearnet IPs, domains, and ASN/ISPs."""
    query = request.args.get("q") or request.args.get("query") or ""
    if not query.strip():
        return jsonify({"error": "'q' search query parameter is required."}), 400

    results = InfrastructureService.correlate_query(query)
    return jsonify(results)


@infrastructure_bp.route("/api/v1/infrastructure/scan", methods=["POST"])
def ingest_infrastructure_scan():
    """
    Ingest a raw hidden service scan payload (server-status content, SSL certs, favicons, headers).
    Computes origin attribution confidence and saves to database.
    """
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "Empty scan payload."}), 400

    result = InfrastructureService.ingest_live_scan(payload)
    if "error" in result:
        return jsonify(result), 400

    return jsonify({
        "status": "SCAN_PROCESSED_SUCCESSFULLY",
        "result": result,
    })


@infrastructure_bp.route("/api/v1/infrastructure/seed", methods=["POST"])
def seed_infrastructure():
    """Re-seed infrastructure intelligence from data/tor_infrastructure.json."""
    count = InfrastructureService.initialize_from_json()
    return jsonify({
        "status": "SEEDING_COMPLETE",
        "records_seeded": count,
    })
