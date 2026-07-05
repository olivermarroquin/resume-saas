---
type: project-readme
project-name: resume-saas
status: parked
created: 2026-05-06
updated: 2026-07-05
client: false
sensitivity: standard
archetypes: [product-business, saas-product, b2c-saas]
applicability-confidence: medium
tags: [project, vault-root, parked]
---

# Project: resume-saas

## Purpose
First portfolio product: a web app that converts the legacy resume-factory CLI into a user-facing SaaS. A user pastes a resume + job description and gets edit proposals applied client-side, then a downloadable tailored resume. Flask API backend (40 tests passing) + Next.js App Router frontend.

## Status
**PARKED since April 2026** — client SEO/traffic work (ev-electric, s-and-h) took priority. Backend complete for MVP; frontend Stages 1–3.5 complete (scaffold, state layer, API wiring, verified end-to-end round trip); Stage 4a partial — blocked on the ProposedPane Slate.js migration (contentEditable approach was a dead end).

**Resume-point (in order):**
1. `docs/stage-4a-slate-migration-plan.md` — the blocking task, plan ready (~2-4h)
2. `.kos/specs/archived-2026-04-mvp-current-focus-plan.md` — full parked plan (Stage 4b, week map, knowledge-capture expectations), archived from `02_current-focus.md` 2026-07-05 during the Session End Protocol v2 build
3. Stage 4b (versioning + export) → deploy (Vercel + Railway)

## Sensitivity tier
- [x] Standard (Tier 1) — lives in second-brain via symlink
- [ ] NDA / confidential (Tier 2) — `_private/`, excluded from search and sync
- [ ] Sensitive / regulated (Tier 3) — separate air-gapped vault

## Vault contents
- `specs/` — what we're building (incl. the archived April 2026 MVP focus plan)
- `scopes/` — implementation boundaries
- `execution-logs/` — what actually happened
- `lessons/` — extracted learnings (promote to shared-intelligence)
- `.vault-config.md` — agent-facing context boundary

## What an agent reading this vault needs to know
- Project goal: ship the resume-saas MVP (input → proposals → apply → export)
- Current milestone: Stage 4a completion, blocked on Slate migration — PARKED, do not resume without operator direction
- Active constraints: no auth/billing/multi-user until post-MVP; don't route through the migration pipeline; don't overwrite the 40 backend tests; repo conventions in `repos/resume-saas/CLAUDE.md`
- Out of scope: performance optimization, second products, anything in the archived plan's "DO NOT Work On" list (historical — see archive header note)

## Promotion log
- 2026-05-06 — project initialized

## Links to shared-intelligence used by this project

Manually-curated links (add by hand as you adopt patterns / tools / lessons):

- [[ ]]
- [[ ]]

### Suggested by VIS extractions

Source notes flagged with this project in their `relevant-projects:` frontmatter. Review periodically; if a source's content is genuinely useful, promote a link to it (or to one of its derived artifacts) into the manual list above.

*(v1 scope: surfaces source notes only. Tools, tactics, and patterns derived from a relevant source are reachable via that source's "Extracted artifacts" section. See `phase-3-plus-queue.md` item #2 for the v2 upgrade criteria.)*

```dataview
TABLE WITHOUT ID
  file.link AS "Suggested",
  type AS "Type",
  ingested AS "Ingested",
  tier AS "Tier"
FROM "00_inbox" OR "03_domains" OR "05_shared-intelligence"
WHERE contains(relevant-projects, this.project-name)
  AND !contains(this.file.outlinks, file.link)
SORT ingested DESC
LIMIT 10
```

## Open tasks for this project

Tasks where `relevant-projects:` includes this project's slug and status is not yet closed. Captured automatically from `06_tasks/`. Per-project lens — the cross-project view lives at [[backlog]].

```dataview
TABLE WITHOUT ID
  file.link AS "Task",
  kind AS "Kind",
  status AS "Status",
  tier AS "Tier",
  due AS "Due"
FROM "06_tasks"
WHERE type = "task"
  AND contains(relevant-projects, this.project-name)
  AND status != "done"
  AND status != "parked"
  AND status != "killed"
SORT tier ASC, due ASC
```

## Lessons promoted from this project
- [[ ]]
