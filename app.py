import logging
import sys

from flask import Flask, request

from backend.config import get_log_level
from backend.api.rewrite_routes import rewrite_bp
from backend.api.resume_routes import resume_bp
from backend.api.jobs_routes import jobs_bp


def create_app() -> Flask:
    logger = logging.getLogger(__name__)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        logger.addHandler(handler)
    logger.setLevel(getattr(logging, get_log_level()))

    app = Flask(__name__)
    app.register_blueprint(rewrite_bp, url_prefix="/api")
    app.register_blueprint(resume_bp, url_prefix="/api")
    app.register_blueprint(jobs_bp, url_prefix="/api")

    @app.after_request
    def log_request(response):
        logger.info("%s %s → %s", request.method, request.path, response.status_code)
        return response

    return app
