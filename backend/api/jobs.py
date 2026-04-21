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

import backend.services.jd_parser as _jd_parser

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Allowed request fields
# ---------------------------------------------------------------------------

_ALLOWED_FIELDS = {"job_description"}

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
    Framework-agnostic handler for POST /jobs/parse.

    Args:
        body: The parsed request body (must be a dict).

    Returns:
        A (response_dict, status_code) tuple.

    Error shapes (all per spec):
        400 invalid_json   — body is not a dict or extra fields present
        400 missing_field  — job_description absent or empty
        500 service_error  — jd_parser raised an exception
    """

    # 1. Body must be a dict.
    if not isinstance(body, dict):
        return _error("invalid_json", "Request body must be valid JSON.", 400)

    # 2. Reject additional fields.
    extra = set(body.keys()) - _ALLOWED_FIELDS
    if extra:
        return _error("invalid_json", "Request body must be valid JSON.", 400)

    # 3. Validate job_description.
    job_description = body.get("job_description")
    if not isinstance(job_description, str) or not job_description.strip():
        return _error("missing_field", "job_description is required and must be non-empty.", 400)

    # 4. Call service.
    try:
        terms = _jd_parser.extract_jd_terms(job_description)
    except Exception:
        logger.exception("job description parse service call failed")
        return _error("service_error", "Job description parse service failed.", 500)

    return {"terms": terms}, 200
