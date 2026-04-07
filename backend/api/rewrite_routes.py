from __future__ import annotations

from flask import Blueprint, request, jsonify

from backend.api.rewrite import handle

rewrite_bp = Blueprint("rewrite_bp", __name__)


@rewrite_bp.route("/rewrite", methods=["POST"])
def post_rewrite():
    body = request.get_json(force=False, silent=True)
    response_dict, status_code = handle(body)
    return jsonify(response_dict), status_code
