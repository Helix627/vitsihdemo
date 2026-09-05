"""Flask Application Factory and Server Entrypoint for CTI Platform."""

from flask import Flask, jsonify
from flask_cors import CORS

from api.routes_analysis import analysis_bp
from api.routes_autonomous import autonomous_bp
from api.routes_entities import entities_bp
from api.routes_evolution import evolution_bp
from api.routes_export import export_bp
from api.routes_graph import graph_bp
from api.routes_infrastructure import infrastructure_bp
from api.routes_resolution import resolution_bp
from api.routes_search import search_bp
from api.routes_timeline import timeline_bp
from config import DEBUG, SERVER_HOST, SERVER_PORT
from database.connection import init_connection_pool
from core.logging import logger
from graph.graph_engine import NetworkXGraphEngine
from services.autonomous_collector import AutonomousCollector
from services.embedding_service import EmbeddingService
from services.infrastructure_service import InfrastructureService
from services.stylometric_service import StylometricEngine


def create_app() -> Flask:
    """Assemble and configure the Flask REST application."""
    app = Flask(__name__)
    CORS(app)

    # Register blueprints
    app.register_blueprint(graph_bp)
    app.register_blueprint(entities_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(resolution_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(evolution_bp)
    app.register_blueprint(infrastructure_bp)
    app.register_blueprint(timeline_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(autonomous_bp)

    @app.route("/", methods=["GET"])
    def home():
        """Health check endpoint."""
        return "Identity Resolution Backend Running"

    return app


app = create_app()


def startup():
    """Pre-flight warmup: initialize DB pool, build NetworkX graph, load stylometric signatures, and start autonomous collector."""
    logger.info("Initializing CTI Platform backend services...")
    init_connection_pool()
    NetworkXGraphEngine.build_graph()
    StylometricEngine.initialize_from_csv()
    InfrastructureService.initialize_from_json()
    AutonomousCollector.get_instance().start()
    logger.info("CTI Platform backend initialization complete.")


if __name__ == "__main__":
    startup()
    app.run(host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG)
