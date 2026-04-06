"""
Tests for backend/api/rewrite.py:handle()

All tests call handle() directly — no HTTP layer, no framework.
Orchestrator and validate_proposals are always mocked.

Categories:
  A — Input validation (A1–A9)
  B — Service failure (B1)
  C — Output validation failure (C1)
  D — Success path normalization (D1–D5)
"""

from __future__ import annotations

from unittest.mock import patch, MagicMock

import pytest

from backend.api.rewrite import handle

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

VALID_BODY = {"resume_text": "My resume", "job_description": "Job description here"}

VALID_PROPOSAL = {
    "section": "SUMMARY",
    "op": "REPLACE_LINE",
    "before": ["Original line"],
    "after": ["Replacement line"],
    "rationale": "Improves alignment",
}

VALID_PROPOSALS_PAYLOAD = {"proposals": [VALID_PROPOSAL]}


# ---------------------------------------------------------------------------
# Category A — Input Validation
# ---------------------------------------------------------------------------


def test_input_validation_body_not_a_dict_string():
    """A1. Body is a string — not a dict."""
    response, status = handle("not a dict")
    assert status == 400
    assert response == {"error": "invalid_json", "message": "Request body must be valid JSON."}


def test_input_validation_body_not_a_dict_list():
    """A2. Body is a list — not a dict."""
    response, status = handle([{"resume_text": "x", "job_description": "y"}])
    assert status == 400
    assert response == {"error": "invalid_json", "message": "Request body must be valid JSON."}


def test_input_validation_extra_field_rejected():
    """A3. Extra field present — must return exact spec message, not a field-list variant."""
    response, status = handle({"resume_text": "x", "job_description": "y", "extra": "z"})
    assert status == 400
    assert response == {"error": "invalid_json", "message": "Request body must be valid JSON."}


def test_input_validation_resume_text_absent():
    """A4. resume_text absent."""
    response, status = handle({"job_description": "y"})
    assert status == 400
    assert response == {"error": "missing_field", "message": "resume_text is required and must be non-empty."}


def test_input_validation_resume_text_empty_string():
    """A5. resume_text is empty string."""
    response, status = handle({"resume_text": "", "job_description": "y"})
    assert status == 400
    assert response == {"error": "missing_field", "message": "resume_text is required and must be non-empty."}


def test_input_validation_resume_text_whitespace_only():
    """A6. resume_text is whitespace only."""
    response, status = handle({"resume_text": "   ", "job_description": "y"})
    assert status == 400
    assert response == {"error": "missing_field", "message": "resume_text is required and must be non-empty."}


def test_input_validation_job_description_absent():
    """A7. job_description absent."""
    response, status = handle({"resume_text": "x"})
    assert status == 400
    assert response == {"error": "missing_field", "message": "job_description is required and must be non-empty."}


def test_input_validation_job_description_empty_string():
    """A8. job_description is empty string."""
    response, status = handle({"resume_text": "x", "job_description": ""})
    assert status == 400
    assert response == {"error": "missing_field", "message": "job_description is required and must be non-empty."}


def test_input_validation_job_description_whitespace_only():
    """A9. job_description is whitespace only."""
    response, status = handle({"resume_text": "x", "job_description": "\n\t"})
    assert status == 400
    assert response == {"error": "missing_field", "message": "job_description is required and must be non-empty."}


# ---------------------------------------------------------------------------
# Category B — Service Failure
# ---------------------------------------------------------------------------


def test_service_failure_orchestrator_raises():
    """B1. Orchestrator raises an exception."""
    with patch("backend.api.rewrite._orchestrator.run_rewrite", side_effect=RuntimeError("model failed")):
        response, status = handle(VALID_BODY)
    assert status == 500
    assert response == {"error": "service_error", "message": "Rewrite service failed."}


# ---------------------------------------------------------------------------
# Category C — Output Validation Failure
# ---------------------------------------------------------------------------


def test_output_validation_failure_validate_proposals_returns_false():
    """C1. validate_proposals() returns (False, reason).

    Orchestrator returns structurally valid payload; failure is driven solely
    by the mocked validation result.
    """
    with patch("backend.api.rewrite._orchestrator.run_rewrite", return_value=VALID_PROPOSALS_PAYLOAD), \
         patch("backend.api.rewrite.validate_proposals", return_value=(False, "bad schema")):
        response, status = handle(VALID_BODY)
    assert status == 500
    assert response == {"error": "invalid_output", "message": "Rewrite service returned invalid proposals."}


# ---------------------------------------------------------------------------
# Category D — Success Path Normalization
# ---------------------------------------------------------------------------


def test_success_path_dict_with_proposals_and_narrative():
    """D1. Raw output is a dict with proposals and narrative."""
    raw = {"proposals": [VALID_PROPOSAL], "narrative": "Summary of changes"}
    with patch("backend.api.rewrite._orchestrator.run_rewrite", return_value=raw), \
         patch("backend.api.rewrite.validate_proposals", return_value=(True, None)):
        response, status = handle(VALID_BODY)
    assert status == 200
    assert "proposals" in response
    assert len(response["proposals"]) == 1
    assert response["proposals"][0]["id"] == 1
    assert response["narrative"] == "Summary of changes"


def test_success_path_dict_with_proposals_only_no_narrative():
    """D2. Raw output is a dict with proposals only — narrative key must be absent."""
    raw = {"proposals": [VALID_PROPOSAL]}
    with patch("backend.api.rewrite._orchestrator.run_rewrite", return_value=raw), \
         patch("backend.api.rewrite.validate_proposals", return_value=(True, None)):
        response, status = handle(VALID_BODY)
    assert status == 200
    assert "proposals" in response
    assert "narrative" not in response


def test_success_path_raw_output_is_list():
    """D3. Raw output is a list — proposals present, narrative absent."""
    proposal_a = dict(VALID_PROPOSAL)
    proposal_b = {**VALID_PROPOSAL, "section": "SKILLS"}
    raw = [proposal_a, proposal_b]
    with patch("backend.api.rewrite._orchestrator.run_rewrite", return_value=raw), \
         patch("backend.api.rewrite.validate_proposals", return_value=(True, None)):
        response, status = handle(VALID_BODY)
    assert status == 200
    assert "proposals" in response
    assert len(response["proposals"]) == 2
    assert "narrative" not in response


def test_success_path_sequential_id_assignment():
    """D4. IDs assigned sequentially starting at 1."""
    p1 = dict(VALID_PROPOSAL)
    p2 = {**VALID_PROPOSAL, "section": "SKILLS"}
    p3 = {**VALID_PROPOSAL, "section": "EXPERIENCE"}
    raw = [p1, p2, p3]
    with patch("backend.api.rewrite._orchestrator.run_rewrite", return_value=raw), \
         patch("backend.api.rewrite.validate_proposals", return_value=(True, None)):
        response, status = handle(VALID_BODY)
    assert status == 200
    ids = [p["id"] for p in response["proposals"]]
    assert ids == [1, 2, 3]


def test_success_path_narrative_none_omitted_from_response():
    """D5. narrative is None — must be absent from response, not null."""
    raw = {"proposals": [VALID_PROPOSAL], "narrative": None}
    with patch("backend.api.rewrite._orchestrator.run_rewrite", return_value=raw), \
         patch("backend.api.rewrite.validate_proposals", return_value=(True, None)):
        response, status = handle(VALID_BODY)
    assert status == 200
    assert "proposals" in response
    assert "narrative" not in response
