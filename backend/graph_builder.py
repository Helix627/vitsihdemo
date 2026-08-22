"""Backward-compatibility facade for graph_builder module.
Forwards all calls to the modular services.graph_service.GraphService.
"""

from services.graph_service import (
    NODE_STYLES,
    GraphService,
)

GRAPH = GraphService._GRAPH


def load_graph():
    return GraphService.load_graph()


def get_graph_json():
    return GraphService.get_cytoscape_json()


def get_stats():
    return GraphService.get_stats()


def get_vendor_details(vendor_id: int):
    return GraphService.get_vendor_details(vendor_id)


def get_pgp_details(pgp_id: int):
    return GraphService.get_pgp_details(pgp_id)


def get_email_details(email: str):
    return GraphService.get_email_details(email)


def get_bitcoin_details(wallet: str):
    return GraphService.get_bitcoin_details(wallet)


def get_node_details(node_id: str):
    return GraphService.get_node_details(node_id)


def search_graph(query: str):
    return GraphService.search_graph(query)
