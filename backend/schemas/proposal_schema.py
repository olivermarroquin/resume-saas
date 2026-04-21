from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

ALLOWED_SECTIONS = {"SUMMARY", "SKILLS", "EXPERIENCE"}
ALLOWED_OPS = {"REPLACE_LINE", "ADD_LINE", "DELETE_LINE", "REPLACE_PHRASE"}


@dataclass(frozen=True)
class Proposal:
    section: str
    op: str
    before: List[str]
    after: List[str]
    rationale: str
    id: int | None = None


def _die(msg: str) -> Tuple[bool, str]:
    return False, msg


def validate_proposals(payload: Any) -> Tuple[bool, str]:
    """
    Deterministic schema gate for edit proposals.

    Accepts:
      - a list of proposal dicts, or
      - a dict with optional "narrative" and required "proposals" list

    Each proposal must have:
      - section: SUMMARY | SKILLS | EXPERIENCE
      - op: REPLACE_LINE | ADD_LINE | DELETE_LINE | REPLACE_PHRASE
      - before: non-empty list of non-empty strings
      - after: non-empty list of non-empty strings (DELETE_LINE requires [''])
      - rationale: non-empty string
      - id: int >= 1 (optional)
    """
    if isinstance(payload, list):
        proposals = payload
    elif isinstance(payload, dict):
        proposals = payload.get("proposals")
        narrative = payload.get("narrative", None)
        if narrative is not None and not isinstance(narrative, str):
            return _die("narrative must be a string if present")
    else:
        return _die("payload must be a list or an object with proposals")

    if not isinstance(proposals, list):
        return _die("proposals must be a list")

    for i, p in enumerate(proposals, start=1):
        if not isinstance(p, dict):
            return _die(f"proposal #{i}: must be an object")

        pid = p.get("id", None)
        if pid is not None and not (isinstance(pid, int) and pid >= 1):
            return _die(f"proposal #{i}: id must be an int >= 1 if present")

        section = p.get("section")
        op = p.get("op")
        before = p.get("before")
        after = p.get("after")
        rationale = p.get("rationale")

        if section not in ALLOWED_SECTIONS:
            return _die(f"proposal #{i}: invalid section={section!r}")
        if op not in ALLOWED_OPS:
            return _die(f"proposal #{i}: invalid op={op!r}")

        if op == "DELETE_LINE":
            if not (isinstance(after, list) and len(after) == 1 and isinstance(after[0], str) and after[0] == ""):
                return _die(f"proposal #{i}: DELETE_LINE requires after to be ['']")

        if not isinstance(before, list) or not before or not all(isinstance(x, str) and x.strip() for x in before):
            return _die(f"proposal #{i}: before must be a non-empty list of non-empty strings")

        if op != "DELETE_LINE":
            if not isinstance(after, list) or not after or not all(isinstance(x, str) and x.strip() for x in after):
                return _die(f"proposal #{i}: after must be a non-empty list of non-empty strings")

        if not isinstance(rationale, str) or not rationale.strip():
            return _die(f"proposal #{i}: rationale must be a non-empty string")

        if op in ("REPLACE_LINE", "REPLACE_PHRASE"):
            if len(before) != 1 or len(after) != 1:
                return _die(f"proposal #{i}: {op} requires before/after length of 1")

    return True, "ok"


def json_schema_for_structured_outputs() -> Dict[str, Any]:
    """
    JSON Schema used for OpenAI Structured Outputs.
    Keep this in sync with validate_proposals().

    Note: id is NOT requested from the model; CLI assigns ids deterministically.
    """
    return {
        "name": "resume_edit_proposals",
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "required": ["proposals", "narrative"],
            "properties": {
                "narrative": {"type": ["string", "null"]},
                "proposals": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["section", "op", "before", "after", "rationale"],
                        "properties": {
                            "section": {"type": "string", "enum": sorted(ALLOWED_SECTIONS)},
                            "op": {"type": "string", "enum": sorted(ALLOWED_OPS)},
                            "before": {"type": "array", "minItems": 1, "maxItems": 1, "items": {"type": "string"}},
                            "after": {"type": "array", "minItems": 1, "maxItems": 1, "items": {"type": "string"}},
                            "rationale": {"type": "string"},
                        },
                    },
                },
            },
        },
        "strict": True,
    }