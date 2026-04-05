from __future__ import annotations

from typing import Any, Dict, List


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
