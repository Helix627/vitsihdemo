"""Export REST API — CSV, JSON, and Graph Snapshot export endpoints."""

from __future__ import annotations

import csv
import io
import json
import time
from flask import Blueprint, jsonify, request, Response, make_response
from database.connection import get_db_cursor
from graph.graph_engine import NetworkXGraphEngine
from graph.serializers import CytoscapeSerializer
from core.logging import logger

export_bp = Blueprint("export_bp", __name__)


# ---------------------------------------------------------------------------
# Helper: Build vendor + credential rows for export
# ---------------------------------------------------------------------------
def _get_export_rows(start_ts: int = 0, end_ts: int = 0, limit: int = 5000):
    """Fetch vendor rows with their top credentials for CSV/JSON export."""
    ts_clause = ""
    params: list = [limit]
    if start_ts and end_ts:
        ts_clause = "AND v.added BETWEEN %s AND %s"
        params = [start_ts, end_ts, limit]

    with get_db_cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                v.vendor_id,
                v.user_name,
                v.market_id,
                v.added,
                v.updated,
                -- Aggregate identity values per type
                MAX(CASE WHEN i.identity_type = 'alias'   THEN i.value END) AS alias,
                MAX(CASE WHEN i.identity_type = 'email'   THEN i.value END) AS email,
                MAX(CASE WHEN i.identity_type = 'bitcoin' THEN i.value END) AS bitcoin,
                MAX(CASE WHEN i.identity_type = 'monero'  THEN i.value END) AS monero,
                MAX(CASE WHEN i.identity_type = 'pgp'     THEN i.value END) AS pgp,
                MAX(CASE WHEN i.identity_type = 'telegram' THEN i.value END) AS telegram,
                MAX(CASE WHEN i.identity_type = 'onion'   THEN i.value END) AS onion
            FROM Vendors v
            LEFT JOIN vendoridentitymap vim ON v.vendor_id = vim.vendor_id
            LEFT JOIN Identities i ON vim.identity_id = i.identity_id
            WHERE 1=1 {ts_clause}
            GROUP BY v.vendor_id
            ORDER BY v.added DESC
            LIMIT %s;
            """,
            params,
        )
        return cursor.fetchall()


# ---------------------------------------------------------------------------
# CSV Export
# ---------------------------------------------------------------------------
@export_bp.route("/api/v1/export/csv", methods=["POST", "GET"])
def export_csv():
    """Export vendor intelligence table as a downloadable CSV file."""
    payload = request.get_json(silent=True) or {}
    start_ts = int(payload.get("start_ts", 0))
    end_ts   = int(payload.get("end_ts", 0))
    limit    = int(payload.get("limit", 5000))

    rows = _get_export_rows(start_ts, end_ts, limit)

    fieldnames = [
        "vendor_id", "user_name", "market_id", "added", "updated",
        "alias", "email", "bitcoin", "monero", "pgp", "telegram", "onion",
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        clean = {k: (row.get(k) or "") for k in fieldnames}
        writer.writerow(clean)

    csv_data = output.getvalue()
    resp = make_response(csv_data)
    resp.headers["Content-Type"] = "text/csv; charset=utf-8"
    resp.headers["Content-Disposition"] = 'attachment; filename="cti_export.csv"'
    return resp


# ---------------------------------------------------------------------------
# JSON / CTI Package Export
# ---------------------------------------------------------------------------
@export_bp.route("/api/v1/export/json", methods=["POST", "GET"])
def export_json():
    """Export intelligence dossier as a structured CTI JSON package."""
    payload = request.get_json(silent=True) or {}
    start_ts = int(payload.get("start_ts", 0))
    end_ts   = int(payload.get("end_ts", 0))
    limit    = int(payload.get("limit", 1000))

    rows = _get_export_rows(start_ts, end_ts, limit)

    actors = []
    for row in rows:
        actor = {
            "id": f"threat-actor--vendor-{row['vendor_id']}",
            "type": "threat-actor",
            "name": row.get("user_name") or f"Vendor #{row['vendor_id']}",
            "vendor_id": row.get("vendor_id"),
            "market_id": row.get("market_id"),
            "first_seen_ts": row.get("added"),
            "last_seen_ts": row.get("updated"),
            "identifiers": {
                "alias":    row.get("alias"),
                "email":    row.get("email"),
                "bitcoin":  row.get("bitcoin"),
                "monero":   row.get("monero"),
                "pgp":      row.get("pgp"),
                "telegram": row.get("telegram"),
                "onion":    row.get("onion"),
            },
        }
        # Strip None values for cleaner JSON
        actor["identifiers"] = {k: v for k, v in actor["identifiers"].items() if v}
        actors.append(actor)

    package = {
        "type": "cti-bundle",
        "spec_version": "1.0",
        "platform": "Dark Web Identity Resolution Platform (NTRO PS 26151)",
        "exported_at": int(time.time()),
        "filter": {
            "start_ts": start_ts or None,
            "end_ts": end_ts or None,
        },
        "total_actors": len(actors),
        "objects": actors,
    }

    resp = make_response(json.dumps(package, indent=2, default=str))
    resp.headers["Content-Type"] = "application/json; charset=utf-8"
    resp.headers["Content-Disposition"] = 'attachment; filename="cti_export.json"'
    return resp


# ---------------------------------------------------------------------------
# Graph Snapshot (Cytoscape JSON)
# ---------------------------------------------------------------------------
@export_bp.route("/api/v1/export/graph-snapshot", methods=["GET"])
def export_graph_snapshot():
    """Export the current in-memory graph as Cytoscape JSON."""
    cytoscape_data = CytoscapeSerializer.to_cytoscape_json()
    resp = make_response(json.dumps(cytoscape_data, indent=2, default=str))
    resp.headers["Content-Type"] = "application/json; charset=utf-8"
    resp.headers["Content-Disposition"] = 'attachment; filename="graph_snapshot.json"'
    return resp


# ---------------------------------------------------------------------------
# Export Stats (for ExportModal count preview)
# ---------------------------------------------------------------------------
@export_bp.route("/api/v1/export/preview", methods=["POST", "GET"])
def export_preview():
    """Return record counts for the current export filter without downloading data."""
    payload = request.get_json(silent=True) or {}
    start_ts = int(payload.get("start_ts", 0))
    end_ts   = int(payload.get("end_ts", 0))

    ts_clause = ""
    params: list = []
    if start_ts and end_ts:
        ts_clause = "WHERE added BETWEEN %s AND %s"
        params = [start_ts, end_ts]

    with get_db_cursor() as cursor:
        cursor.execute(f"SELECT COUNT(*) AS cnt FROM Vendors {ts_clause};", params)
        vendor_count = (cursor.fetchone() or {}).get("cnt", 0)

    G = NetworkXGraphEngine.get_graph()
    return jsonify({
        "vendor_count": int(vendor_count),
        "graph_nodes": G.number_of_nodes(),
        "graph_edges": G.number_of_edges(),
    })
