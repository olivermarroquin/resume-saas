from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List

from docx import Document


def _trim_blanks(block: List[str]) -> List[str]:
    while block and block[0].strip() == "":
        block = block[1:]
    while block and block[-1].strip() == "":
        block = block[:-1]
    return block


def read_docx_lines(docx_path: Path) -> List[str]:
    if not docx_path.exists():
        raise FileNotFoundError(f"missing docx: {docx_path}")
    doc = Document(str(docx_path))
    raw: List[str] = []
    for p in doc.paragraphs:
        t = (p.text or "").rstrip()
        if not t.strip():
            raw.append("")
            continue
        raw.append(t)

    lines: List[str] = []
    prev_blank = False
    for t in raw:
        blank = t.strip() == ""
        if blank and prev_blank:
            continue
        lines.append(t)
        prev_blank = blank

    return lines


def parse_resume_docx(docx_path: str) -> Dict[str, Any]:
    """
    Main entrypoint for parsing a resume DOCX.

    Phase 1:
    - accept a local file path
    - return structured sections
    - remain deterministic

    Future:
    - support uploaded file objects from web requests
    """
    path = Path(docx_path)

    if not path.exists():
        raise FileNotFoundError(f"missing docx: {path}")

    lines = read_docx_lines(path)
    sections = extract_resume_sections(lines)

    return {
        "lines": lines,
        "sections": sections,
        "numbered_view": build_numbered_resume_view(sections),
    }


def extract_resume_sections(lines: List[str]) -> Dict[str, List[str]]:
    """
    Given normalized resume lines, return structured sections.

    Section boundaries are detected by heading keywords and job-line heuristics.
    Returns a dict with keys: header, summary, skills, experience.
    """
    idx_prof = None
    idx_tech = None
    idx_exp = None
    idx_edu = None
    prof_kw = False
    tech_kw = False
    exp_kw = False

    for i, t in enumerate(lines):
        tl = t.strip().lower()
        tl2 = tl.rstrip(":")
        if idx_prof is None and tl2 in (
            "professional summary", "summary", "profile", "professional profile"
        ):
            idx_prof = i
            prof_kw = True
            continue
        if idx_tech is None and (
            "technical skill" in tl2 or tl2 in ("skills", "technical skills")
        ):
            idx_tech = i
            tech_kw = True
            continue
        if idx_edu is None and tl2 == "education":
            idx_edu = i
            continue
        if idx_exp is None:
            if tl2 in ("experience", "professional experience", "work experience"):
                idx_exp = i
                exp_kw = True
                continue
            if re.search(
                r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b"
                r".*\b\d{4}\b\s*[-\u2013\u2014]{1,2}\s*(?:present|\b\d{4}\b)",
                tl2,
            ):
                idx_exp = i
                continue
            if (
                re.search(r"\b\d{4}\b\s*[-\u2013\u2014]{1,2}\s*(?:present|\b\d{4}\b)", tl2)
                and len(tl2) <= 120
            ):
                idx_exp = i

    if idx_prof is None:
        idx_prof = 0
    if idx_tech is None:
        idx_tech = idx_exp if idx_exp is not None else min(len(lines), idx_prof + 12)
    if idx_exp is None:
        idx_exp = len(lines)

    skills_end = idx_exp
    if idx_edu is not None and idx_edu > idx_tech:
        skills_end = min(skills_end, idx_edu)

    prof_start = idx_prof + (1 if prof_kw else 0)
    tech_start = idx_tech + (1 if tech_kw else 0)
    exp_start = idx_exp + (1 if exp_kw else 0)

    _structural = {"roles and responsibilities", "roles and responsibilities:"}

    def _drop_structural(block: List[str]) -> List[str]:
        return [t for t in block if t.strip().lower() not in _structural]

    return {
        "header": _drop_structural(_trim_blanks(lines[:idx_prof])),
        "summary": _drop_structural(_trim_blanks(lines[prof_start:idx_tech])),
        "skills": _drop_structural(_trim_blanks(lines[tech_start:skills_end])),
        "experience": _drop_structural(_trim_blanks(lines[exp_start:])),
    }


def build_numbered_resume_view(sections: Dict[str, List[str]]) -> Dict[str, Any]:
    """
    Build numbered prompt-ready resume view and line index mapping.
    """
    order = [("header", "H"), ("summary", "S"), ("skills", "K"), ("experience", "E")]
    text_lines: List[str] = []
    line_index: Dict[str, str] = {}

    for key, prefix in order:
        n = 0
        for line in sections.get(key, []):
            if not line.strip():
                continue
            n += 1
            ref = f"{prefix}{n:03d}"
            line_index[ref] = line
            text_lines.append(f"{ref} | {line}")

    return {
        "text": "\n".join(text_lines),
        "line_index": line_index,
    }
