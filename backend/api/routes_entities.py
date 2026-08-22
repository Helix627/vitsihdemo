"""Entities REST API Blueprints."""

from flask import Blueprint, jsonify
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
    """Retrieve full details for a marketplace vendor with all linked identities."""
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

    return jsonify(
        {
            "vendor": vendor,
            "identities": identities,
            "grouped_identities": grouped,
            "aliases": grouped["aliases"],
            "usernames": grouped["usernames"],
            "pgp_keys": grouped["pgp_keys"],
            "emails": grouped["emails"],
            "bitcoin_wallets": grouped["bitcoin_wallets"],
        }
    )


@entities_bp.route("/node/<node_id>", methods=["GET"])
def resolve_node(node_id: str):
    """Universal polymorphic node detail resolver for Cytoscape clicks."""
    if node_id.startswith("vendor_"):
        try:
            v_id = int(node_id.replace("vendor_", ""))
            return get_vendor_details(v_id)
        except ValueError:
            pass

    if node_id.startswith("pgp_"):
        try:
            p_id = int(node_id.replace("pgp_", ""))
            return get_identity_details(p_id)
        except ValueError:
            pass

    # Generic string match
    search_res = IdentityRepository.search_identities(node_id.split("_", 1)[-1], limit=1)
    if search_res:
        return get_identity_details(search_res[0]["identity_id"])

    return jsonify({"node_id": node_id, "label": node_id, "type": "generic_node"})
