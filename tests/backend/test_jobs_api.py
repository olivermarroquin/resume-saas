"""
Tests for backend/api/jobs.py:handle()

All tests call handle() directly — no HTTP layer, no framework.
extract_jd_terms is always mocked.

Categories:
  A — Input validation (A1–A6)
  B — Service failure (B1)
  C — Success path (C1–C5)
"""

from __future__ import annotations

from unittest.mock import patch, MagicMock

from backend.api.jobs import handle

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

VALID_BODY = {"job_description": "Python Selenium Jenkins CI/CD Agile"}

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
    response, status = handle([{"job_description": "Python developer"}])
    assert status == 400
    assert response == {"error": "invalid_json", "message": "Request body must be valid JSON."}


def test_input_validation_extra_field_rejected():
    """A3. Extra field present — message must be exact spec string."""
    response, status = handle({"job_description": "Python developer", "extra": "z"})
    assert status == 400
    assert response == {"error": "invalid_json", "message": "Request body must be valid JSON."}


def test_input_validation_job_description_absent():
    """A4. job_description absent."""
    response, status = handle({})
    assert status == 400
    assert response == {"error": "missing_field", "message": "job_description is required and must be non-empty."}


def test_input_validation_job_description_empty_string():
    """A5. job_description is empty string."""
    response, status = handle({"job_description": ""})
    assert status == 400
    assert response == {"error": "missing_field", "message": "job_description is required and must be non-empty."}


def test_input_validation_job_description_whitespace_only():
    """A6. job_description is whitespace only."""
    response, status = handle({"job_description": "   \n\t"})
    assert status == 400
    assert response == {"error": "missing_field", "message": "job_description is required and must be non-empty."}


# ---------------------------------------------------------------------------
# Category B — Service Failure
# ---------------------------------------------------------------------------


def test_service_failure_extract_raises():
    """B1. extract_jd_terms raises an exception."""
    with patch(
        "backend.api.jobs._jd_parser.extract_jd_terms",
        side_effect=RuntimeError("parse failed"),
    ):
        response, status = handle(VALID_BODY)
    assert status == 500
    assert response == {"error": "service_error", "message": "Job description parse service failed."}


# ---------------------------------------------------------------------------
# Category C — Success Path
# ---------------------------------------------------------------------------


def test_success_path_non_empty_terms():
    """C1. Service returns a non-empty list of terms."""
    with patch(
        "backend.api.jobs._jd_parser.extract_jd_terms",
        return_value=["python", "selenium", "jenkins"],
    ):
        response, status = handle(VALID_BODY)
    assert status == 200
    assert response == {"terms": ["python", "selenium", "jenkins"]}


def test_success_path_empty_terms():
    """C2. Service returns an empty list."""
    with patch(
        "backend.api.jobs._jd_parser.extract_jd_terms",
        return_value=[],
    ):
        response, status = handle(VALID_BODY)
    assert status == 200
    assert response == {"terms": []}


def test_success_path_response_shape_exactly_one_key():
    """C3. Response dict has exactly one key: 'terms'."""
    with patch(
        "backend.api.jobs._jd_parser.extract_jd_terms",
        return_value=["python"],
    ):
        response, status = handle(VALID_BODY)
    assert status == 200
    assert set(response.keys()) == {"terms"}


def test_success_path_terms_preserved_without_transformation():
    """C4. Returned terms match service output exactly — no sorting, deduplication, or filtering."""
    raw = ["api", "ci/cd", "restassured", "hp alm"]
    with patch(
        "backend.api.jobs._jd_parser.extract_jd_terms",
        return_value=raw,
    ):
        response, status = handle(VALID_BODY)
    assert status == 200
    assert response["terms"] == raw


def test_success_path_no_max_terms_override():
    """C5. extract_jd_terms is called with exactly one positional argument — max_terms is not passed."""
    mock_fn = MagicMock(return_value=["python"])
    with patch("backend.api.jobs._jd_parser.extract_jd_terms", mock_fn):
        handle(VALID_BODY)
    mock_fn.assert_called_once_with(VALID_BODY["job_description"])
