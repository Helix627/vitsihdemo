"""Graph loading and query utilities for vendor/PGP relationships."""

from __future__ import annotations

from typing import Dict, List, Set

import networkx as nx

from config import VENDOR_LIMIT
from db import get_connection

GRAPH = nx.Graph()
VENDOR_NODE_IDS: Set[str] = set()
PGP_NODE_IDS: Set[str] = set()


VENDOR_STYLE = {
    "color": "#4CAF50",
    "shape": "ellipse",
}

PGP_STYLE = {
    "color": "#FF9800",
    "shape": "diamond",
}


def _parse_vendor_ids(vendor_ids_raw: str | None) -> Set[int]:
    """Parse comma-separated vendor IDs and ignore malformed entries."""
    parsed: Set[int] = set()
    if not vendor_ids_raw:
        return parsed

    for token in vendor_ids_raw.split(","):
        value = token.strip()
        if not value:
            continue

        if not value.isdigit():
            continue

        parsed.add(int(value))

    return parsed


def load_graph() -> None:
    """Build the graph once from database records for the first N vendors."""
    GRAPH.clear()
    VENDOR_NODE_IDS.clear()
    PGP_NODE_IDS.clear()

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                v.vendor_id,
                v.user_name,
                vp.alias AS profile_alias,
                vp.username AS profile_username,
                vp.email AS profile_email,
                vp.bitcoin_wallet AS profile_bitcoin_wallet
            FROM Vendors v
            LEFT JOIN Vendor_Profile vp ON v.vendor_id = vp.vendor_id
            ORDER BY vendor_id ASC
            LIMIT %s
            """,
            (VENDOR_LIMIT,),
        )
        vendor_rows = cursor.fetchall()

        valid_vendor_ids = set()

        for row in vendor_rows:
            vendor_id = int(row["vendor_id"])
            user_name = row.get("user_name") or f"Vendor {row['vendor_id']}"
            profile_username = row.get("profile_username")
            profile_alias = row.get("profile_alias")

            node_id = f"vendor_{vendor_id}"
            GRAPH.add_node(
                node_id,
                type="vendor",
                label=profile_username or user_name,
                username=profile_username or "",
                profile_alias=profile_alias or user_name,
                email=row.get("profile_email") or "",
                bitcoin_wallet=row.get("profile_bitcoin_wallet") or "",
                color=VENDOR_STYLE["color"],
                shape=VENDOR_STYLE["shape"],
            )
            VENDOR_NODE_IDS.add(node_id)
            valid_vendor_ids.add(vendor_id)

        cursor.execute(
            """
            SELECT id, alias, fingerprint, vendor_ids
            FROM Vendor_pgp_keys
            """
        )
        pgp_rows = cursor.fetchall()

        for row in pgp_rows:
            pgp_id = int(row["id"])
            alias = row.get("alias") or f"PGP {pgp_id}"
            fingerprint = row.get("fingerprint") or ""

            linked_vendor_ids = _parse_vendor_ids(row.get("vendor_ids"))
            linked_vendor_ids = linked_vendor_ids.intersection(valid_vendor_ids)

            if not linked_vendor_ids:
                continue

            pgp_node_id = f"pgp_{pgp_id}"
            if pgp_node_id not in GRAPH:
                GRAPH.add_node(
                    pgp_node_id,
                    type="pgp",
                    label=alias,
                    fingerprint=fingerprint,
                    color=PGP_STYLE["color"],
                    shape=PGP_STYLE["shape"],
                )
                PGP_NODE_IDS.add(pgp_node_id)

            for vendor_id in linked_vendor_ids:
                vendor_node_id = f"vendor_{vendor_id}"
                edge_id = f"{vendor_node_id}_{pgp_node_id}"
                GRAPH.add_edge(
                    vendor_node_id,
                    pgp_node_id,
                    relation="uses",
                    id=edge_id,
                )
    finally:
        cursor.close()
        connection.close()


def get_graph_json() -> Dict[str, List[Dict[str, Dict[str, str]]]]:
    """Return Cytoscape.js-compatible graph JSON."""
    nodes = []
    for node_id, attrs in GRAPH.nodes(data=True):
        node_type = attrs.get("type", "")
        node_data = {
            "id": node_id,
            "label": attrs.get("label", ""),
            "type": node_type,
            "color": attrs.get("color", ""),
            "shape": attrs.get("shape", ""),
        }

        if node_type == "vendor":
            vendor_id = node_id.split("_", 1)[1]
            node_data["detail_url"] = f"/vendor/{vendor_id}"
            node_data["username"] = attrs.get("username", "")
            node_data["profile_alias"] = attrs.get("profile_alias", "")
            node_data["email"] = attrs.get("email", "")
            node_data["bitcoin_wallet"] = attrs.get("bitcoin_wallet", "")

        if node_type == "pgp":
            pgp_id = node_id.split("_", 1)[1]
            node_data["fingerprint"] = attrs.get("fingerprint", "")
            node_data["detail_url"] = f"/pgp/{pgp_id}"

        nodes.append({"data": node_data})

    edges = []
    for source, target, attrs in GRAPH.edges(data=True):
        edge_id = attrs.get("id") or f"{source}_{target}"
        edges.append(
            {
                "data": {
                    "id": edge_id,
                    "source": source,
                    "target": target,
                }
            }
        )

    return {"nodes": nodes, "edges": edges}


def get_stats() -> Dict[str, int]:
    """Return graph statistics computed from the current graph."""
    vendor_count = sum(1 for _, attrs in GRAPH.nodes(data=True) if attrs.get("type") == "vendor")
    pgp_count = sum(1 for _, attrs in GRAPH.nodes(data=True) if attrs.get("type") == "pgp")
    edge_count = GRAPH.number_of_edges()

    return {
        "vendors": vendor_count,
        "pgp_keys": pgp_count,
        "edges": edge_count,
        "links": {
            "graph": "/graph",
            "search": "/search?q=",
        },
    }


def get_vendor_details(vendor_id: int):
    """Return one vendor and all connected PGP keys."""
    vendor_node_id = f"vendor_{vendor_id}"
    if vendor_node_id not in GRAPH:
        return None

    vendor_data = GRAPH.nodes[vendor_node_id]
    pgp_keys = []

    for neighbor in GRAPH.neighbors(vendor_node_id):
        neighbor_data = GRAPH.nodes[neighbor]
        if neighbor_data.get("type") != "pgp":
            continue

        pgp_id = neighbor.split("_", 1)[1]

        pgp_keys.append(
            {
                "id": neighbor,
                "label": neighbor_data.get("label", ""),
                "fingerprint": neighbor_data.get("fingerprint", ""),
                "detail_url": f"/pgp/{pgp_id}",
            }
        )

    return {
        "vendor": {
            "id": vendor_node_id,
            "vendor_id": vendor_id,
            "label": vendor_data.get("label", ""),
            "type": vendor_data.get("type", "vendor"),
            "username": vendor_data.get("username", ""),
            "alias": vendor_data.get("profile_alias", ""),
            "email": vendor_data.get("email", ""),
            "bitcoin_wallet": vendor_data.get("bitcoin_wallet", ""),
            "detail_url": f"/vendor/{vendor_id}",
        },
        "pgp_keys": pgp_keys,
        "links": {
            "self": f"/vendor/{vendor_id}",
            "graph": "/graph",
        },
    }


def get_pgp_details(pgp_id: int):
    """Return one PGP key and all vendors connected to it."""
    pgp_node_id = f"pgp_{pgp_id}"
    if pgp_node_id not in GRAPH:
        return None

    pgp_data = GRAPH.nodes[pgp_node_id]
    vendors = []

    for neighbor in GRAPH.neighbors(pgp_node_id):
        neighbor_data = GRAPH.nodes[neighbor]
        if neighbor_data.get("type") != "vendor":
            continue

        vendor_id = neighbor.split("_", 1)[1]

        vendors.append(
            {
                "id": neighbor,
                "label": neighbor_data.get("label", ""),
                "detail_url": f"/vendor/{vendor_id}",
            }
        )

    return {
        "pgp": {
            "id": pgp_node_id,
            "label": pgp_data.get("label", ""),
            "type": pgp_data.get("type", "pgp"),
            "fingerprint": pgp_data.get("fingerprint", ""),
            "detail_url": f"/pgp/{pgp_id}",
        },
        "vendors": vendors,
        "links": {
            "self": f"/pgp/{pgp_id}",
            "graph": "/graph",
        },
    }


def search_graph(query: str):
    """Search vendors by username and PGP keys by alias."""
    text = (query or "").strip().lower()
    if not text:
        return {"vendors": [], "pgp_keys": []}

    vendor_matches = []
    pgp_matches = []

    for node_id, attrs in GRAPH.nodes(data=True):
        label = (attrs.get("label") or "").lower()
        if attrs.get("type") == "vendor":
            vendor_search_blob = " ".join(
                [
                    label,
                    (attrs.get("username") or "").lower(),
                    (attrs.get("profile_alias") or "").lower(),
                ]
            )
            if text not in vendor_search_blob:
                continue
        elif text not in label:
            continue

        if attrs.get("type") == "vendor":
            vendor_id = node_id.split("_", 1)[1]
            vendor_matches.append(
                {
                    "id": node_id,
                    "label": attrs.get("label", ""),
                    "username": attrs.get("username", ""),
                    "alias": attrs.get("profile_alias", ""),
                    "email": attrs.get("email", ""),
                    "bitcoin_wallet": attrs.get("bitcoin_wallet", ""),
                    "detail_url": f"/vendor/{vendor_id}",
                }
            )
        elif attrs.get("type") == "pgp":
            pgp_id = node_id.split("_", 1)[1]
            pgp_matches.append(
                {
                    "id": node_id,
                    "label": attrs.get("label", ""),
                    "fingerprint": attrs.get("fingerprint", ""),
                    "detail_url": f"/pgp/{pgp_id}",
                }
            )

    return {
        "vendors": vendor_matches,
        "pgp_keys": pgp_matches,
    }
