# Resume Parser Service Contract

## Purpose

The resume parser service is responsible for turning an uploaded resume DOCX into structured resume data that the rest of the application can use.

It is the first extraction target from Resume Factory.

## Source Logic

Primary source:

- ~/workspace/repos/resume-factory/01_projects/resume-factory/scripts/rf_docx_extract.py

## Responsibilities

The service must:

- read a DOCX resume
- normalize lines
- collapse excessive blank lines
- locate key sections
- return structured section data
- optionally return numbered prompt-ready blocks

## Non-Responsibilities

The service must not:

- call AI models
- validate proposal edits
- parse job descriptions
- write files to project folders
- manage local CLI workflow
- manage output downloads directly

## Expected Inputs

### Phase 1 input

A local file path to a DOCX file

Example:

- `/tmp/resume.docx`

### Future input

A file object or uploaded file from a web request

---

## Expected Outputs

### Structured section output

The service should return something like:

- header_lines: list[str]
- summary_lines: list[str]
- skills_lines: list[str]
- experience_lines: list[str]

### Optional prompt output

The service may also return:

- formatted_prompt_text: str
- numbered_prompt_text: str
- line_index: dict

---

## Proposed Service Functions

### parse_resume_docx(docx_path: str) -> dict

Main entrypoint for parsing a resume file.

Should return structured extracted content.

### extract_resume_sections(lines: list[str]) -> dict

Given normalized lines, return structured sections.

### build_numbered_resume_view(sections: dict) -> dict

Optional helper that returns:

- numbered prompt text
- line index mapping

---

## Initial Return Shape

A first version may return a dictionary like:

{
"lines": [...],
"sections": {
"header": [...],
"summary": [...],
"skills": [...],
"experience": [...]
},
"numbered_view": {
"text": "...",
"line_index": {...}
}
}

## Build Principle

Keep this deterministic.
Do not add AI behavior here.
Do not tie this service to frontend or CLI assumptions.

## Notes

This service should become one of the core backend building blocks for Resume SaaS.
