from __future__ import annotations

from flask import Blueprint, request, jsonify

from backend.api.resume import handle

resume_bp = Blueprint("resume_bp", __name__)


@resume_bp.route("/resume/parse", methods=["POST"])
def post_resume_parse():
    body = request.get_json(force=False, silent=True)
    response_dict, status_code = handle(body)
    return jsonify(response_dict), status_code
