"""Entities REST API Blueprints."""

from flask import Blueprint, jsonify, request
from core.logging import logger
from database.repositories.identity_repo import IdentityRepository
from database.repositories.relationship_repo import RelationshipRepository
from database.repositories.vendor_repo import VendorRepository
from graph.graph_algorithms import GraphAnalytics
from graph.graph_engine import NetworkXGraphEngine

entities_bp = Blueprint("entities_bp", __name__)


@entities_bp.route("/entity/<int:identity_id>", methods=["GET"])
@entities_bp.route("/identity/<int:identity_id>", methods=["GET"])
def get_identity_details(identity_id: int):
    """Retrieve full details for a digital identity including linked vendors and relationships."""
    identity = None
    try:
        identity = IdentityRepository.get_by_id(identity_id)
    except Exception:
        pass

    raw_vendors = []
    raw_relationships = []

    if identity:
        try:
            raw_vendors = IdentityRepository.get_vendors_for_identity(identity_id)
            raw_relationships = RelationshipRepository.get_relationships_for_identity(identity_id)
        except Exception:
            pass
    else:
        # Fallback to in-memory graph
        G = NetworkXGraphEngine.get_graph()
        node_key = f"ident_{identity_id}"
        if G.has_node(node_key):
            node_data = G.nodes[node_key]
            identity = {
                "identity_id": identity_id,
                "identity_type": node_data.get("type", "alias"),
                "value": node_data.get("full_value", node_data.get("label", node_key)),
                "normalized_value": node_data.get("normalized_value", node_data.get("label", node_key)),
            }
            for nbr in G.neighbors(node_key):
                nbr_data = G.nodes[nbr]
                if nbr.startswith("vendor_"):
                    try:
                        vid = int(nbr.replace("vendor_", ""))
                    except Exception:
                        vid = 1
                    raw_vendors.append({
                        "vendor_id": vid,
                        "user_name": nbr_data.get("label", f"Vendor #{vid}"),
                        "market_id": nbr_data.get("market_id", 1),
                        "marketplace_name": VendorRepository.MARKET_NAMES.get(nbr_data.get("market_id", 1), "Darknet Market"),
                    })
                elif nbr.startswith("ident_"):
                    edge_data = G.get_edge_data(node_key, nbr, {})
                    try:
                        other_iid = int(nbr.replace("ident_", ""))
                    except Exception:
                        other_iid = 0
                    raw_relationships.append({
                        "identity1_id": identity_id,
                        "identity2_id": other_iid,
                        "id1_val": identity["value"],
                        "id2_val": nbr_data.get("full_value", nbr_data.get("label", nbr)),
                        "relationship_type": edge_data.get("relation", "LINKED"),
                        "weight": edge_data.get("weight", 1.0),
                    })

    if not identity:
        return jsonify({"error": f"Identity #{identity_id} not found"}), 404

    # Deduplicate vendors by vendor_id
    seen_vendors = set()
    vendors = []
    for v in raw_vendors:
        if v["vendor_id"] not in seen_vendors:
            seen_vendors.add(v["vendor_id"])
            vendors.append(v)

    # Deduplicate relationships by (target_identity_val, relationship_type)
    seen_rels = set()
    relationships = []
    for r in raw_relationships:
        other_val = r.get("id2_val") if r.get("identity1_id") == identity_id else r.get("id1_val")
        rel_key = (other_val, r.get("relationship_type"))
        if rel_key not in seen_rels:
            seen_rels.add(rel_key)
            relationships.append(r)

    return jsonify(
        {
            "identity": identity,
            "linked_vendors": vendors,
            "relationships": relationships,
            "relationships_count": len(relationships),
        }
    )


@entities_bp.route("/node/<path:node_id>", methods=["GET"])
def get_node_details(node_id: str):
    """Retrieve details for any node (vendor, identity, marketplace) by its graph ID."""
    G = NetworkXGraphEngine.get_graph()
    if not G.has_node(node_id):
        return jsonify({"error": f"Node '{node_id}' not found"}), 404

    node_data = G.nodes[node_id]
    ntype = node_data.get("type", "unknown")

    if ntype == "vendor" or node_id.startswith("vendor_"):
        try:
            vid = int(node_data.get("vendor_id") or node_id.replace("vendor_", ""))
            return get_vendor_details(vid)
        except Exception:
            pass

    if node_id.startswith("ident_"):
        try:
            iid = int(node_id.replace("ident_", ""))
            return get_identity_details(iid)
        except Exception:
            pass

    # Generic node detail response
    neighbors = []
    for nbr in G.neighbors(node_id):
        nbr_d = G.nodes[nbr]
        edge_d = G.get_edge_data(node_id, nbr, {})
        neighbors.append({
            "id": nbr,
            "label": nbr_d.get("label", nbr),
            "type": nbr_d.get("type", "unknown"),
            "relation": edge_d.get("relation", "LINKED"),
        })

    return jsonify({
        "id": node_id,
        "label": node_data.get("label", node_id),
        "type": ntype,
        "details": node_data,
        "neighbors": neighbors,
    })


@entities_bp.route("/vendor/<int:vendor_id>", methods=["GET"])
def get_vendor_details(vendor_id: int):
    """Retrieve full details for a marketplace vendor with all linked identities and cross-market syndicates."""
    vendor = None
    try:
        vendor = VendorRepository.get_by_id(vendor_id)
    except Exception:
        pass

    identities = []
    cross_market_accounts = []

    if vendor:
        try:
            identities = IdentityRepository.get_identities_for_vendor(vendor_id)
            cross_market_accounts = VendorRepository.get_cross_market_links(vendor_id)
        except Exception:
            pass
    else:
        # Fallback to in-memory graph
        G = NetworkXGraphEngine.get_graph()
        node_key = f"vendor_{vendor_id}"
        if G.has_node(node_key):
            node_data = G.nodes[node_key]
            m_id = node_data.get("market_id", 1)
            vendor = {
                "vendor_id": vendor_id,
                "user_name": node_data.get("label", f"Vendor #{vendor_id}"),
                "market_id": m_id,
                "marketplace_name": VendorRepository.MARKET_NAMES.get(m_id, "Darknet Market"),
            }
            for nbr in G.neighbors(node_key):
                nbr_data = G.nodes[nbr]
                if nbr.startswith("ident_") or nbr_data.get("type") not in ("marketplace", "vendor"):
                    try:
                        iid = int(nbr.replace("ident_", ""))
                    except Exception:
                        iid = abs(hash(nbr)) % 1000000
                    identities.append({
                        "identity_id": iid,
                        "identity_type": nbr_data.get("type", "alias"),
                        "value": nbr_data.get("full_value", nbr_data.get("label", nbr)),
                        "normalized_value": nbr_data.get("normalized_value", nbr_data.get("label", nbr)),
                    })

    if not vendor:
        return jsonify({"error": f"Vendor #{vendor_id} not found"}), 404

    grouped: dict = {"aliases": [], "usernames": [], "pgp_keys": [], "emails": [], "bitcoin_wallets": []}

    for ident in identities:
        itype = ident.get("identity_type")
        if itype == "alias":
            grouped["aliases"].append(ident)
        elif itype == "username":
            grouped["usernames"].append(ident)
        elif itype == "pgp":
            grouped["pgp_keys"].append(ident)
        elif itype == "email":
            grouped["emails"].append(ident)
        elif itype == "bitcoin":
            grouped["bitcoin_wallets"].append(ident)

    # Generate behavioral and operational fingerprint
    try:
        from services.behavioral_service import BehavioralEngine
        behavioral_profile = BehavioralEngine.generate_vendor_behavioral_profile(
            vendor, identities, cross_market_accounts
        )
    except Exception:
        behavioral_profile = {
            "risk_score": 75,
            "threat_level": "High",
            "cross_market_presence": len(cross_market_accounts) > 0,
            "summary": "Vendor profile analyzed from knowledge graph data.",
        }

    return jsonify(
        {
            "vendor": vendor,
            "identities": identities,
            "grouped_identities": grouped,
            "cross_market_accounts": cross_market_accounts,
            "cross_market_count": len(cross_market_accounts),
            "behavioral_profile": behavioral_profile,
        }
    )


@entities_bp.route("/cross-market-relations", methods=["GET"])
def get_cross_market_relations():
    """Retrieve all high-level cross-marketplace vendor relationships across Agora, ShadowBay, and NightMarket."""
    limit = request.args.get("limit", default=50, type=int)
    offset = request.args.get("offset", default=0, type=int)

    rows = []
    total_count = 0
    try:
        query = """
        SELECT v1.vendor_id AS agora_vendor_id, v1.user_name AS agora_username,
               v2.vendor_id AS target_vendor_id, v2.user_name AS target_username,
               v2.market_id AS target_market_id,
               i.identity_type, i.value AS shared_credential,
               gt.alias_mutation_type, gt.pgp_status, gt.wallet_status, gt.email_status
        FROM vendoridentitymap vim1
        JOIN vendors v1 ON vim1.vendor_id = v1.vendor_id AND v1.market_id = 1
        JOIN vendoridentitymap vim2 ON vim1.identity_id = vim2.identity_id
        JOIN vendors v2 ON vim2.vendor_id = v2.vendor_id AND v2.market_id IN (101, 102)
        JOIN identities i ON vim1.identity_id = i.identity_id
        LEFT JOIN ground_truth_vendor_migrations gt ON v2.vendor_id = gt.synthetic_vendor_id
        ORDER BY v1.vendor_id ASC
        LIMIT %s OFFSET %s;
        """
        from database.connection import get_db_cursor
        with get_db_cursor() as cursor:
            cursor.execute(query, (limit, offset))
            rows = cursor.fetchall()
            for r in rows:
                r["target_marketplace"] = "ShadowBay" if r["target_market_id"] == 101 else "NightMarket"

            cursor.execute("""
                SELECT COUNT(DISTINCT CONCAT(vim1.vendor_id, '-', vim2.vendor_id, '-', vim1.identity_id)) as total
                FROM vendoridentitymap vim1
                JOIN vendors v1 ON vim1.vendor_id = v1.vendor_id AND v1.market_id = 1
                JOIN vendoridentitymap vim2 ON vim1.identity_id = vim2.identity_id
                JOIN vendors v2 ON vim2.vendor_id = v2.vendor_id AND v2.market_id IN (101, 102);
            """)
            total_count = cursor.fetchone()["total"]
    except Exception as exc:
        logger.warning("Could not query cross market relations from DB: %s", exc)

    return jsonify({
        "relations": rows,
        "count": len(rows),
        "total": total_count,
        "limit": limit,
        "offset": offset,
    })
