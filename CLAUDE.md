# resume-saas CLAUDE.md

Repo-level conventions for Claude Code when working inside `repos/resume-saas/`.

For session lifecycle (start/end protocol, context files), see `workspace/CLAUDE.md` at the workspace root.

---

## Project Overview

resume-saas is the first portfolio product — a web app that converts the legacy resume-factory CLI tool into a user-facing SaaS.

**Current state (as of 2026-04-20):**

- Backend: Flask API with blueprints (exists, 40 tests passing)
- Frontend: does not exist yet (being built this week)
- Deployment: not yet deployed

**MVP goal:** A user inputs job details through a web UI and gets a downloadable tailored resume.

---

## Stack

- **Backend:** Flask (Python 3.12)
- **Frontend:** Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Frontend state:** React Context + hooks (no Redux/Zustand for MVP)
- **Auth:** None for MVP (add later when multi-user matters)
- **Frontend deploy:** Vercel
- **Backend deploy:** Railway
- **Local dev:** docker-compose (both services)

---

## Directory Structure

```
resume-saas/
├── backend/
│   ├── api/              # Flask blueprints (rewrite, resume, jobs)
│   ├── services/         # Business logic (existing orchestrators)
│   ├── schemas/          # Request/response schemas
│   └── tests/            # pytest suite (40+ tests)
├── frontend/             # Next.js 14 App Router (being built)
│   ├── app/              # Routes (server components by default)
│   ├── components/       # Reusable React components
│   ├── lib/              # API client, utilities
│   └── public/           # Static assets
├── docs/
│   └── frontend-mvp-spec-v1.md       # Frontend architecture
├── CLAUDE.md             # This file
└── docker-compose.yml    # Local dev setup
```

Note: `rewrite-api-spec-v1.md` is NOT in this directory — the
authoritative spec lives at `ai-factory/docs/rewrite-api-spec-v1.md`.

---

## Backend Conventions

- **Blueprints** in `backend/api/` — one file per resource (rewrite.py, resume.py, jobs.py)
- **Services** in `backend/services/` — business logic only, no HTTP concerns
- **Schemas** in `backend/schemas/` — pydantic or dataclass for validation
- **Tests** in `backend/tests/` — use pytest, one test file per blueprint/service
- **No ORM** — direct service layer, database comes later if needed
- **Error responses** — consistent JSON: `{"error": "message", "code": "ERROR_CODE"}`

Existing orchestrator versions (v1-v5) coexist in services/. v5 is current. Do not delete earlier versions without explicit approval — they are preserved migration history.

---

## Frontend Conventions

- **App Router** (the `app/` directory, not `pages/`)
- **Server components by default** — add `"use client"` only when the component needs interactivity, state, or browser APIs
- **Tailwind for all styling** — no CSS modules, no styled-components
- **API client** centralized in `lib/api.ts` — all backend calls go through it
- **No mock data in production code** — use real API calls with proper error handling
- **No placeholder components** — every component must be functional when committed

### Component Patterns

- Components: PascalCase files (`ResumeForm.tsx`, `ResumePreview.tsx`)
- Utilities: camelCase files (`api.ts`, `formatResume.ts`)
- Routes: kebab-case directories (`app/generate/page.tsx`)

### State Management

- Local state: `useState`
- Shared state: React Context (in `lib/context/`)
- Server state: `fetch` in server components, or `useEffect` in client components
- Do not add Zustand, Redux, or Jotai unless a specific need justifies it

---

## API Contract

The authoritative rewrite API spec lives at
`ai-factory/docs/rewrite-api-spec-v1.md` (not in this repo).

Summary of the contract:

- **Endpoint:** `POST /api/rewrite`
- **Request:** `{ "resume_text": string, "job_description": string }`
  — both required, both non-empty.
- **Success response (200):**
  `{ "proposals": [...], "narrative"?: string }`
  where each proposal has `id` (integer), `section`
  (`SUMMARY` | `SKILLS` | `EXPERIENCE`), `op` (`REPLACE_LINE` |
  `ADD_LINE` | `DELETE_LINE` | `REPLACE_PHRASE`), `before`
  (array of strings), `after` (array of strings), `rationale` (string).
- **Error responses:**
  `400 invalid_json` (bad body or extra fields),
  `400 missing_field` (resume_text or job_description missing/empty),
  `500 service_error` (orchestrator threw),
  `500 invalid_output` (orchestrator output failed schema validation).
  All error bodies: `{ "error": code, "message": text }`.

The frontend applies proposals client-side to produce the rewritten resume
view. The backend does not return a finished rewritten resume — it returns
edit proposals only.

For full details — including proposal field semantics and validation rules
— see `ai-factory/docs/rewrite-api-spec-v1.md`.

Frontend calls backend directly in development (both run via
docker-compose). In production, frontend on Vercel calls backend on Railway
— CORS must be configured.

---

## Testing Rules

- Every API endpoint must have a test
- Every form submission path must have an integration test
- Run tests before committing: `cd backend && pytest`
- Frontend tests come in Phase 2 (not required for MVP)

---

## Git Workflow

- Commit small, coherent changes with descriptive messages
- Branch off `main` for features: `feature/frontend-input-form`
- Do not push without operator approval (operator pushes after review)
- Do not force-push

---

## Current Focus

See `ai-factory/system-state/strategic/02_current-focus.md` for the live list of what's in progress.

As of start, Week 1 tasks:

- Create `docs/frontend-mvp-spec-v1.md`
- Scaffold `frontend/` with Next.js 14 (App Router, TypeScript, Tailwind)
  per the spec
- Wire frontend to backend `POST /api/rewrite` and verify end-to-end
- Create `docker-compose.yml` for local dev

---

## Constraints (Non-Negotiable)

- **Do not route this repo's work through the migration pipeline.** resume-saas frontend is new code, not migrated code. Use direct development with Claude Code. The migration pipeline in ai-factory is for legacy ports only.
- **Do not add auth, billing, or multi-user features** until after MVP ships and there's real demand.
- **Do not pre-optimize.** MVP first. Performance, caching, and scale come after users.
- **Do not overwrite existing backend tests.** 40 tests pass — extend them, don't replace them.

---

## When Something Is Unclear

If you hit a decision that isn't covered here or in the strategic context files:

1. Stop
2. State the ambiguity clearly
3. Propose 2-3 options with tradeoffs
4. Wait for operator input

Do not make unilateral architectural decisions.
