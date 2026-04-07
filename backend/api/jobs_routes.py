from __future__ import annotations

from flask import Blueprint, request, jsonify

from backend.api.jobs import handle

jobs_bp = Blueprint("jobs_bp", __name__)


@jobs_bp.route("/jobs/parse", methods=["POST"])
def post_jobs_parse():
    body = request.get_json(force=False, silent=True)
    response_dict, status_code = handle(body)
    return jsonify(response_dict), status_code
