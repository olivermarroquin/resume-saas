"""
Tests for backend/api/resume.py:handle()

All tests call handle() directly — no HTTP layer, no framework.
extract_resume_sections is always mocked.

Categories:
  A — Input validation (A1–A6)
  B — Service failure (B1)
  C — Success path normalization (C1–C5)
"""

from __future__ import annotations

from unittest.mock import patch

from backend.api.resume import handle

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

VALID_BODY = {"resume_text": "Jane Doe\nSoftware Engineer\nPython, Go"}

ALL_FOUR_SECTIONS = {
    "header": ["Jane Doe"],
    "summary": ["Experienced engineer"],
    "skills": ["Python"],
    "experience": ["Company A"],
}

# ---------------------------------------------------------------------------
# Category A — Input Validation
# ---------------------------------------------------------------------------


def test_input_validation_body_not_a_dict_string():
    """A1. Body is a string."""
    response, status = handle("not a dict")
    assert status == 400
    assert response == {"error": "invalid_json", "message": "Request body must be valid JSON."}


def test_input_validation_body_not_a_dict_list():
    """A2. Body is a list."""
    response, status = handle([{"resume_text": "x"}])
    assert status == 400
    assert response == {"error": "invalid_json", "message": "Request body must be valid JSON."}


def test_input_validation_extra_field_rejected():
    """A3. Extra field present — message must be exact spec string."""
    response, status = handle({"resume_text": "x", "extra": "z"})
    assert status == 400
    assert response == {"error": "invalid_json", "message": "Request body must be valid JSON."}


def test_input_validation_resume_text_absent():
    """A4. resume_text absent."""
    response, status = handle({})
    assert status == 400
    assert response == {"error": "missing_field", "message": "resume_text is required and must be non-empty."}


def test_input_validation_resume_text_empty_string():
    """A5. resume_text is empty string."""
    response, status = handle({"resume_text": ""})
    assert status == 400
    assert response == {"error": "missing_field", "message": "resume_text is required and must be non-empty."}


def test_input_validation_resume_text_whitespace_only():
    """A6. resume_text is whitespace only."""
    response, status = handle({"resume_text": "   \n\t"})
    assert status == 400
    assert response == {"error": "missing_field", "message": "resume_text is required and must be non-empty."}


# ---------------------------------------------------------------------------
# Category B — Service Failure
# ---------------------------------------------------------------------------


def test_service_failure_extract_raises():
    """B1. extract_resume_sections raises an exception."""
    with patch(
        "backend.api.resume._resume_parser.extract_resume_sections",
        side_effect=RuntimeError("parse failed"),
    ):
        response, status = handle(VALID_BODY)
    assert status == 500
    assert response == {"error": "service_error", "message": "Resume parse service failed."}


# ---------------------------------------------------------------------------
# Category C — Success Path Normalization
# ---------------------------------------------------------------------------


def test_success_path_all_four_keys_returned():
    """C1. Service returns all four section keys."""
    with patch(
        "backend.api.resume._resume_parser.extract_resume_sections",
        return_value=ALL_FOUR_SECTIONS,
    ):
        response, status = handle(VALID_BODY)
    assert status == 200
    assert response == {"sections": ALL_FOUR_SECTIONS}


def test_success_path_missing_key_defaults_to_empty_list():
    """C2. Service omits one key — missing key defaults to []."""
    partial = {"header": ["Jane Doe"], "summary": ["Summary"], "experience": ["Company A"]}
    with patch(
        "backend.api.resume._resume_parser.extract_resume_sections",
        return_value=partial,
    ):
        response, status = handle(VALID_BODY)
    assert status == 200
    assert response["sections"]["skills"] == []
    assert response["sections"]["header"] == ["Jane Doe"]
    assert response["sections"]["summary"] == ["Summary"]
    assert response["sections"]["experience"] == ["Company A"]


def test_success_path_all_keys_missing_all_default_to_empty_list():
    """C3. Service returns empty dict — all four keys default to []."""
    with patch(
        "backend.api.resume._resume_parser.extract_resume_sections",
        return_value={},
    ):
        response, status = handle(VALID_BODY)
    assert status == 200
    sections = response["sections"]
    assert sections["header"] == []
    assert sections["summary"] == []
    assert sections["skills"] == []
    assert sections["experience"] == []


def test_success_path_values_preserved_without_transformation():
    """C4. Service-provided array values are preserved exactly."""
    raw = {
        "header": ["Line 1", "Line 2"],
        "summary": [],
        "skills": ["a", "b", "c"],
        "experience": ["x"],
    }
    with patch(
        "backend.api.resume._resume_parser.extract_resume_sections",
        return_value=raw,
    ):
        response, status = handle(VALID_BODY)
    assert status == 200
    assert response["sections"]["header"] == ["Line 1", "Line 2"]
    assert response["sections"]["summary"] == []
    assert response["sections"]["skills"] == ["a", "b", "c"]
    assert response["sections"]["experience"] == ["x"]


def test_success_path_response_shape_has_exactly_one_key():
    """C5. Response dict has exactly one key: 'sections'."""
    with patch(
        "backend.api.resume._resume_parser.extract_resume_sections",
        return_value=ALL_FOUR_SECTIONS,
    ):
        response, status = handle(VALID_BODY)
    assert status == 200
    assert set(response.keys()) == {"sections"}
