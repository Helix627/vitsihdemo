"""NetworkX Extended Multi-Entity Knowledge Graph Engine with Continuous Evolution."""

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
    Maintains an in-memory NetworkX multidigraph supporting 16 node types,
    14 edge types, pending analyst review suggestions, and Cytoscape serialization.
    """

    NODE_PALETTE = {
        "vendor": {"color": "#10B981", "shape": "ellipse", "label": "Vendor"},
        "alias": {"color": "#059669", "shape": "round-rectangle", "label": "Alias"},
        "username": {"color": "#8B5CF6", "shape": "hexagon", "label": "Username"},
        "email": {"color": "#0284C7", "shape": "hexagon", "label": "Email"},
        "bitcoin": {"color": "#F59E0B", "shape": "round-rectangle", "label": "Bitcoin Wallet"},
        "monero": {"color": "#EA580C", "shape": "round-rectangle", "label": "Monero Wallet"},
        "pgp": {"color": "#F97316", "shape": "diamond", "label": "PGP Key"},
        "telegram": {"color": "#06B6D4", "shape": "round-rectangle", "label": "Telegram Handle"},
        "discord": {"color": "#6366F1", "shape": "round-rectangle", "label": "Discord Tag"},
        "forum_handle": {"color": "#64748B", "shape": "hexagon", "label": "Forum Account"},
        "onion": {"color": "#D946EF", "shape": "barrel", "label": "Onion Hidden Service"},
        "origin_ip": {"color": "#EF4444", "shape": "round-rectangle", "label": "Clearnet Origin IP"},
        "marketplace": {"color": "#EC4899", "shape": "octagon", "label": "Marketplace"},
        "listings": {"color": "#64748B", "shape": "rectangle", "label": "Listing"},
        "listing_url": {"color": "#475569", "shape": "rectangle", "label": "Listing URL"},
        "product": {"color": "#3B82F6", "shape": "ellipse", "label": "Product"},
        "category": {"color": "#14B8A6", "shape": "round-rectangle", "label": "Category"},
        "shipping_origin": {"color": "#84CC16", "shape": "barrel", "label": "Shipping Origin"},
        "shipping_destination": {"color": "#65A30D", "shape": "triangle", "label": "Shipping Destination"},
    }

    MARKET_NODES = {
        1: {"id": "market_agora", "label": "Agora Marketplace"},
        2: {"id": "market_pandora", "label": "Pandora Marketplace"},
        5: {"id": "market_nucleus", "label": "Nucleus Marketplace"},
        6: {"id": "market_evolution", "label": "Evolution Marketplace"},
        7: {"id": "market_abraxas", "label": "Abraxas Marketplace"},
        17: {"id": "market_mango", "label": "Mango Marketplace"},
        19: {"id": "market_outlaw", "label": "Outlaw Marketplace"},
        21: {"id": "market_silkkitie", "label": "Silkkitie Marketplace"},
        23: {"id": "market_tochka", "label": "Tochka Marketplace"},
        60: {"id": "market_hansa", "label": "Hansa Marketplace"},
        65: {"id": "market_alphabay", "label": "AlphaBay Marketplace"},
        67: {"id": "market_wallstreet", "label": "WallStreet Marketplace"},
        101: {"id": "market_shadowbay", "label": "ShadowBay Marketplace"},
        102: {"id": "market_nightmarket", "label": "NightMarket Marketplace"},
    }

    _GRAPH: Optional[nx.Graph] = None
    _ACTIVE_VENDOR_LIMIT: int = 60
    _START_TS: Optional[int] = None
    _END_TS: Optional[int] = None

    @classmethod
    def get_graph(cls) -> nx.Graph:
        if cls._GRAPH is None:
            cls.build_graph()
        return cls._GRAPH

    @classmethod
    def _get_or_create_market_node(cls, G: nx.Graph, market_id: int) -> str:
        """Ensures a marketplace hub node exists in G and returns its node ID."""
        m_meta = cls.MARKET_NODES.get(market_id)
        if not m_meta:
            m_name = VendorRepository.MARKET_NAMES.get(market_id, f"Market #{market_id}")
            m_meta = {"id": f"market_{market_id}", "label": f"{m_name} Marketplace"}

        m_id_str = m_meta["id"]
        if not G.has_node(m_id_str):
            G.add_node(
                m_id_str,
                label=m_meta["label"],
                type="marketplace",
                market_id=market_id,
                color=cls.NODE_PALETTE["marketplace"]["color"],
                shape=cls.NODE_PALETTE["marketplace"]["shape"],
            )
        return m_id_str

    @classmethod
    def build_graph(
        cls,
        vendor_limit: int = 60,
        marketplace_filter: Optional[str] = None,
        start_ts: Optional[int] = None,
        end_ts: Optional[int] = None,
    ) -> nx.Graph:
        """
        Construct NetworkX graph from MySQL database tables including
        evolved intelligence, corroborated credentials, and pending suggestions.
        Optional start_ts / end_ts (UNIX timestamps) filter vendors by their
        `added` field for temporal range analysis (Phase 4).
        """
        logger.info("Building NetworkX multi-entity knowledge graph (limit=%d)...", vendor_limit)
        cls._ACTIVE_VENDOR_LIMIT = vendor_limit
        cls._START_TS = start_ts
        cls._END_TS = end_ts
        G = nx.Graph()

        # 1. Add Primary Marketplace Hub Nodes
        for m_id in [1, 101, 102]:
            cls._get_or_create_market_node(G, m_id)

        # 2. Query Cross-Marketplace Vendor Sample + Recent Submissions
        limit_per_mkt = max(10, vendor_limit // 3)
        base_vendors = VendorRepository.list_cross_market_sample(
            limit_per_market=limit_per_mkt,
            start_ts=start_ts,
            end_ts=end_ts,
        )

        # Build map of all active vendors, expanding cross-marketplace counterparts
        # Hard cap: at most 3 counterparts per base vendor; total vendors capped at vendor_limit * 2
        vendor_map: Dict[int, Dict[str, Any]] = {v["vendor_id"]: v for v in base_vendors}
        MAX_CROSS_EXPAND = vendor_limit * 2
        for v in list(base_vendors):
            if len(vendor_map) >= MAX_CROSS_EXPAND:
                break
            v_id = v["vendor_id"]
            cross_links = VendorRepository.get_cross_market_links(v_id)
            for link in cross_links[:3]:  # max 3 counterparts per vendor
                l_vid = link["vendor_id"]
                if l_vid not in vendor_map and len(vendor_map) < MAX_CROSS_EXPAND:
                    l_v = VendorRepository.get_by_id(l_vid)
                    if l_v:
                        vendor_map[l_vid] = l_v

        vendors = list(vendor_map.values())
        vendor_ids = list(vendor_map.keys())

        if not vendor_ids:
            cls._GRAPH = G
            return G

        active_ident_ids: Set[int] = set()

        for v in vendors:
            v_id = v["vendor_id"]
            node_id = f"vendor_{v_id}"
            v_name = v.get("user_name") or f"Vendor #{v_id}"
            m_id = v.get("market_id") or 1
            mkt_target = cls._get_or_create_market_node(G, m_id)

            G.add_node(
                node_id,
                label=v_name,
                type="vendor",
                color=cls.NODE_PALETTE["vendor"]["color"],
                shape=cls.NODE_PALETTE["vendor"]["shape"],
                vendor_id=v_id,
                username=v_name,
                market_id=m_id,
                detail_url=f"/vendor/{v_id}",
            )

            # Connect vendor to its respective Marketplace
            G.add_edge(node_id, mkt_target, relation="LISTED_ON", type="LISTED", weight=1.0)

            # Query mapped identities
            identities = IdentityRepository.get_identities_for_vendor(v_id)
            for ident in identities:
                itype = ident["identity_type"]
                ival = ident["value"]
                inorm = ident["normalized_value"]
                iid = ident["identity_id"]
                active_ident_ids.add(iid)
                style = cls.NODE_PALETTE.get(itype, cls.NODE_PALETTE["alias"])

                # Display label formatting
                disp_label = inorm if len(inorm) <= 22 else f"{inorm[:10]}...{inorm[-8:]}"

                ident_node_id = f"ident_{iid}"
                if not G.has_node(ident_node_id):
                    G.add_node(
                        ident_node_id,
                        label=disp_label,
                        full_value=ival,
                        normalized_value=inorm,
                        type=itype,
                        color=style["color"],
                        shape=style["shape"],
                        identity_id=iid,
                        detail_url=f"/entity/{iid}",
                    )

                # Edge from Vendor to Identity
                edge_rel = f"HAS_{itype.upper()}" if itype in ("email", "bitcoin", "monero", "pgp") else ("OWNS" if itype == "alias" else "USES")
                G.add_edge(node_id, ident_node_id, relation=edge_rel, type=edge_rel, weight=1.0)

        # 3. Query Persistent Relationships (SAME_AS, LIKELY_SAME_AS)
        if active_ident_ids:
            relationships = RelationshipRepository.get_relationships_between(list(active_ident_ids))
            for rel in relationships:
                src = f"ident_{rel['identity1_id']}"
                tgt = f"ident_{rel['identity2_id']}"
                rtype = rel.get("relationship_type") or "SAME_AS"
                weight = float(rel.get("weight") or 1.0)

                if G.has_node(src) and G.has_node(tgt):
                    G.add_edge(
                        src,
                        tgt,
                        relation=rtype,
                        type=rtype,
                        weight=weight,
                        confidence=weight,
                        evidence=rel.get("evidence"),
                    )

        # 4. Query Pending Analyst Suggestions (Dashed Orange Edges)
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT s.*,
                       (SELECT vim.identity_id FROM vendoridentitymap vim JOIN identities i ON vim.identity_id = i.identity_id WHERE vim.vendor_id = s.source_vendor_id AND i.identity_type = 'alias' LIMIT 1) as src_alias_id,
                       (SELECT vim.identity_id FROM vendoridentitymap vim JOIN identities i ON vim.identity_id = i.identity_id WHERE vim.vendor_id = s.target_vendor_id AND i.identity_type = 'alias' LIMIT 1) as tgt_alias_id
                FROM identity_suggestions s
                WHERE s.status = 'PENDING'
                ORDER BY s.created_at DESC
                LIMIT 30;
                """
            )
            suggestions = cursor.fetchall()
            for sugg in suggestions:
                src_aid = sugg.get("src_alias_id")
                tgt_aid = sugg.get("tgt_alias_id")
                if src_aid and tgt_aid:
                    src_node = f"ident_{src_aid}"
                    tgt_node = f"ident_{tgt_aid}"
                    if G.has_node(src_node) and G.has_node(tgt_node):
                        G.add_edge(
                            src_node,
                            tgt_node,
                            relation="SUGGESTION",
                            type="SUGGESTION",
                            weight=float(sugg["confidence"]),
                            confidence=float(sugg["confidence"]),
                            suggestion_id=sugg["suggestion_id"],
                            decision_label=sugg["decision_label"],
                            status="PENDING",
                        )

        logger.info("Knowledge Graph constructed: %d nodes, %d edges.", G.number_of_nodes(), G.number_of_edges())
        cls._GRAPH = G
        return G

    @classmethod
    def ensure_node_in_graph(cls, node_id: str) -> bool:
        """Ensure a vendor or identity node and its immediate neighbors are in the graph."""
        G = cls.get_graph()
        if G.has_node(node_id):
            return True

        if node_id.startswith("vendor_"):
            try:
                v_id = int(node_id.replace("vendor_", ""))
                vendor = VendorRepository.get_vendor_by_id(v_id)
                if not vendor:
                    return False
                v_name = vendor.get("user_name") or f"Vendor #{v_id}"
                m_id = vendor.get("market_id") or 1
                mkt_target = cls._get_or_create_market_node(G, m_id)

                G.add_node(
                    node_id,
                    label=v_name,
                    type="vendor",
                    color=cls.NODE_PALETTE["vendor"]["color"],
                    shape=cls.NODE_PALETTE["vendor"]["shape"],
                    vendor_id=v_id,
                    username=v_name,
                    market_id=m_id,
                    detail_url=f"/vendor/{v_id}",
                )
                G.add_edge(node_id, mkt_target, relation="LISTED_ON", type="LISTED", weight=1.0)

                # Add its identities
                identities = IdentityRepository.get_identities_for_vendor(v_id)
                for ident in identities:
                    itype = ident["identity_type"]
                    ival = ident["value"]
                    inorm = ident["normalized_value"]
                    iid = ident["identity_id"]
                    style = cls.NODE_PALETTE.get(itype, cls.NODE_PALETTE["alias"])
                    disp_label = inorm if len(inorm) <= 22 else f"{inorm[:10]}...{inorm[-8:]}"
                    ident_node_id = f"ident_{iid}"
                    if not G.has_node(ident_node_id):
                        G.add_node(
                            ident_node_id,
                            label=disp_label,
                            full_value=ival,
                            normalized_value=inorm,
                            type=itype,
                            color=style["color"],
                            shape=style["shape"],
                            identity_id=iid,
                            detail_url=f"/entity/{iid}",
                        )
                    edge_rel = f"HAS_{itype.upper()}" if itype in ("email", "bitcoin", "monero", "pgp") else ("OWNS" if itype == "alias" else "USES")
                    G.add_edge(node_id, ident_node_id, relation=edge_rel, type=edge_rel, weight=1.0)
                return True
            except Exception as err:
                logger.error("Failed adding vendor node %s to graph: %s", node_id, err)
                return False

        elif node_id.startswith("ident_"):
            try:
                iid = int(node_id.replace("ident_", ""))
                ident = IdentityRepository.get_identity_by_id(iid)
                if not ident:
                    return False
                itype = ident["identity_type"]
                ival = ident["value"]
                inorm = ident["normalized_value"]
                style = cls.NODE_PALETTE.get(itype, cls.NODE_PALETTE["alias"])
                disp_label = inorm if len(inorm) <= 22 else f"{inorm[:10]}...{inorm[-8:]}"

                G.add_node(
                    node_id,
                    label=disp_label,
                    full_value=ival,
                    normalized_value=inorm,
                    type=itype,
                    color=style["color"],
                    shape=style["shape"],
                    identity_id=iid,
                    detail_url=f"/entity/{iid}",
                )

                # Connect to mapped vendor(s)
                with get_db_cursor() as cursor:
                    cursor.execute("SELECT vendor_id FROM vendoridentitymap WHERE identity_id = %s;", (iid,))
                    rows = cursor.fetchall()
                    for r in rows:
                        v_id = r["vendor_id"]
                        v_node = f"vendor_{v_id}"
                        cls.ensure_node_in_graph(v_node)
                        edge_rel = f"HAS_{itype.upper()}" if itype in ("email", "bitcoin", "monero", "pgp") else ("OWNS" if itype == "alias" else "USES")
                        G.add_edge(v_node, node_id, relation=edge_rel, type=edge_rel, weight=1.0)
                return True
            except Exception as err:
                logger.error("Failed adding identity node %s to graph: %s", node_id, err)
                return False

        return False
