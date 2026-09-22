"""Search REST API Blueprints."""

from flask import Blueprint, jsonify, request
from database.repositories.identity_repo import IdentityRepository
from database.repositories.vendor_repo import VendorRepository

search_bp = Blueprint("search_bp", __name__)


@search_bp.route("/search", methods=["GET"])
def search_entities():
    """Global search across vendors, aliases, usernames, PGP keys, emails, crypto wallets, and social tags."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({
            "vendors": [],
            "aliases": [],
            "usernames": [],
            "pgp_keys": [],
            "emails": [],
            "bitcoin_wallets": [],
            "monero_wallets": [],
            "telegram_handles": [],
            "discord_handles": [],
        })

    limit = request.args.get("limit", default=10, type=int)

    vendors = VendorRepository.search_vendors(query, limit=limit * 3)
    aliases = IdentityRepository.search_identities(query, identity_type="alias", limit=limit)
    usernames = IdentityRepository.search_identities(query, identity_type="username", limit=limit)
    pgp_keys = IdentityRepository.search_identities(query, identity_type="pgp", limit=limit)
    emails = IdentityRepository.search_identities(query, identity_type="email", limit=limit)
    btc_wallets = IdentityRepository.search_identities(query, identity_type="bitcoin", limit=limit)
    xmr_wallets = IdentityRepository.search_identities(query, identity_type="monero", limit=limit)
    telegram = IdentityRepository.search_identities(query, identity_type="telegram", limit=limit)
    discord = IdentityRepository.search_identities(query, identity_type="discord", limit=limit)

    # Consolidate vendor personas by normalized username across all marketplaces
    grouped_vendors = {}
    for v in vendors:
        key = (v.get("user_name") or "").strip().lower()
        if not key:
            continue
        v_id = v["vendor_id"]
        m_name = v.get("marketplace_name") or f"Market #{v.get('market_id')}"
        if key not in grouped_vendors:
            grouped_vendors[key] = {
                "user_name": v["user_name"],
                "primary_vendor_id": v_id,
                "vendor_ids": [v_id],
                "node_ids": [f"vendor_{v_id}"],
                "marketplaces": [m_name],
                "market_ids": [v.get("market_id")],
            }
        else:
            if v_id not in grouped_vendors[key]["vendor_ids"]:
                grouped_vendors[key]["vendor_ids"].append(v_id)
                grouped_vendors[key]["node_ids"].append(f"vendor_{v_id}")
            if m_name not in grouped_vendors[key]["marketplaces"]:
                grouped_vendors[key]["marketplaces"].append(m_name)
            if v.get("market_id") not in grouped_vendors[key]["market_ids"]:
                grouped_vendors[key]["market_ids"].append(v.get("market_id"))

    # Augment with cross-marketplace counterpart accounts
    for key, g in list(grouped_vendors.items()):
        try:
            links = VendorRepository.get_cross_market_links(g["primary_vendor_id"])
            for l in links:
                l_vname = (l.get("user_name") or "").strip().lower()
                if l_vname == key:
                    l_vid = l["vendor_id"]
                    if l_vid not in g["vendor_ids"]:
                        g["vendor_ids"].append(l_vid)
                        g["node_ids"].append(f"vendor_{l_vid}")
                    l_mname = l.get("marketplace_name")
                    if l_mname and l_mname not in g["marketplaces"]:
                        g["marketplaces"].append(l_mname)
        except Exception:
            pass

    unified_vendors = []
    for g in list(grouped_vendors.values()):
        mkt_list = g["marketplaces"]
        if len(mkt_list) > 1:
            market_summary = f"{', '.join(mkt_list)} ({len(mkt_list)} marketplaces)"
        elif len(mkt_list) == 1:
            market_summary = mkt_list[0]
        else:
            market_summary = "Darknet Market"

        unified_vendors.append({
            "id": f"vendor_{g['primary_vendor_id']}",
            "vendor_id": g["primary_vendor_id"],
            "primary_vendor_id": g["primary_vendor_id"],
            "vendor_ids": g["vendor_ids"],
            "node_ids": g["node_ids"],
            "label": g["user_name"],
            "username": g["user_name"],
            "marketplaces": mkt_list,
            "market_summary": market_summary,
            "type": "vendor",
            "detail_url": f"/vendor/{g['primary_vendor_id']}",
        })

    # Sort vendors: exact matches first, prefix matches second, then by number of marketplaces
    query_lower = query.lower()
    unified_vendors.sort(key=lambda x: (
        0 if x["username"].lower() == query_lower else (1 if x["username"].lower().startswith(query_lower) else 2),
        -len(x["marketplaces"])
    ))
    unified_vendors = unified_vendors[:limit]

    # Filter out duplicate aliases that have the exact same name as an already returned vendor persona
    vendor_names = set(grouped_vendors.keys())
    clean_aliases = [
        {
            "id": f"ident_{a['identity_id']}",
            "identity_id": a["identity_id"],
            "label": a["value"],
            "type": "alias",
            "normalized_value": a["normalized_value"],
            "detail_url": f"/identity/{a['identity_id']}",
        }
        for a in aliases
        if a["value"].strip().lower() not in vendor_names
    ]

    return jsonify(
        {
            "query": query,
            "vendors": unified_vendors,
            "aliases": clean_aliases,
            "usernames": [{"id": f"ident_{u['identity_id']}", "identity_id": u["identity_id"], "label": u["value"], "type": "username", "normalized_value": u["normalized_value"], "detail_url": f"/identity/{u['identity_id']}"} for u in usernames],
            "pgp_keys": [{"id": f"ident_{p['identity_id']}", "identity_id": p["identity_id"], "label": f"{p['value'][:12]}...{p['value'][-8:]}", "type": "pgp", "normalized_value": p["normalized_value"], "detail_url": f"/identity/{p['identity_id']}"} for p in pgp_keys],
            "emails": [{"id": f"ident_{e['identity_id']}", "identity_id": e["identity_id"], "label": e["value"], "type": "email", "normalized_value": e["normalized_value"], "detail_url": f"/identity/{e['identity_id']}"} for e in emails],
            "bitcoin_wallets": [{"id": f"ident_{w['identity_id']}", "identity_id": w["identity_id"], "label": w["value"], "type": "bitcoin", "normalized_value": w["normalized_value"], "detail_url": f"/identity/{w['identity_id']}"} for w in btc_wallets],
            "monero_wallets": [{"id": f"ident_{x['identity_id']}", "identity_id": x["identity_id"], "label": f"{x['value'][:12]}...{x['value'][-8:]}", "type": "monero", "normalized_value": x["normalized_value"], "detail_url": f"/identity/{x['identity_id']}"} for x in xmr_wallets],
            "telegram_handles": [{"id": f"ident_{t['identity_id']}", "identity_id": t["identity_id"], "label": t["value"], "type": "telegram", "normalized_value": t["normalized_value"], "detail_url": f"/identity/{t['identity_id']}"} for t in telegram],
            "discord_handles": [{"id": f"ident_{d['identity_id']}", "identity_id": d["identity_id"], "label": d["value"], "type": "discord", "normalized_value": d["normalized_value"], "detail_url": f"/identity/{d['identity_id']}"} for d in discord],
        }
    )

