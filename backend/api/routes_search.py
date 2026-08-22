"""Search REST API Blueprints."""

from flask import Blueprint, jsonify, request
from database.repositories.identity_repo import IdentityRepository
from database.repositories.vendor_repo import VendorRepository

search_bp = Blueprint("search_bp", __name__)


@search_bp.route("/search", methods=["GET"])
def search_entities():
    """Global search across vendors, aliases, usernames, PGP keys, emails, and bitcoin wallets."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"aliases": [], "vendors": [], "usernames": [], "pgp_keys": [], "emails": [], "bitcoin_wallets": []})

    limit = request.args.get("limit", default=10, type=int)

    vendors = VendorRepository.search_vendors(query, limit=limit)
    aliases = IdentityRepository.search_identities(query, identity_type="alias", limit=limit)
    usernames = IdentityRepository.search_identities(query, identity_type="username", limit=limit)
    pgp_keys = IdentityRepository.search_identities(query, identity_type="pgp", limit=limit)
    emails = IdentityRepository.search_identities(query, identity_type="email", limit=limit)
    wallets = IdentityRepository.search_identities(query, identity_type="bitcoin", limit=limit)

    return jsonify(
        {
            "query": query,
            "vendors": [{"id": f"vendor_{v['vendor_id']}", "vendor_id": v["vendor_id"], "label": v["user_name"], "type": "vendor", "detail_url": f"/vendor/{v['vendor_id']}"} for v in vendors],
            "aliases": [{"id": f"ident_{a['identity_id']}", "identity_id": a["identity_id"], "label": a["value"], "type": "alias", "normalized_value": a["normalized_value"], "detail_url": f"/identity/{a['identity_id']}"} for a in aliases],
            "usernames": [{"id": f"ident_{u['identity_id']}", "identity_id": u["identity_id"], "label": u["value"], "type": "username", "normalized_value": u["normalized_value"], "detail_url": f"/identity/{u['identity_id']}"} for u in usernames],
            "pgp_keys": [{"id": f"ident_{p['identity_id']}", "identity_id": p["identity_id"], "label": f"{p['value'][:12]}...{p['value'][-8:]}", "type": "pgp", "normalized_value": p["normalized_value"], "detail_url": f"/identity/{p['identity_id']}"} for p in pgp_keys],
            "emails": [{"id": f"ident_{e['identity_id']}", "identity_id": e["identity_id"], "label": e["value"], "type": "email", "normalized_value": e["normalized_value"], "detail_url": f"/identity/{e['identity_id']}"} for e in emails],
            "bitcoin_wallets": [{"id": f"ident_{w['identity_id']}", "identity_id": w["identity_id"], "label": w["value"], "type": "bitcoin", "normalized_value": w["normalized_value"], "detail_url": f"/identity/{w['identity_id']}"} for w in wallets],
        }
    )
