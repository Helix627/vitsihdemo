"""Cytoscape.js JSON Serializer for NetworkX Graphs."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import networkx as nx
from graph.graph_engine import NetworkXGraphEngine


class CytoscapeSerializer:
    """Serializes NetworkX graph to Cytoscape.js elements JSON format."""

    @classmethod
    def to_cytoscape_json(
        cls,
        min_confidence: float = 0.0,
        marketplace_filter: Optional[str] = None,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Convert graph nodes and edges into Cytoscape format with dynamic filtering."""
        G = NetworkXGraphEngine.get_graph()

        nodes = []
        for node_id, data in G.nodes(data=True):
            node_data = {
                "id": str(node_id),
                "label": str(data.get("label", node_id)),
                "type": str(data.get("type", "unknown")),
                "color": str(data.get("color", "#64748B")),
                "shape": str(data.get("shape", "ellipse")),
                **{k: v for k, v in data.items() if k not in ("color", "shape", "label", "type")},
            }
            nodes.append({"data": node_data})

        edges = []
        for u, v, data in G.edges(data=True):
            weight = float(data.get("weight", 1.0))
            if weight < min_confidence:
                continue

            rel_type = str(data.get("relation") or data.get("type") or "LINKED")
            edge_id = f"e_{u}_{v}_{rel_type}"

            edge_data = {
                "id": edge_id,
                "source": str(u),
                "target": str(v),
                "relation": rel_type,
                "type": rel_type,
                "weight": weight,
                "confidence": weight,
                "label": str(data.get("label", rel_type)),
            }
            edges.append({"data": edge_data})

        return {"nodes": nodes, "edges": edges}
