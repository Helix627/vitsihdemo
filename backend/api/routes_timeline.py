"""Timeline REST API — Month-Wise Historical Activity Endpoints (2014–2015 Agora Darknet Era)."""

from __future__ import annotations

import calendar
from datetime import datetime, timezone
import time
from typing import Any, Dict, List
from flask import Blueprint, jsonify, request
from database.connection import get_db_cursor
from core.logging import logger

timeline_bp = Blueprint("timeline_bp", __name__)

# Standard 2014-2015 Darknet Dataset Historical Period
DEFAULT_MIN_TS = 1388534400  # 2014-01-01 00:00:00 UTC
DEFAULT_MAX_TS = 1451606399  # 2015-12-31 23:59:59 UTC

MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]


def _build_month_slots(start_year: int = 2014, start_month: int = 1, end_year: int = 2015, end_month: int = 12) -> List[Dict[str, Any]]:
    """Build continuous monthly time windows with timestamps."""
    slots = []
    curr_y, curr_m = start_year, start_month

    while (curr_y < end_year) or (curr_y == end_year and curr_m <= end_month):
        _, last_day = calendar.monthrange(curr_y, curr_m)
        dt_start = datetime(curr_y, curr_m, 1, 0, 0, 0, tzinfo=timezone.utc)
        dt_end = datetime(curr_y, curr_m, last_day, 23, 59, 59, tzinfo=timezone.utc)

        ym_str = f"{curr_y:04d}-{curr_m:02d}"
        m_name = MONTH_NAMES[curr_m - 1]

        slots.append({
            "key": ym_str,
            "year": curr_y,
            "month": curr_m,
            "label": f"{m_name} {curr_y}",
            "short": f"{m_name} '{str(curr_y)[2:]}",
            "start_ts": int(dt_start.timestamp()),
            "end_ts": int(dt_end.timestamp()),
            "vendors": 0,
        })

        curr_m += 1
        if curr_m > 12:
            curr_m = 1
            curr_y += 1

    return slots


@timeline_bp.route("/api/v1/timeline/range", methods=["GET"])
def get_timeline_range():
    """Return the month-wise boundary timestamps for the 2014–2015 Agora dataset era.
    The frontend uses this to initialise the monthly slider extents.
    """
    return jsonify({
        "min_ts": DEFAULT_MIN_TS,
        "max_ts": DEFAULT_MAX_TS,
        "min_label": "Jan 2014",
        "max_label": "Dec 2015",
        "start_year": 2014,
        "end_year": 2015,
        "total_months": 24,
    })


@timeline_bp.route("/api/v1/timeline/activity", methods=["GET"])
def get_timeline_activity():
    """Return monthly vendor threat activity distribution across 2014–2015.
    Optional ?start=<unix_ts>&end=<unix_ts> query window.
    """
    start_ts = request.args.get("start", default=DEFAULT_MIN_TS, type=int)
    end_ts = request.args.get("end", default=DEFAULT_MAX_TS, type=int)

    # 1. Initialize all 24 month slots for 2014-2015
    slots = _build_month_slots(2014, 1, 2015, 12)
    slot_map = {s["key"]: s for s in slots}

    # 2. Query monthly counts from MySQL Vendors table
    with get_db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                DATE_FORMAT(FROM_UNIXTIME(added), '%Y-%m') AS ym,
                COUNT(*) AS vendor_count
            FROM Vendors
            WHERE added IS NOT NULL
              AND added BETWEEN %s AND %s
            GROUP BY ym
            ORDER BY ym ASC;
            """,
            (DEFAULT_MIN_TS, DEFAULT_MAX_TS),
        )
        rows = cursor.fetchall()

    for r in rows:
        ym = r.get("ym")
        if ym in slot_map:
            slot_map[ym]["vendors"] = int(r["vendor_count"])

    return jsonify({
        "buckets": slots,
        "start_ts": start_ts,
        "end_ts": end_ts,
        "total_months": len(slots),
    })
