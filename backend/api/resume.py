from __future__ import annotations

import logging
import sys
import os
from typing import Any, Tuple

# ---------------------------------------------------------------------------
# Dependency imports — resolved relative to repo root
# ---------------------------------------------------------------------------

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

import backend.services.resume_parser as _resume_parser

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Allowed request fields
# ---------------------------------------------------------------------------

_ALLOWED_FIELDS = {"resume_text"}

_SECTION_KEYS = ("header", "summary", "skills", "experience")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _error(code: str, message: str, status: int) -> Tuple[dict, int]:
    return {"error": code, "message": message}, status


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------


def handle(body: Any) -> Tuple[dict, int]:
    """
    Framework-agnostic handler for POST /resume/parse.

    Args:
        body: The parsed request body (must be a dict).

    Returns:
        A (response_dict, status_code) tuple.

    Error shapes (all per spec):
        400 invalid_json   — body is not a dict or extra fields present
        400 missing_field  — resume_text absent or empty
        500 service_error  — resume_parser raised an exception
    """

    # 1. Body must be a dict.
    if not isinstance(body, dict):
        return _error("invalid_json", "Request body must be valid JSON.", 400)

    # 2. Reject additional fields.
    extra = set(body.keys()) - _ALLOWED_FIELDS
    if extra:
        return _error("invalid_json", "Request body must be valid JSON.", 400)

    # 3. Validate resume_text.
    resume_text = body.get("resume_text")
    if not isinstance(resume_text, str) or not resume_text.strip():
        return _error("missing_field", "resume_text is required and must be non-empty.", 400)

    # 4. Call service.
    try:
        raw = _resume_parser.extract_resume_sections(resume_text.splitlines())
    except Exception:
        logger.exception("resume parse service call failed")
        return _error("service_error", "Resume parse service failed.", 500)

    # 5. Normalize — guarantee all four section keys as arrays.
    sections = {key: raw.get(key, []) for key in _SECTION_KEYS}

    return {"sections": sections}, 200
