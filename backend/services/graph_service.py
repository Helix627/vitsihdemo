"""Graph Service: NetworkX graph construction, Cytoscape JSON generation, and graph analytics."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set, Tuple
import networkx as nx

from config import VENDOR_LIMIT
from core.database import get_db_cursor
from core.logging import logger
from repositories.identity_repo import IdentityRepository
from repositories.relationship_repo import RelationshipRepository
from repositories.vendor_repo import VendorRepository

NODE_STYLES = {
    "alias": {"color": "#10B981", "shape": "ellipse", "label_prefix": "Alias"},
    "vendor": {"color": "#10B981", "shape": "ellipse", "label_prefix": "Vendor"},
    "username": {"color": "#8B5CF6", "shape": "hexagon", "label_prefix": "Username"},
    "email": {"color": "#0284C7", "shape": "hexagon", "label_prefix": "Email"},
    "bitcoin": {"color": "#F59E0B", "shape": "round-rectangle", "label_prefix": "Bitcoin"},
    "pgp": {"color": "#F97316", "shape": "diamond", "label_prefix": "PGP"},
}


class GraphService:
    """Manages the in-memory NetworkX graph, topology algorithms, and Cytoscape serialization."""

    _GRAPH: nx.Graph = nx.Graph()
    _COMMUNITIES: List[Set[str]] = []
    _CENTRALITY: Dict[str, float] = {}

    @classmethod
    def get_wallet_type(cls, wallet: str) -> str:
        """Infer Bitcoin address type."""
        if not wallet:
            return "Bitcoin Wallet"
        if wallet.startswith("1"):
            return "Legacy (P2PKH)"
        if wallet.startswith("3"):
            return "Script (P2SH)"
        if wallet.startswith("bc1"):
            return "Native SegWit (Bech32)"
        return "Bitcoin Wallet"

    @classmethod
    def load_graph(cls, vendor_limit: int = VENDOR_LIMIT) -> nx.Graph:
        """Construct heterogeneous graph from normalized 3NF MySQL tables."""
        cls._GRAPH.clear()
        logger.info("Building NetworkX graph from normalized 3NF tables (limit=%s)...", vendor_limit)

        with get_db_cursor() as cursor:
            # 1. Fetch vendors up to limit
            cursor.execute(
                """
                SELECT vendor_id, user_name, market_id, profile, vendor_link
                FROM vendors
                ORDER BY vendor_id ASC
                LIMIT %s
                """,
                (vendor_limit,),
            )
            vendor_rows = cursor.fetchall()
            valid_vendor_ids = {int(r["vendor_id"]) for r in vendor_rows}

            if not valid_vendor_ids:
                logger.warning("No vendors found to build graph.")
                return cls._GRAPH

            # 2. Add Vendor Nodes
            for row in vendor_rows:
                vid = int(row["vendor_id"])
                v_node = f"vendor_{vid}"
                label = row.get("user_name") or f"Vendor {vid}"
                cls._GRAPH.add_node(
                    v_node,
                    type="alias",
                    label=label,
                    vendor_id=vid,
                    user_name=label,
                    market_id=row.get("market_id"),
                    color=NODE_STYLES["alias"]["color"],
                    shape=NODE_STYLES["alias"]["shape"],
                )

            # 3. Fetch mapped identities for these vendors
            format_vids = ",".join(["%s"] * len(valid_vendor_ids))
            cursor.execute(
                f"""
                SELECT
                    vim.vendor_id,
                    vim.identity_id,
                    vim.source_table,
                    vim.confidence_score,
                    i.identity_type,
                    i.value,
                    i.normalized_value
                FROM VendorIdentityMap vim
                JOIN Identities i ON vim.identity_id = i.identity_id
                WHERE vim.vendor_id IN ({format_vids})
                """,
                list(valid_vendor_ids),
            )
            map_rows = cursor.fetchall()

            mapped_identity_ids: Set[int] = set()
            for r in map_rows:
                vid = int(r["vendor_id"])
                iid = int(r["identity_id"])
                mapped_identity_ids.add(iid)
                itype = r["identity_type"]
                val = r["value"]

                # Polymorphic node ID
                if itype == "email":
                    i_node = f"email_{val.lower()}"
                elif itype == "bitcoin":
                    i_node = f"btc_{val}"
                elif itype == "pgp":
                    i_node = f"pgp_{iid}"
                elif itype == "username":
                    i_node = f"user_{val.lower()}"
                else:
                    i_node = f"identity_{iid}"

                style = NODE_STYLES.get(itype, NODE_STYLES["alias"])

                if i_node not in cls._GRAPH:
                    node_attrs = {
                        "type": itype,
                        "label": val,
                        "value": val,
                        "identity_id": iid,
                        "color": style["color"],
                        "shape": style["shape"],
                    }
                    if itype == "email":
                        node_attrs["email"] = val
                        node_attrs["domain"] = val.split("@")[-1] if "@" in val else ""
                    elif itype == "bitcoin":
                        node_attrs["bitcoin_wallet"] = val
                        node_attrs["wallet_type"] = cls.get_wallet_type(val)
                    elif itype == "pgp":
                        node_attrs["fingerprint"] = val
                        node_attrs["pgp_alias"] = val
                    elif itype == "username":
                        node_attrs["username"] = val

                    cls._GRAPH.add_node(i_node, **node_attrs)

                # Link Vendor -> Identity
                v_node = f"vendor_{vid}"
                edge_id = f"{v_node}_{i_node}"
                rel_label = itype.upper()
                relation = (
                    "uses_pgp" if itype == "pgp"
                    else "has_email" if itype == "email"
                    else "has_wallet" if itype == "bitcoin"
                    else "has_username" if itype == "username"
                    else "owns"
                )

                cls._GRAPH.add_edge(
                    v_node,
                    i_node,
                    id=edge_id,
                    relation=relation,
                    label=rel_label,
                    weight=float(r.get("confidence_score") or 1.0),
                )

            # 4. Fetch direct identity-to-identity relationships
            if mapped_identity_ids:
                format_iids = ",".join(["%s"] * len(mapped_identity_ids))
                cursor.execute(
                    f"""
                    SELECT
                        ir.identity1_id,
                        ir.identity2_id,
                        ir.relationship_type,
                        ir.weight,
                        ir.evidence,
                        i1.identity_type AS i1_type,
                        i1.value AS i1_val,
                        i2.identity_type AS i2_type,
                        i2.value AS i2_val
                    FROM IdentityRelationships ir
                    JOIN Identities i1 ON ir.identity1_id = i1.identity_id
                    JOIN Identities i2 ON ir.identity2_id = i2.identity_id
                    WHERE ir.identity1_id IN ({format_iids}) AND ir.identity2_id IN ({format_iids})
                    """,
                    list(mapped_identity_ids) + list(mapped_identity_ids),
                )
                rel_rows = cursor.fetchall()

                for r in rel_rows:
                    t1, v1, id1 = r["i1_type"], r["i1_val"], r["identity1_id"]
                    t2, v2, id2 = r["i2_type"], r["i2_val"], r["identity2_id"]

                    n1 = (
                        f"email_{v1.lower()}" if t1 == "email"
                        else f"btc_{v1}" if t1 == "bitcoin"
                        else f"pgp_{id1}" if t1 == "pgp"
                        else f"user_{v1.lower()}" if t1 == "username"
                        else f"identity_{id1}"
                    )
                    n2 = (
                        f"email_{v2.lower()}" if t2 == "email"
                        else f"btc_{v2}" if t2 == "bitcoin"
                        else f"pgp_{id2}" if t2 == "pgp"
                        else f"user_{v2.lower()}" if t2 == "username"
                        else f"identity_{id2}"
                    )

                    if n1 in cls._GRAPH and n2 in cls._GRAPH and n1 != n2:
                        edge_id = f"{n1}_{n2}"
                        cls._GRAPH.add_edge(
                            n1,
                            n2,
                            id=edge_id,
                            relation=r["relationship_type"],
                            label=r["relationship_type"].replace("_", " ").upper(),
                            weight=float(r.get("weight") or 1.0),
                        )

        # Compute graph analytics
        cls._compute_analytics()
        logger.info(
            "NetworkX graph built: %d nodes, %d edges.",
            cls._GRAPH.number_of_nodes(),
            cls._GRAPH.number_of_edges(),
        )
        return cls._GRAPH

    @classmethod
    def _compute_analytics(cls) -> None:
        """Compute NetworkX degree centralities and community clusters."""
        if not cls._GRAPH or cls._GRAPH.number_of_nodes() == 0:
            cls._CENTRALITY = {}
            cls._COMMUNITIES = []
            return

        # Centrality
        try:
            cls._CENTRALITY = nx.degree_centrality(cls._GRAPH)
        except Exception:
            cls._CENTRALITY = {}

        # Community Detection via Greedy Modularity
        try:
            communities = list(nx.algorithms.community.greedy_modularity_communities(cls._GRAPH))
            cls._COMMUNITIES = [set(c) for c in communities]
        except Exception:
            cls._COMMUNITIES = []

    @classmethod
    def get_cytoscape_json(cls) -> Dict[str, List[Dict[str, Any]]]:
        """Return Cytoscape.js compatible graph JSON."""
        nodes = []
        for node_id, attrs in cls._GRAPH.nodes(data=True):
            node_type = attrs.get("type", "alias")
            node_data: Dict[str, Any] = {
                "id": node_id,
                "label": attrs.get("label", ""),
                "type": node_type,
                "color": attrs.get("color", ""),
                "shape": attrs.get("shape", ""),
                "centrality": round(cls._CENTRALITY.get(node_id, 0.0), 4),
            }

            if node_type in ("alias", "vendor"):
                vendor_id = node_id.split("_", 1)[1] if "_" in node_id else node_id
                node_data["vendor_id"] = int(vendor_id) if str(vendor_id).isdigit() else vendor_id
                node_data["username"] = attrs.get("username", "")
                node_data["alias"] = attrs.get("alias", attrs.get("label", ""))
                node_data["detail_url"] = f"/vendor/{vendor_id}"
            elif node_type == "pgp":
                pgp_id = attrs.get("identity_id", node_id.split("_", 1)[1] if "_" in node_id else node_id)
                node_data["fingerprint"] = attrs.get("fingerprint", "")
                node_data["pgp_alias"] = attrs.get("pgp_alias", "")
                node_data["detail_url"] = f"/pgp/{pgp_id}"
            elif node_type == "email":
                email_val = attrs.get("email", attrs.get("value", ""))
                node_data["email"] = email_val
                node_data["domain"] = attrs.get("domain", "")
                node_data["detail_url"] = f"/email/{email_val}"
            elif node_type == "bitcoin":
                wallet_val = attrs.get("bitcoin_wallet", attrs.get("value", ""))
                node_data["bitcoin_wallet"] = wallet_val
                node_data["wallet_type"] = attrs.get("wallet_type", "")
                node_data["detail_url"] = f"/bitcoin/{wallet_val}"
            elif node_type == "username":
                user_val = attrs.get("username", attrs.get("value", ""))
                node_data["username"] = user_val
                node_data["detail_url"] = f"/search?q={user_val}"

            nodes.append({"data": node_data})

        edges = []
        for source, target, attrs in cls._GRAPH.edges(data=True):
            edge_id = attrs.get("id") or f"{source}_{target}"
            edges.append(
                {
                    "data": {
                        "id": edge_id,
                        "source": source,
                        "target": target,
                        "relation": attrs.get("relation", "linked"),
                        "label": attrs.get("label", ""),
                        "weight": attrs.get("weight", 1.0),
                    }
                }
            )

        return {"nodes": nodes, "edges": edges}

    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        """Return comprehensive graph metrics and statistics."""
        alias_count = sum(1 for _, a in cls._GRAPH.nodes(data=True) if a.get("type") in ("alias", "vendor"))
        username_count = sum(1 for _, a in cls._GRAPH.nodes(data=True) if a.get("type") == "username")
        pgp_count = sum(1 for _, a in cls._GRAPH.nodes(data=True) if a.get("type") == "pgp")
        email_count = sum(1 for _, a in cls._GRAPH.nodes(data=True) if a.get("type") == "email")
        bitcoin_count = sum(1 for _, a in cls._GRAPH.nodes(data=True) if a.get("type") == "bitcoin")

        node_count = cls._GRAPH.number_of_nodes()
        edge_count = cls._GRAPH.number_of_edges()

        connected_components = (
            nx.number_connected_components(cls._GRAPH) if node_count > 0 else 0
        )
        density = nx.density(cls._GRAPH) if node_count > 1 else 0.0

        # Top central nodes
        top_central = sorted(
            [{"id": k, "centrality": round(v, 4), "label": cls._GRAPH.nodes[k].get("label", "")}
             for k, v in cls._CENTRALITY.items()],
            key=lambda x: x["centrality"],
            reverse=True,
        )[:5]

        return {
            "aliases": alias_count,
            "vendors": alias_count,
            "usernames": username_count,
            "pgp_keys": pgp_count,
            "emails": email_count,
            "bitcoin_wallets": bitcoin_count,
            "edges": edge_count,
            "total_nodes": node_count,
            "connected_components": connected_components,
            "density": f"{density:.4f}",
            "communities_count": len(cls._COMMUNITIES),
            "top_central_nodes": top_central,
            "links": {
                "graph": "/graph",
                "search": "/search?q=",
                "statistics": "/statistics",
            },
        }

    @classmethod
    def get_vendor_details(cls, vendor_id: int) -> Optional[Dict[str, Any]]:
        """Return rich details for a vendor including all mapped identities and correlated vendors."""
        vendor = VendorRepository.get_by_id(vendor_id)
        if not vendor:
            return None

        mapped_identities = IdentityRepository.get_identities_for_vendor(vendor_id)

        pgp_keys = []
        emails = []
        bitcoin_wallets = []
        usernames = []
        correlated_vendors_dict: Dict[int, Dict[str, Any]] = {}

        for ident in mapped_identities:
            itype = ident["identity_type"]
            val = ident["value"]
            iid = ident["identity_id"]

            if itype == "pgp":
                pgp_keys.append({
                    "id": f"pgp_{iid}",
                    "identity_id": iid,
                    "label": val[:16] + "..." if len(val) > 16 else val,
                    "fingerprint": val,
                    "detail_url": f"/pgp/{iid}",
                })
            elif itype == "email":
                emails.append({
                    "id": f"email_{val.lower()}",
                    "identity_id": iid,
                    "label": val,
                    "email": val,
                    "domain": val.split("@")[-1] if "@" in val else "",
                    "detail_url": f"/email/{val}",
                })
            elif itype == "bitcoin":
                bitcoin_wallets.append({
                    "id": f"btc_{val}",
                    "identity_id": iid,
                    "label": val,
                    "bitcoin_wallet": val,
                    "wallet_type": cls.get_wallet_type(val),
                    "detail_url": f"/bitcoin/{val}",
                })
            elif itype == "username":
                usernames.append({
                    "id": f"user_{val.lower()}",
                    "identity_id": iid,
                    "label": val,
                    "username": val,
                })

            # Check other vendors sharing this identity
            other_vendors = IdentityRepository.get_vendors_for_identity(iid)
            for ov in other_vendors:
                ovid = int(ov["vendor_id"])
                if ovid != vendor_id:
                    if ovid not in correlated_vendors_dict:
                        correlated_vendors_dict[ovid] = {
                            "id": f"vendor_{ovid}",
                            "vendor_id": ovid,
                            "label": ov.get("user_name") or f"Vendor {ovid}",
                            "detail_url": f"/vendor/{ovid}",
                            "shared_identifiers": [],
                        }
                    correlated_vendors_dict[ovid]["shared_identifiers"].append(f"{itype.upper()}: {val}")

        vendor_node_id = f"vendor_{vendor_id}"
        return {
            "vendor": {
                "id": vendor_node_id,
                "vendor_id": vendor_id,
                "label": vendor.get("user_name") or f"Vendor {vendor_id}",
                "type": "alias",
                "username": usernames[0]["username"] if usernames else (vendor.get("user_name") or ""),
                "alias": vendor.get("user_name") or "",
                "market_id": vendor.get("market_id"),
                "vendor_link": vendor.get("vendor_link"),
                "detail_url": f"/vendor/{vendor_id}",
            },
            "pgp_keys": pgp_keys,
            "emails": emails,
            "bitcoin_wallets": bitcoin_wallets,
            "usernames": usernames,
            "correlated_aliases": list(correlated_vendors_dict.values()),
            "correlated_vendors": list(correlated_vendors_dict.values()),
            "links": {
                "self": f"/vendor/{vendor_id}",
                "graph": "/graph",
            },
        }

    @classmethod
    def get_identity_details(cls, identity_id: int) -> Optional[Dict[str, Any]]:
        """Return generic identity details with connected vendors and graph relationships."""
        ident = IdentityRepository.get_by_id(identity_id)
        if not ident:
            return None

        mapped_vendors = IdentityRepository.get_vendors_for_identity(identity_id)
        relationships = RelationshipRepository.get_relationships_for_identity(identity_id)

        return {
            "identity": {
                "identity_id": ident["identity_id"],
                "identity_type": ident["identity_type"],
                "value": ident["value"],
                "normalized_value": ident["normalized_value"],
                "created_at": str(ident["created_at"]),
                "detail_url": f"/identity/{identity_id}",
            },
            "mapped_vendors": [
                {
                    "vendor_id": v["vendor_id"],
                    "user_name": v["user_name"],
                    "market_id": v["market_id"],
                    "source_table": v["source_table"],
                    "confidence_score": float(v["confidence_score"] or 1.0),
                    "detail_url": f"/vendor/{v['vendor_id']}",
                }
                for v in mapped_vendors
            ],
            "relationships": relationships,
        }

    @classmethod
    def get_pgp_details(cls, pgp_id: int) -> Optional[Dict[str, Any]]:
        """Compatibility resolver for PGP key node details."""
        # Check if pgp_id refers to an Identity
        ident = IdentityRepository.get_by_id(pgp_id)
        if ident and ident["identity_type"] == "pgp":
            vendors = IdentityRepository.get_vendors_for_identity(pgp_id)
            return {
                "pgp": {
                    "id": f"pgp_{pgp_id}",
                    "identity_id": pgp_id,
                    "label": ident["value"][:16] + "...",
                    "type": "pgp",
                    "fingerprint": ident["value"],
                    "pgp_alias": ident["value"],
                    "detail_url": f"/pgp/{pgp_id}",
                },
                "aliases": [
                    {
                        "id": f"vendor_{v['vendor_id']}",
                        "vendor_id": v["vendor_id"],
                        "label": v["user_name"],
                        "detail_url": f"/vendor/{v['vendor_id']}",
                    }
                    for v in vendors
                ],
                "vendors": [
                    {
                        "id": f"vendor_{v['vendor_id']}",
                        "vendor_id": v["vendor_id"],
                        "label": v["user_name"],
                        "detail_url": f"/vendor/{v['vendor_id']}",
                    }
                    for v in vendors
                ],
                "links": {"self": f"/pgp/{pgp_id}", "graph": "/graph"},
            }

        # Fallback to search by fingerprint if id was from legacy table
        with get_db_cursor() as cursor:
            cursor.execute("SELECT fingerprint, alias FROM vendor_pgp_keys WHERE id = %s", (pgp_id,))
            row = cursor.fetchone()
            if row and row.get("fingerprint"):
                id_match = IdentityRepository.get_by_type_and_normalized_val(
                    "pgp", row["fingerprint"].upper().replace(" ", "")
                )
                if id_match:
                    return cls.get_pgp_details(id_match["identity_id"])

        return None

    @classmethod
    def get_email_details(cls, email: str) -> Optional[Dict[str, Any]]:
        """Compatibility resolver for Email node details."""
        clean = email.strip().lower()
        ident = IdentityRepository.get_by_type_and_normalized_val("email", clean)
        if not ident:
            return None

        vendors = IdentityRepository.get_vendors_for_identity(ident["identity_id"])
        email_val = ident["value"]

        return {
            "email": {
                "id": f"email_{email_val.lower()}",
                "identity_id": ident["identity_id"],
                "label": email_val,
                "type": "email",
                "email": email_val,
                "domain": email_val.split("@")[-1] if "@" in email_val else "",
                "detail_url": f"/email/{email_val}",
            },
            "aliases": [
                {
                    "id": f"vendor_{v['vendor_id']}",
                    "vendor_id": v["vendor_id"],
                    "label": v["user_name"],
                    "detail_url": f"/vendor/{v['vendor_id']}",
                }
                for v in vendors
            ],
            "vendors": [
                {
                    "id": f"vendor_{v['vendor_id']}",
                    "vendor_id": v["vendor_id"],
                    "label": v["user_name"],
                    "detail_url": f"/vendor/{v['vendor_id']}",
                }
                for v in vendors
            ],
            "links": {"self": f"/email/{email_val}", "graph": "/graph"},
        }

    @classmethod
    def get_bitcoin_details(cls, wallet: str) -> Optional[Dict[str, Any]]:
        """Compatibility resolver for Bitcoin wallet node details."""
        clean = wallet.strip()
        ident = IdentityRepository.get_by_type_and_normalized_val("bitcoin", clean)
        if not ident:
            return None

        vendors = IdentityRepository.get_vendors_for_identity(ident["identity_id"])
        wallet_val = ident["value"]

        return {
            "bitcoin": {
                "id": f"btc_{wallet_val}",
                "identity_id": ident["identity_id"],
                "label": wallet_val,
                "type": "bitcoin",
                "bitcoin_wallet": wallet_val,
                "wallet_type": cls.get_wallet_type(wallet_val),
                "detail_url": f"/bitcoin/{wallet_val}",
            },
            "aliases": [
                {
                    "id": f"vendor_{v['vendor_id']}",
                    "vendor_id": v["vendor_id"],
                    "label": v["user_name"],
                    "detail_url": f"/vendor/{v['vendor_id']}",
                }
                for v in vendors
            ],
            "vendors": [
                {
                    "id": f"vendor_{v['vendor_id']}",
                    "vendor_id": v["vendor_id"],
                    "label": v["user_name"],
                    "detail_url": f"/vendor/{v['vendor_id']}",
                }
                for v in vendors
            ],
            "links": {"self": f"/bitcoin/{wallet_val}", "graph": "/graph"},
        }

    @classmethod
    def get_node_details(cls, node_id: str) -> Optional[Dict[str, Any]]:
        """Universal polymorphic node detail resolver."""
        if node_id.startswith("vendor_"):
            vid = node_id.split("_", 1)[1]
            return cls.get_vendor_details(int(vid)) if str(vid).isdigit() else None
        elif node_id.startswith("pgp_"):
            pid = node_id.split("_", 1)[1]
            return cls.get_pgp_details(int(pid)) if str(pid).isdigit() else None
        elif node_id.startswith("email_"):
            email_val = node_id.split("_", 1)[1]
            return cls.get_email_details(email_val)
        elif node_id.startswith("btc_"):
            wallet_val = node_id.split("_", 1)[1]
            return cls.get_bitcoin_details(wallet_val)
        elif node_id.startswith("identity_"):
            iid = node_id.split("_", 1)[1]
            return cls.get_identity_details(int(iid)) if str(iid).isdigit() else None
        return None

    @classmethod
    def search_graph(cls, query: str) -> Dict[str, List[Dict[str, Any]]]:
        """Search across vendor aliases and all identity types (PGP, Email, Bitcoin, Username)."""
        text = (query or "").strip()
        if not text:
            return {
                "aliases": [],
                "vendors": [],
                "pgp_keys": [],
                "emails": [],
                "bitcoin_wallets": [],
                "usernames": [],
            }

        vendor_matches = VendorRepository.search(text, limit=20)
        identity_matches = IdentityRepository.search(text, limit=40)

        aliases = [
            {
                "id": f"vendor_{v['vendor_id']}",
                "label": v.get("user_name") or f"Vendor {v['vendor_id']}",
                "type": "alias",
                "vendor_id": v["vendor_id"],
                "detail_url": f"/vendor/{v['vendor_id']}",
            }
            for v in vendor_matches
        ]

        pgp_keys = []
        emails = []
        bitcoin_wallets = []
        usernames = []

        for item in identity_matches:
            itype = item["identity_type"]
            val = item["value"]
            iid = item["identity_id"]

            if itype == "pgp":
                pgp_keys.append({
                    "id": f"pgp_{iid}",
                    "label": val[:16] + "...",
                    "type": "pgp",
                    "fingerprint": val,
                    "detail_url": f"/pgp/{iid}",
                })
            elif itype == "email":
                emails.append({
                    "id": f"email_{val.lower()}",
                    "label": val,
                    "type": "email",
                    "email": val,
                    "detail_url": f"/email/{val}",
                })
            elif itype == "bitcoin":
                bitcoin_wallets.append({
                    "id": f"btc_{val}",
                    "label": val,
                    "type": "bitcoin",
                    "bitcoin_wallet": val,
                    "detail_url": f"/bitcoin/{val}",
                })
            elif itype == "username":
                usernames.append({
                    "id": f"user_{val.lower()}",
                    "label": val,
                    "type": "username",
                    "username": val,
                    "detail_url": f"/identity/{iid}",
                })

        return {
            "aliases": aliases,
            "vendors": aliases,
            "pgp_keys": pgp_keys,
            "emails": emails,
            "bitcoin_wallets": bitcoin_wallets,
            "usernames": usernames,
        }
