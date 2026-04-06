from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict, List

# ---------------------------------------------------------------------------
# Path setup — allows importing backend.schemas when called from any entry point
# ---------------------------------------------------------------------------

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)


def _lines(v: Any) -> List[str]:
    if isinstance(v, list):
        return [str(x) for x in v if str(x).strip()]
    if isinstance(v, str):
        s = v.strip("\n")
        if not s:
            return []
        return [ln.rstrip() for ln in s.splitlines()]
    return []


def render_rewrite_packet_md(payload: Dict[str, Any]) -> str:
    """
    Deterministic human view of rewrite_packet.
    No AI. No heuristics. Pure formatting.
    """
    selected_template = payload.get("selected_template", "")
    rp = payload.get("rewrite_packet") or {}
    if not isinstance(rp, dict):
        rp = {}

    ps = rp.get("professional_summary")
    skills = rp.get("technical_skills")
    exp = rp.get("experience") or []
    notes = rp.get("notes")

    out: List[str] = []
    out.append("# Rewrite Packet (v0)")
    out.append("")
    out.append(f"**Selected template:** `{selected_template}`")
    out.append("")

    out.append("## Professional Summary")
    out.append("")
    ps_lines = _lines(ps)
    if ps_lines:
        out.extend(ps_lines)
    else:
        out.append("_No content returned._")
    out.append("")

    out.append("## Technical Skills")
    out.append("")
    sk_lines = _lines(skills)
    if sk_lines:
        out.extend(sk_lines)
    else:
        out.append("_No content returned._")
    out.append("")

    out.append("## Experience Edits (Rewrite Packet)")
    out.append("")
    if isinstance(exp, list) and exp:
        for item in exp:
            if not isinstance(item, dict):
                continue
            tgt = item.get("target", "")
            action = item.get("action", "")
            new_line = item.get("new_line", "")
            out.append(f"- **{tgt}** ({action}): {new_line}")
    else:
        out.append("_No experience edits returned._")
    out.append("")

    if isinstance(notes, str) and notes.strip():
        out.append("## Notes")
        out.append("")
        out.append(notes.strip())
        out.append("")

    return "\n".join(out).rstrip()


# ---------------------------------------------------------------------------
# Orchestration entrypoint — required by backend/api/rewrite.py
# ---------------------------------------------------------------------------

_REWRITE_MODEL = os.environ.get("REWRITE_MODEL", "gpt-4o")

_REWRITE_PROMPT = """\
You are a resume editor. Given the resume text and job description below, produce a \
targeted list of edit proposals. Each proposal must:
- Target one section: SUMMARY, SKILLS, or EXPERIENCE
- Specify one op: REPLACE_LINE, ADD_LINE, DELETE_LINE, or REPLACE_PHRASE
- Include the original text in "before" and the replacement in "after"
- Include a concise "rationale" explaining why the edit improves alignment with the JD

Only propose changes that meaningfully improve alignment. Do not pad with trivial edits.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""


def run_rewrite(resume_text: str, job_description: str) -> Dict[str, Any]:
    """
    Call the AI model and return raw rewrite proposals.

    Uses OpenAI structured outputs with the schema defined in
    backend.schemas.proposal_schema.json_schema_for_structured_outputs().

    Returns a dict accepted by proposal_schema.validate_proposals():
        {"proposals": [...], "narrative": "..."}  # narrative is optional

    Raises on any network, auth, or model error — callers should catch broadly.
    Reads OPENAI_API_KEY from the environment (standard OpenAI SDK behavior).
    Reads REWRITE_MODEL from the environment; defaults to "gpt-4o".
    """
    from openai import OpenAI
    from backend.schemas.proposal_schema import json_schema_for_structured_outputs

    client = OpenAI()
    schema = json_schema_for_structured_outputs()

    content = _REWRITE_PROMPT.format(
        resume_text=resume_text.strip(),
        job_description=job_description.strip(),
    )

    response = client.chat.completions.create(
        model=_REWRITE_MODEL,
        messages=[{"role": "user", "content": content}],
        response_format={"type": "json_schema", "json_schema": schema},
    )

    return json.loads(response.choices[0].message.content)