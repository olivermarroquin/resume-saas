from __future__ import annotations

import sys
import os
from typing import Any, Tuple

# ---------------------------------------------------------------------------
# Dependency imports — resolved relative to repo root
# ---------------------------------------------------------------------------

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from backend.schemas.proposal_schema import validate_proposals
import backend.services.rewrite_orchestrator_v5 as _orchestrator


# ---------------------------------------------------------------------------
# Allowed request fields (spec: additional fields are rejected)
# ---------------------------------------------------------------------------

_ALLOWED_FIELDS = {"resume_text", "job_description"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _error(code: str, message: str, status: int) -> Tuple[dict, int]:
    return {"error": code, "message": message}, status


def _assign_ids(proposals: list) -> list:
    """Return a new list of proposal dicts with sequential integer ids starting at 1."""
    out = []
    for i, p in enumerate(proposals, start=1):
        entry = dict(p)
        entry["id"] = i
        out.append(entry)
    return out


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------


def handle(body: Any) -> Tuple[dict, int]:
    """
    Framework-agnostic handler for POST /rewrite.

    Args:
        body: The parsed request body (must be a dict).

    Returns:
        A (response_dict, status_code) tuple.

    Error shapes (all per spec):
        400 invalid_json       — body is not a dict (caller failed to parse JSON)
        400 missing_field      — resume_text or job_description absent or empty
        500 service_error      — orchestrator raised an exception
        500 invalid_output     — orchestrator output failed schema validation
    """

    # 1. Body must be a dict (caller is responsible for JSON parsing; non-dict
    #    means the request body was not a JSON object).
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

    # 4. Validate job_description.
    job_description = body.get("job_description")
    if not isinstance(job_description, str) or not job_description.strip():
        return _error("missing_field", "job_description is required and must be non-empty.", 400)

    # 5. Call orchestrator. resume_text and job_description are passed through
    #    without transformation, matching the service interface defined in the spec.
    try:
        raw_output = _orchestrator.run_rewrite(resume_text, job_description)
    except Exception:
        return _error("service_error", "Rewrite service failed.", 500)

    # 6. Validate orchestrator output against proposal schema.
    ok, reason = validate_proposals(raw_output)
    if not ok:
        return _error("invalid_output", "Rewrite service returned invalid proposals.", 500)

    # 7. Normalize to response shape, assign sequential ids.
    if isinstance(raw_output, list):
        proposals = raw_output
        narrative = None
    else:
        proposals = raw_output.get("proposals", [])
        narrative = raw_output.get("narrative")

    proposals = _assign_ids(proposals)

    response: dict = {"proposals": proposals}
    if isinstance(narrative, str):
        response["narrative"] = narrative

    return response, 200
