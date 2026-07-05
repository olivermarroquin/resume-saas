---
type: spec
status: archived
created: 2026-04-21
updated: 2026-07-05
venture: resume-saas
tags: [resume-saas, mvp-plan, archived, current-focus-history]
---

# ARCHIVED — resume-saas MVP focus plan (April 2026)

> **Archived 2026-07-05** as part of the Session End Protocol v2 build ([[session-end-protocol-v2-spec]]). This content lived in `ai-factory/system-state/strategic/02_current-focus.md` from April 2026 and made the focus card stale — it describes the resume-saas MVP build era, before the client-SEO priority shift and the handoff/tracker coordination system. Preserved verbatim (content, not deleted) because Stage 4a/4b remain genuinely unfinished and this is the resume-work resume-point. Nothing here reflects current priorities — see the live `02_current-focus.md` for those.

## In Progress (as of April 2026)

### Build
- [ ] Stage 4a Slate migration — replace ProposedPane contentEditable surface with Slate.js editor. Plan doc at `repos/resume-saas/docs/stage-4a-slate-migration-plan.md`. Estimated 2-4 hours. Read plan doc + Slate quickstart BEFORE writing execution prompt. This is the blocker for completing Stage 4a.
- [ ] Create `repos/resume-saas/docker-compose.yml` for local dev (post-Stage-4)

### Setup
All items completed. Strategic context system, workspace/CLAUDE.md, repos/resume-saas/CLAUDE.md all updated and operational.

### Knowledge Capture (Ongoing)
Build-log entries captured throughout Stage 4a session 2026-04-22 including design decisions (11 rows), meta-lessons (2 entries — intake-gap + contentEditable-dead-end).

## Completed 2026-04-22 (Stage 4a full-day session)

### Stage 4a implementation
- [x] Stage 4a Section 1-6: OriginalPane, ProposedPane v1, ProposalCard, ProposalsList, ReviewScreen, AppShell review case wired
- [x] Fix 1a (data layer): multi-level undo stack, TOGGLE_ALL action, RESTORE_ORIGINAL clears selections + stack
- [x] Fix 1b (ProposedPane contentEditable rewrite) — multiple iterations, ultimately insufficient
- [x] Fix 2: applyProposals defensive normalization (synonym-aware section detection, bullet/whitespace normalization)
- [x] Fix 4: applyProposals multi-line before[0] handling + REPLACE_LINE auto-convert to phrase for sub-line edits (≥30% ratio threshold)
- [x] Fix 5.2: layout regression fix (body overflow-hidden, ReviewScreen h-full, grid-rows-1, min-h-0 on cells) — panes now scroll internally
- [x] Option A focus fix: remove hadFocus guard, always reset scroll/cursor/focus on toggle
- [x] Fix 6 Option C: contenteditable="plaintext-only" attempt (partial fix, insufficient)
- [x] Fix 6.1: line-div cursor walker (resolved Enter positioning, but backspace still broken)

### Strategic artifacts
- [x] build-log.md: 11 new design-decisions table rows covering Stage 4a decisions
- [x] build-log.md: Meta-lessons section established, 2 entries (intake-gap mid-build, contentEditable-dead-end)
- [x] frontend-mvp-spec-v1.md: revised for single-pane design + multi-level undo + Toggle All + known applyProposals limitations
- [x] second-brain/05_reference/venture-intake-checklist.md: 15-question intake checklist seeded from resume-saas lessons
- [x] second-brain/06_retros/2026-04-22_resume-saas-intake-gap-mid-build.md: mid-build retro on end-state vision gap
- [x] 01_current-strategy.md: Locked Decisions (5 new), Open Decisions (2 new), Things Not Building (4 new v1.1 items)
- [x] stage-4a-slate-migration-plan.md: full handoff document for tomorrow's Slate work

### Git hygiene
- [x] 28 commits across resume-saas repo spanning implementation, fixes, docs, and orphan-commit cleanup

## Completed Week of 2026-04-21

### Knowledge Capture Session (2026-04-21)
- [x] Added Task Completion Checkpoint Protocol to `workspace/CLAUDE.md`
- [x] Wrote `second-brain/06_retros/2026-04-20_resume-saas-backend-migration-retro.md`
- [x] Wrote `second-brain/06_retros/2026-04-20_ai-factory-control-system-retro.md` (with operator context amendments)
- [x] Wrote `second-brain/03_playbooks/backend-flask-three-layer-structure.md`
- [x] Wrote `second-brain/03_playbooks/migration-pipeline-operator-workflow.md`
- [x] Wrote `second-brain/03_playbooks/legacy-cli-to-saas-backend-conversion.md`
- [x] Initialized `second-brain/` as git repository
- [x] Corrected test count language in `current-system-state.md` and session log

### Week 1 Build Setup (2026-04-21)
- [x] Updated repos/resume-saas/CLAUDE.md (API contract corrected, task order fixed, spec-location pointer fixed)
- [x] Created repos/resume-saas/docs/frontend-mvp-spec-v1.md (authoritative spec for Next.js scaffold)
- [x] Created repos/resume-saas/docs/build-log.md (with design decisions table + Week 1 setup session entry)

### Week 1 Build Stages (2026-04-21)
- [x] Stage 1: Next.js 16.2 scaffold, Tailwind v4, TypeScript strict, clean dev server
- [x] Stage 2: Frontend state management layer — types, actions, reducer, AppContext, applyProposals algorithm
- [x] Stage 2.5: Backend dependency manifest (requirements.txt), fresh .venv, /api url_prefix on all blueprints, 40/40 tests passing in clean venv
- [x] Stage 3: Next.js proxy rewrite, lib/api.ts, InputScreen + ProcessingScreen + ErrorBanner + AppShell, AppProvider wired into root layout, README dev-server commands documented
- [x] Stage 3.5: Fixed OpenAI strict Structured Outputs schema bug (narrative nullable + required). Full end-to-end round trip verified: real resume+JD returned 7 real proposals through the full stack.

## Blocked / Waiting On (April 2026)

Stage 4a completion blocked on Slate migration of ProposedPane. Execution path is clear (plan doc ready), but requires fresh session — not a same-day continuation. Next session should start with reading `repos/resume-saas/docs/stage-4a-slate-migration-plan.md` end-to-end.

Stage 4b (versioning + export) blocked on Stage 4a completion.

## Next Up (After Current Tasks) — April 2026 plan

### Stage 4a completion (Next session — still Week 1/2)

- [ ] Read `repos/resume-saas/docs/stage-4a-slate-migration-plan.md` end-to-end (~10 min)
- [ ] Read Slate's "Installing Slate" + "The Basics" walkthroughs (~20 min)
- [ ] Validate the proposed implementation approach against Slate's idioms; adjust if needed
- [ ] Install `slate` and `slate-react` dependencies
- [ ] Rewrite `components/ProposedPane.tsx` using Slate
- [ ] Adapt or remove `lib/diffPreview.ts` per migration plan
- [ ] Live end-to-end test: all 15 original Stage 4a checks PLUS 7 Enter tests PLUS 3 backspace tests (test criteria in plan doc)
- [ ] Update `docs/frontend-mvp-spec-v1.md` to reflect Slate as editor implementation
- [ ] Build-log entry: "Stage 4a Slate migration complete" with notes on Slate idiom adjustments

### Stage 4b (After Stage 4a Slate migration completes)

- [ ] Create components/VersionSidebar.tsx (saved versions UI)
- [ ] Create components/ExportMenu.tsx (PDF/DOCX/Clipboard dropdown)
- [ ] Create lib/exportPdf.ts (@react-pdf/renderer wrapper)
- [ ] Create lib/exportDocx.ts (docx library wrapper)
- [ ] Live end-to-end test: save version, export PDF, export DOCX, clipboard copy

### Week 2
- Integration tests, error handling refinement
- Preparing for deployment
- **Playbook capture:** Write `second-brain/03_playbooks/frontend-nextjs-app-router-scaffold.md` after Stage 4 ships (Stage 4 completes the scaffold-to-working-app arc and gives richer material)
- **Parallel (evenings):** Start VIS MVP (`ai-factory/tools/vis/process_source.py`) — originally Week 2-3, still on track

### Week 3
- Frontend ↔ backend integration tests
- End-to-end flow tests (input → API → resume generation → download → edit → save → re-export)
- Error handling refinement
- **Playbook capture:** Write `second-brain/03_playbooks/backend-flask-blueprint-integration.md` after integration tests land
- **Parallel:** Build `weekly_synthesis.py` for VIS
- Start daily VIS processing (2-3 sources/day)

### Week 4
- Deploy frontend to Vercel
- Deploy backend to Railway
- Configure environment variables
- Basic production smoke tests
- Use resume-saas for 5 real job applications
- **Playbook capture:** Write `second-brain/03_playbooks/deployment-vercel-railway.md` after first successful deploy
- **Retro:** Write `second-brain/06_retros/2026-MM-DD_resume-saas-mvp-retro.md` after MVP is live

## DO NOT Work On Right Now (April 2026 list — HISTORICAL, contradicts current priorities)

- Operator tool expansion
- ECA implementation
- PM Agent layer
- Full VIS 6-stage pipeline (MVP is enough)
- Video Intelligence automation beyond Week 3 MVP
- Client outreach *(← April rule; client SEO/traffic is the CURRENT priority as of mid-2026)*
- Second portfolio app (wait for Week 5+)
- Multi-agent coordination setup
- Managed Agents configuration
- OpenClaw setup
- Cowork setup (revisit after MVP ships)

## Knowledge Capture Expected (April 2026 plan)

By end of Week 4, the following artifacts should exist in `second-brain/`:

1. `03_playbooks/frontend-nextjs-app-router-scaffold.md`
2. `03_playbooks/backend-flask-blueprint-integration.md`
3. `03_playbooks/deployment-vercel-railway.md`
4. `06_retros/2026-MM-DD_resume-saas-mvp-retro.md`

Plus ongoing entries in `repos/resume-saas/docs/build-log.md`.

Note: At current pace (Stages 1 through 3.5 all completed in one day of Week 1), the scaffold playbook is writable after Stage 4 ships tomorrow. Integration and deployment playbooks still map to their respective weeks. Retro still post-MVP-deployment.

These artifacts are what will eventually become the `app-build` workflow in ai-factory (which already has an empty `ai-factory/workflows/app-build/` directory waiting for content). Capturing them during resume-saas is the foundation for automating app #2 and beyond.
