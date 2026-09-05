"""Entities REST API Blueprints."""

from flask import Blueprint, jsonify, request
from database.repositories.identity_repo import IdentityRepository
from database.repositories.relationship_repo import RelationshipRepository
from database.repositories.vendor_repo import VendorRepository
from graph.graph_algorithms import GraphAnalytics

entities_bp = Blueprint("entities_bp", __name__)


@entities_bp.route("/entity/<int:identity_id>", methods=["GET"])
@entities_bp.route("/identity/<int:identity_id>", methods=["GET"])
def get_identity_details(identity_id: int):
    """Retrieve full details for a digital identity including linked vendors and relationships."""
    identity = IdentityRepository.get_by_id(identity_id)
    if not identity:
        return jsonify({"error": f"Identity #{identity_id} not found"}), 404

    vendors = IdentityRepository.get_vendors_for_identity(identity_id)
    relationships = RelationshipRepository.get_relationships_for_identity(identity_id)

    return jsonify(
        {
            "identity": identity,
            "linked_vendors": vendors,
            "relationships": relationships,
            "relationships_count": len(relationships),
        }
    )


@entities_bp.route("/vendor/<int:vendor_id>", methods=["GET"])
def get_vendor_details(vendor_id: int):
    """Retrieve full details for a marketplace vendor with all linked identities and cross-market syndicates."""
    vendor = VendorRepository.get_by_id(vendor_id)
    if not vendor:
        return jsonify({"error": f"Vendor #{vendor_id} not found"}), 404

    identities = IdentityRepository.get_identities_for_vendor(vendor_id)
    grouped: dict = {"aliases": [], "usernames": [], "pgp_keys": [], "emails": [], "bitcoin_wallets": []}

    for ident in identities:
        itype = ident["identity_type"]
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

    # Fetch cross-marketplace linked vendor personas
    cross_market_accounts = VendorRepository.get_cross_market_links(vendor_id)

    # Generate behavioral and operational fingerprint
    from services.behavioral_service import BehavioralEngine
    behavioral_profile = BehavioralEngine.generate_vendor_behavioral_profile(
        vendor, identities, cross_market_accounts
    )

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

    return jsonify({
        "relations": rows,
        "count": len(rows),
        "total": total_count,
        "limit": limit,
        "offset": offset,
    })
