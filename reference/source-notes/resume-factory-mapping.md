# Resume Factory Mapping

## Purpose

Track how source logic from Resume Factory maps into Resume SaaS.

## Initial Mapping

### Resume Parsing

Source:

- rf_docx_extract.py

Target:

- backend/services/resume_parser.py

### JD Parsing

Source:

- rf_jd_terms.py

Target:

- backend/services/jd_parser.py

### Proposal Validation

Source:

- rf_proposal_schema.py

Target:

- backend/services/proposal_validator.py
- backend/schemas/proposal_schema.py

### Rewrite Formatting

Source:

- rf_render_rewrite_packet.py

Target:

- backend/services/rewrite_formatter.py

## Rule

Map logic by responsibility.
Do not copy old shell workflow structure into the new app.
