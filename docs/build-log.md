# resume-saas Build Log

Append-only log of build work. Most recent entry at the top.

Used for two purposes:

1. **Session handoff.** Each entry captures what happened so the next 
   session (or the next operator) can pick up without losing context.
2. **Raw material for future playbooks.** Entries in the "Design decisions" 
   section below accumulate into 
   `second-brain/03_playbooks/frontend-mvp-design-decisions.md` after 
   resume-saas ships.

---

## Design decisions (for future playbook)

Running log of cross-cutting architecture and UX decisions made during 
this build. Each entry: the decision, alternatives considered, and why we 
chose what we chose. These will be extracted into a reusable playbook 
after MVP ships.

| Date | Decision | Alternatives considered | Rationale |
|---|---|---|---|
| 2026-04-21 | Sync `/api/rewrite` call for MVP | Async with job polling (`/api/jobs`) | LLM calls typically return in 10-30s, inside browser/proxy timeout budget. Async adds job table, worker process, polling. Reversible later. |
| 2026-04-21 | Client-side PDF/DOCX export via `jspdf` and `docx` | Server-side export endpoint | Lighter infrastructure. Output quality acceptable for MVP. Server-side is v1.1 fallback if quality proves insufficient. |
| 2026-04-21 | Paste-text only inputs (resume + JD) for MVP | File upload (PDF, DOCX), URL scraping of JD | File parsing is a multi-day rabbit hole. Backend already accepts strings. Ships this week instead of next month. v1.1 work. |
| 2026-04-21 | Single route at `/` with state-machine phase field | Three routes (`/`, `/processing`, `/review`) | Persisting in-memory state across route changes adds complexity without user benefit in MVP. URL-based state not needed. |
| 2026-04-21 | `/api` URL prefix on Flask blueprints | Leave at root (`/rewrite`) | Namespaces API routes away from future frontend/static/health routes. One-line change in app.py. Matches convention in docs. |
| 2026-04-21 | Toggle regenerates right pane from scratch; discards freeform edits (with single-level undo) | Preserve freeform edits and merge; warn before toggle | Simplest to implement and reason about. One-level undo covers the realistic "oops" case. Multi-level undo is scope creep. |
| 2026-04-21 | Versioning kept in MVP; in-memory only | Cut versioning from MVP; add in v1.1 with persistence | Lightweight to implement without persistence. Useful for "tailor for job A, save, tailor for job B" workflow. Lost on refresh is acceptable tradeoff. |
| 2026-04-21 | Hybrid proposal UI: list in right pane, diff highlights in center pane | Pure list (no diff highlights), inline popovers on diff | Inline popovers handle ADD_LINE poorly (no anchor). Pure list obscures what each proposal does to the text. Hybrid gives control + visibility. Inline popovers deferred to v1.1. |

---

## Session entries

<!-- New entries appended above this line -->

---

## 2026-04-21 — Week 1 setup (execution chat + Claude Code)

### What happened
- Reviewed strategic context files and existing backend (`backend/api/rewrite_routes.py`, `rewrite.py`, `services/rewrite_orchestrator_v5.py`) to derive the frontend contract.
- Locked cross-cutting design decisions (see table above).
- Updated `repos/resume-saas/CLAUDE.md`:
  - Removed incorrect pointer to `docs/rewrite-api-spec-v1.md` (spec lives in `ai-factory/docs/`).
  - Rewrote API Contract section with correct `POST /api/rewrite` shape (proposals + narrative, not rewritten resume).
  - Updated Week 1 task order: spec before scaffold.
- Created `repos/resume-saas/docs/frontend-mvp-spec-v1.md` (authoritative spec for the Next.js app).
- Created this build-log.

### Decisions made
See "Design decisions" table above.

### Artifacts produced / touched
- `repos/resume-saas/CLAUDE.md` (edited)
- `repos/resume-saas/docs/frontend-mvp-spec-v1.md` (new)
- `repos/resume-saas/docs/build-log.md` (this file, new)

### Backend task identified (not yet done)
- Update `backend/app.py` to register all three blueprints with 
  `url_prefix="/api"`. Update affected tests (anything hitting 
  `/rewrite`, `/resume/parse`, `/jobs/*` at root — move to 
  `/api/rewrite`, `/api/resume/parse`, `/api/jobs/*`).

### Known backend debt (surfaced during spec work)
- Orchestrator field-name mismatch: `rewrite_orchestrator_v5.py` prompts 
  the model with field names `target`, `action`, `new_line`, but the 
  rewrite API spec defines response fields as `section`, `op`. A transform 
  must happen somewhere (orchestrator, schema validator, or handler) 
  between model output and API response. Audit after frontend MVP ships.

### Next session should start with
1. Apply backend `/api` prefix change + update affected tests.
2. Scaffold `repos/resume-saas/frontend/` per `docs/frontend-mvp-spec-v1.md`.

### Open questions for next session
- Does `repos/resume-saas/app.py` need to stay at the repo root, or does 
  it belong under `backend/`? (Separate from scaffold; structural 
  cleanup question.)
