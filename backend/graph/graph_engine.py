"""NetworkX Extended Multi-Entity Graph Engine."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Set, Tuple
import networkx as nx
from core.logging import logger
from database.connection import get_db_cursor
from database.repositories.identity_repo import IdentityRepository
from database.repositories.relationship_repo import RelationshipRepository
from database.repositories.vendor_repo import VendorRepository


class NetworkXGraphEngine:
    """
    Maintains an in-memory NetworkX multidigraph supporting 11 node types,
    12 edge types, topology algorithms, and Cytoscape serialization.
    """

    NODE_PALETTE = {
        "vendor": {"color": "#10B981", "shape": "ellipse", "label": "Vendor"},
        "alias": {"color": "#059669", "shape": "round-rectangle", "label": "Alias"},
        "username": {"color": "#8B5CF6", "shape": "hexagon", "label": "Username"},
        "email": {"color": "#0284C7", "shape": "hexagon", "label": "Email"},
        "bitcoin": {"color": "#F59E0B", "shape": "round-rectangle", "label": "Bitcoin Wallet"},
        "pgp": {"color": "#F97316", "shape": "diamond", "label": "PGP Key"},
        "marketplace": {"color": "#EC4899", "shape": "octagon", "label": "Marketplace"},
        "listings": {"color": "#64748B", "shape": "rectangle", "label": "Listing"},
        "product": {"color": "#3B82F6", "shape": "ellipse", "label": "Product"},
        "category": {"color": "#14B8A6", "shape": "round-rectangle", "label": "Category"},
        "shipping_origin": {"color": "#84CC16", "shape": "barrel", "label": "Shipping Origin"},
        "shipping_destination": {"color": "#65A30D", "shape": "triangle", "label": "Shipping Destination"},
    }

    _GRAPH: Optional[nx.Graph] = None
    _ACTIVE_VENDOR_LIMIT: int = 50

    @classmethod
    def get_graph(cls) -> nx.Graph:
        if cls._GRAPH is None:
            cls.build_graph()
        return cls._GRAPH

    @classmethod
    def build_graph(cls, vendor_limit: int = 50, marketplace_filter: Optional[str] = None) -> nx.Graph:
        """
        Construct NetworkX graph from 3NF MySQL database tables.
        Populates Vendors, normalized Identities, Marketplaces, and Relationships.
        """
        logger.info("Building NetworkX multi-entity graph (limit=%d)...", vendor_limit)
        cls._ACTIVE_VENDOR_LIMIT = vendor_limit
        G = nx.Graph()

        # 1. Add Marketplace Nodes
        G.add_node(
            "market_agora",
            label="Agora Marketplace",
            type="marketplace",
            color=cls.NODE_PALETTE["marketplace"]["color"],
            shape=cls.NODE_PALETTE["marketplace"]["shape"],
        )

        # 2. Query Vendors & Mapped Identities
        vendors = VendorRepository.list_vendors(limit=vendor_limit)
        vendor_ids = [v["vendor_id"] for v in vendors]

        if not vendor_ids:
            cls._GRAPH = G
            return G

        for v in vendors:
            v_id = v["vendor_id"]
            node_id = f"vendor_{v_id}"
            v_name = v.get("user_name") or f"Vendor #{v_id}"

            G.add_node(
                node_id,
                label=v_name,
                type="vendor",
                color=cls.NODE_PALETTE["vendor"]["color"],
                shape=cls.NODE_PALETTE["vendor"]["shape"],
                vendor_id=v_id,
                username=v_name,
                market_id=v.get("market_id"),
                detail_url=f"/vendor/{v_id}",
            )

            # Connect vendor to Marketplace
            G.add_edge(node_id, "market_agora", relation="LISTED_ON", type="LISTED", weight=1.0)

            # Query mapped identities
            identities = IdentityRepository.get_identities_for_vendor(v_id)
            for ident in identities:
                itype = ident["identity_type"]
                ival = ident["value"]
                inorm = ident["normalized_value"]
                iid = ident["identity_id"]
                style = cls.NODE_PALETTE.get(itype, cls.NODE_PALETTE["alias"])

                if itype == "email":
                    inode_id = f"email_{inorm}"
                    rel_type = "HAS_EMAIL"
                elif itype == "bitcoin":
                    inode_id = f"btc_{inorm}"
                    rel_type = "HAS_WALLET"
                elif itype == "pgp":
                    inode_id = f"pgp_{iid}"
                    rel_type = "HAS_PGP"
                elif itype == "username":
                    inode_id = f"user_{inorm}"
                    rel_type = "USES"
                else:
                    inode_id = f"alias_{inorm}"
                    rel_type = "USES"

                G.add_node(
                    inode_id,
                    label=ival if len(ival) <= 24 else f"{ival[:10]}...{ival[-8:]}",
                    full_value=ival,
                    type=itype,
                    color=style["color"],
                    shape=style["shape"],
                    identity_id=iid,
                    detail_url=f"/identity/{iid}",
                )

                G.add_edge(node_id, inode_id, relation=rel_type, type=rel_type, weight=float(ident.get("confidence_score", 1.0)))

        # 3. Add Persistent Graph Relationships (SAME_AS, LIKELY_SAME_AS, etc.)
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT r.*, i1.identity_type AS t1, i1.normalized_value AS v1,
                            i2.identity_type AS t2, i2.normalized_value AS v2
                FROM IdentityRelationships r
                JOIN Identities i1 ON r.identity1_id = i1.identity_id
                JOIN Identities i2 ON r.identity2_id = i2.identity_id
                ORDER BY r.weight DESC
                LIMIT 400
                """
            )
            rel_rows = cursor.fetchall()

        for r in rel_rows:
            t1, v1, id1 = r["t1"], r["v1"], r["identity1_id"]
            t2, v2, id2 = r["t2"], r["v2"], r["identity2_id"]

            n1 = f"pgp_{id1}" if t1 == "pgp" else (f"email_{v1}" if t1 == "email" else (f"btc_{v1}" if t1 == "bitcoin" else f"alias_{v1}"))
            n2 = f"pgp_{id2}" if t2 == "pgp" else (f"email_{v2}" if t2 == "email" else (f"btc_{v2}" if t2 == "bitcoin" else f"alias_{v2}"))

            if G.has_node(n1) and G.has_node(n2) and n1 != n2:
                rel_type = r["relationship_type"]
                weight = float(r["weight"])
                G.add_edge(
                    n1,
                    n2,
                    relation=rel_type,
                    type=rel_type,
                    weight=weight,
                    label=f"{int(weight * 100)}%" if weight < 1.0 else rel_type,
                )

        cls._GRAPH = G
        logger.info("NetworkX Graph constructed: %d nodes, %d edges.", G.number_of_nodes(), G.number_of_edges())
        return G
