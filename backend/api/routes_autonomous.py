"""Autonomous Engine REST API — Status, Toggle, and Trigger Endpoints."""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from services.autonomous_collector import AutonomousCollector
from core.logging import logger

autonomous_bp = Blueprint("autonomous_bp", __name__)


@autonomous_bp.route("/api/v1/autonomous/status", methods=["GET"])
def get_autonomous_status():
    """Return real-time state, metrics, and recent scans of the autonomous collector."""
    collector = AutonomousCollector.get_instance()
    return jsonify(collector.get_status())


@autonomous_bp.route("/api/v1/autonomous/toggle", methods=["POST"])
def toggle_autonomous_engine():
    """Start or pause the background autonomous collection thread."""
    collector = AutonomousCollector.get_instance()
    payload = request.get_json(silent=True) or {}
    enable = payload.get("enable")

    if enable is None:
        # Toggle current state
        if collector.is_running:
            collector.stop()
        else:
            collector.start()
    elif enable:
        collector.start()
    else:
        collector.stop()

    return jsonify(collector.get_status())


@autonomous_bp.route("/api/v1/autonomous/trigger", methods=["POST"])
def trigger_instant_pulse():
    """Immediately execute an autonomous scan cycle on-demand."""
    collector = AutonomousCollector.get_instance()
    event = collector.trigger_pulse()
    return jsonify({
        "status": "TRIGGERED",
        "event": event,
        "engine_state": collector.get_status(),
    })
