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
| 2026-04-21 | Accept current stable versions (Next.js 16.2, React 19.2, Tailwind v4) rather than pinning to older spec-mentioned versions | Downgrade to Next.js 14 + Tailwind v3 to match original spec wording | create-next-app installs current stable. Tailwind v4 and Next.js 16 have been stable for over a year. Downgrading is busywork that bets against ecosystem direction. Utility classes and reducer patterns work identically. Spec updated to reflect reality. |
| 2026-04-22 | PDF export via @react-pdf/renderer (client-side) | jspdf, pdf-lib | Spec originally said jspdf for plain-text-in-PDF-out simplicity. Flipped to react-pdf because export quality is a stated priority and spec's MVP/v1.1 export roadmap would have forced a library rewrite when pushing quality. react-pdf's declarative model (Document/Page/Text) handles pagination, typography, spacing automatically; iterating on a better-looking template is a template change, not a library migration. Bundle cost (~600kb over jspdf) is the tradeoff; acceptable for this priority ordering. pdf-lib rejected — it's optimized for modifying existing PDFs, not generating from scratch. |
| 2026-04-22 | MVP PDF template is minimal (single column, Helvetica, section-heading + body hierarchy, no header block) | Richer template with structured sections (contact header, typed sections, styled bullets) | Backend returns text-based proposals against free-text resume content; frontend holds the whole resume as one string. A richer template would require parsing section boundaries on the frontend, which is scope creep into the data model. Minimal template renders the plain text as-is with basic typography and stops there. Upgrading the template is v1.1 work, gated on introducing structured resume data. |
| 2026-04-22 | Product framing: resume-saas MVP is a proposal-review tool, not a format-preserving editor | (A) Re-scope MVP to build DOCX file upload + format-preserving export before shipping. (B) Ship current MVP without reframing and let users discover the gap. | The product's end-state value prop is format-preserving resume editing — user uploads their existing resume in their own format, system applies proposals without disturbing the formatting. MVP as built cannot do this (plain-text paste loses all formatting at the input stage). Path A would defer ship by 3-4 weeks to build DOCX parsing, before validating whether the proposal-review flow itself is useful — factory-polishing risk. Path B ships the gap silently and invites bad first-user experience. Path C ships the current MVP with honest framing ("AI proposal generator for resume tailoring" in v1; format-preserving editor in v2), validates the proposal flow with real use, then invests in format preservation post-launch with real data. |
| 2026-04-22 | Diff visualization via per-op highlighting driven by proposal op types (REPLACE_LINE → yellow, ADD_LINE → green, DELETE_LINE → red-strike, REPLACE_PHRASE → yellow) | Text-diff library (e.g., diff-match-patch) computing line/word diff between original and proposals-applied text | Proposals already carry before/after/op — they ARE the diff. Text-diff library would be machinery to recompute information we already have, with inconsistent granularity (word-level for phrase, line-level for line). Per-op gives consistent visual treatment. Freeform-edit staleness concern is resolved by the spec's existing rule that toggles regenerate from scratch. Accepting that edge cases (overlapping proposals, proposals against already-modified text) may not render perfectly — spec's "best-effort fallback" language covers this. |
| 2026-04-22 | Center pane toggle UX: scroll position stays, cursor goes to start of text with focus preserved | (a) Reset scroll to top; (b) scroll to affected region; (c) preserve exact cursor character offset | Toggle primary interaction is in the right pane (proposals list), not the center pane. Stable scroll keeps the user's eye anchored. Scroll-to-affected-region sounds helpful but is unpredictable (toggle on top-of-doc proposal while user reads bottom is a jarring jump). Start-of-text cursor with focus preserved is the simplest implementation that doesn't lose focus. Exact offset preservation is a rabbit hole (content may have shifted, offset may no longer exist). |
| 2026-04-22 | "Restore original" keeps acceptedProposalIds unchanged; button labeled "Restore original text (keeps proposal selections)" to set expectation | (B) Clear acceptedProposalIds on restore; (C) Split into two buttons ("Restore original text" + "Clear all selections") | Spec's original intent is a real workflow: user freeform-edits into a bad state and wants text reset without losing 5 minutes of proposal-selection work. Option B removes that workflow to solve a visual-consistency issue that labeling can also solve. Option C adds UI for a case users may never hit. Option A preserves the workflow and makes the inconsistency explicit through labeling. If real usage shows the inconsistency is genuinely confusing, upgrading to Option C is a cheap v1.1 change (split one button into two); reverting Option B is harder. |
| 2026-04-22 | Review-screen interaction model revised post-live-test: (a) multi-level undo of toggles (stack of {text, acceptedProposalIds} snapshots, unbounded, pushed on every TOGGLE_PROPOSAL and TOGGLE_ALL, cleared by RESTORE_ORIGINAL and START_OVER); (b) new TOGGLE_ALL action with three-state button ("Accept all" / "Reject all" based on current state); (c) RESTORE_ORIGINAL now also clears acceptedProposalIds and the undo stack, button relabeled "Clear all edits and selections"; (d) single contentEditable middle pane replacing split textarea + diff-preview. Freeform text-typing undo is handled by browser-native Ctrl+Z, NOT by the undo stack. | (Yesterday) Single-level undo + two-pane split + Option A restore-original (keep selections, explicit label) | Live end-to-end test on a real resume (2026-04-22, Stage 4a Section 7) surfaced that: (1) two stacked text areas in the middle pane are confusing UX regardless of whether each one works correctly; (2) single-level undo is insufficient — users naturally expect "undo" to keep undoing; (3) Option A's "keep selections, explicit label" compromise doesn't survive contact with real use — the visual inconsistency was confusing in practice even with the clarifying label. These are all lessons only a live test could have produced. Unit tests mock the hard parts, so live testing is the primary bug-surfacing mechanism. This pattern repeats from Stage 3 (proposal_schema.py nullable-narrative bug) and should be treated as structural, not incidental. |
| 2026-04-22 | Fix 4 scope: frontend defensive fallback (Strategy B) instead of backend orchestrator prompt fix (Strategy A) | Strategy A: iterate on orchestrator prompt to eliminate wrong-op choices and multi-line before[0]; Strategy C: accept failures as known limitations, ship, fix in v1.1 | Live test on real resume revealed REPLACE_LINE proposals failing not due to encoding issues but due to backend quirks: (1) model sometimes picks REPLACE_LINE for sub-line edits that should be REPLACE_PHRASE; (2) model sometimes packs multi-line content into before[0] strings. Strategy A fixes root cause but requires orchestrator prompt iteration (1-2+ hours) with diminishing returns — getting the model from 70% to 95% accuracy is a v1.1 project not a Stage 4a sub-task. Strategy B adds narrow defensive logic in applyProposals (auto-convert REPLACE_LINE → phrase replacement when before[0] is a uniquely-locatable substring ≥30% of line length; match multi-line before[0] against contiguous resume line blocks). Keeps product functional on real data tonight. Downside: silently hides model quality signal — mitigated by console.info logs when fallback fires. Strategy A remains on the v1.1 list with revisit trigger = real usage across 10+ different resumes showing which ops the model gets wrong, fix in one prioritized pass rather than chasing individual cases. |
| 2026-04-22 | REPLACE_LINE indentation loss in applied output accepted as known issue; defer to Stage 4b polish or v1.1 | Rewrite applyProposals to preserve the target line's leading whitespace/bullet glyph when substituting after[0] | Stage 4a live test showed that when REPLACE_LINE applies successfully, the replacement line lacks the indentation/bullet of the original (e.g., "• Utilized Apache..." → "Utilized Jenkins..." flush-left). Cause: normalizeLineForMatch strips leading bullet+whitespace to find a match, then raw after[0] is substituted without restoring the stripped prefix. Fix is straightforward (capture the stripped prefix from the matched source line, re-apply it when substituting) but adds ~15-20 lines to applyProposals. Not product-breaking — user can manually re-indent — and tonight's priority is Bug Z (Enter handling) which makes freeform editing unusable. Captured as deferred; address in a dedicated polish pass or when Stage 4b touches applyProposals again. |
| 2026-04-22 | Fix 4's 30% substring-ratio threshold intentionally rejects short before[0] against long resume paragraphs; SUMMARY REPLACE_LINE proposals with ~14% ratio silently skip as designed | Lower the threshold to catch more cases (e.g., 10% or no threshold); or implement full fuzzy matching | Live test produced a SUMMARY REPLACE_LINE proposal whose before[0] (170 chars) was a substring of a 1221-char paragraph — ratio ~14%, well below Fix 4's 30% belt-and-suspenders threshold. Threshold rejected the auto-convert; proposal silently skipped with the expected console.warn. This is Strategy B behaving correctly: the proposal genuinely cannot be safely applied by the frontend because the model chose the wrong op (should have been REPLACE_PHRASE). Lowering the threshold would risk mismatching unrelated lines that happen to contain the same short substring. Proper fix remains on v1.1 backend track (orchestrator prompt accuracy + schema validator strictness, already captured). For MVP, acceptable tradeoff: occasionally one proposal in a multi-proposal response won't apply, user still has the others. Console.warn provides the diagnostic trail for the v1.1 backend pass. |
| 2026-04-22 | Migrate ProposedPane freeform editor from React-owned contentEditable to Slate.js editor framework | (a) Continue patching contentEditable with more event interception and DOM-level fixes; (b) Roll back to two-pane split (read-only diff preview + separate textarea); (c) Strip freeform editing entirely and ship as proposal-review-only tool; (d) Alternative libraries: Lexical (heavier, more featured), TipTap/ProseMirror (steeper curve), CodeMirror 6 (code-editor idioms don't match) | Three successive contentEditable fix attempts (Fix 6 Option C plaintext-only, Fix 6.1 line-div cursor walker, diagnostic instrumentation) resolved one bug class each but surfaced new ones. Root cause is structural: React renders line divs with keys; Chrome inserts its own divs on Enter without keys; React reconciliation can't cleanly own a DOM that the browser is also mutating. Every fix patches a symptom without addressing that the two systems are fighting for DOM ownership. Slate solves this by owning the editing abstraction entirely — the editor is backed by a document model (nodes + text leaves), not raw DOM. Same class of problem is solved once at the library level rather than per-event in our code. Slate chosen over Lexical because: bundle size ~100kb vs ~200-300kb, React-native (no shim), mature (v0.90+ stable), ergonomics fit the v1.1 inline-popover roadmap (inline node decorations are native to Slate). Downsides: (1) learning curve — 1-2 hours to orient; (2) new dependency; (3) existing cursor-helper code (~150 lines) becomes obsolete. Not a rollback of prior work — the cursor-walker logic we built was diagnostic; it taught us where contentEditable fails. Accepted. |
| 2026-04-23 | Pivot ProposedPane editor framework from Slate.js to Lexical (@lexical/react). Supersedes 2026-04-22 Slate selection; decided before any Slate code was written. | (a) Stick with Slate per 2026-04-22 plan, accept React 19 compat risk, fall back to Lexical only if compat broken at install time; (b) Lexical (chosen); (c) TipTap/ProseMirror — heavier, steeper learning curve, no advantage over Lexical for this use case; (d) CodeMirror 6 — code-editor idioms, wrong fit for prose editing; (e) Roll back to two-pane split + read-only diff preview, ship without freeform editing in the styled pane. | Decisive flag: slate-react has a documented pattern of trailing major React releases and React 19 compatibility was not verified in the original plan. Project runs Next.js 16.2 with React 19.2. Starting a 2-4 hour migration on a library whose React 19 support is uncertain is a self-inflicted unknown. Lexical's @lexical/react package is maintained by Meta's funded team and tracks current React releases. Secondary factors: (1) Lexical 0.44.0 (released 2026-04-27); pre-1.0 with monthly release cadence under Meta and broad production use, no inter-minor API stability guarantee. Peer deps (>=17.x for React) cover React 19.2; the React 18→19 migration landed in v0.36.0 (2025-09-25); (2) plugin ecosystem fit — v1.1 deferred items (inline proposal popovers, cross-pane sync) are natively expressible as Lexical decorator/mark nodes, keeping v1.1 cheap; (3) bundle size delta (~100-200kb additional gzip over Slate) irrelevant for a resume-editing tool where users spend minutes in the editor. Data-model and state-sync shape from the Slate plan (element types per highlight class, render function maps type to styled component, structural-change detection syncs editor doc with reducer state) transfers conceptually to Lexical with API-call adjustments — not a full plan rewrite. Process note: original Slate selection was made end-of-session under cognitive fatigue; comparison criteria did not include React-version compat or maintenance signal. A meta-lessons entry covers "cold plans need fresh-context revalidation before execution." Status at decision time: decided; Lexical recon (verify @lexical/react peer deps against React 19, check recent React-19 issues) is next step; no code changes yet. |

---

## Meta-lessons (for future playbook)

Running log of lessons about HOW ventures are run — intake gaps,
workflow discoveries, process improvements — as opposed to what was
built. These are extracted into venture-level playbooks and the
intake checklist at
`second-brain/05_reference/venture-intake-checklist.md`.

Different from Design decisions above: Design decisions capture WHAT
was chosen and why. Meta-lessons capture WHAT THE PROCESS MISSED and
what should have been asked earlier.

### 2026-04-22 — Rich-editing UI surfaces need a real editor framework; React + contentEditable is a structural dead end

**What happened:** Stage 4a's review screen needed a single editing surface with per-line highlighting, inline diff visualization, and freeform text editing. The initial implementation used React to render line <div> children inside a parent with contentEditable=true. This seemed clean: React owns the DOM, contentEditable makes it editable, onInput syncs typing back to state.

In practice, this approach failed across three successive fix attempts over ~3 hours of debugging:

1. **Attempt 1 — Two-pane split (original Stage 4a):** Read-only diff preview stacked over an editable textarea. Worked, but UX was confusing (two stacked text surfaces), so was redesigned during live test.
2. **Attempt 2 — Single contentEditable pane (Fix 1b):** React-owned children with character-offset cursor preservation. Worked for pure typing but broke catastrophically on Enter — Chrome inserted its own bare <div> nodes mid-paragraph, React reconciliation fought with browser-inserted nodes, content duplicated, cursor jumped, text corrupted.
3. **Attempt 3 — contentEditable="plaintext-only" (Fix 6 Option C):** Constrained Chrome's Enter behavior to pure text insertion. Fixed the DOM corruption but introduced cursor positioning bugs, then Fix 6.1 fixed those by rewriting the cursor helper at the line-div level. But then backspace on empty lines revealed the same class of bug: Chrome's native delete modifies DOM; React reconciles; the two systems disagree about which node is which line.

**The root pattern:** React and Chrome's contentEditable both want to own the DOM. React renders children from state; Chrome mutates the DOM on every keystroke, Enter, backspace, paste. When both are active on the same element, their respective "source of truth" diverges. Every fix is a patch to reconcile divergence after it happens — not a solution to the divergence itself.

**What wasn't obvious at intake:** The frontend spec described "editable textarea with diff highlighting" as a single capability. In practice, "editable" and "per-line-styled" are two different technical problems. A plain textarea is editable but unstyleable. A styled div is styleable but not editable. contentEditable-on-a-styled-div appears to solve both but only works for simple cases — and the "simple cases" are narrower than a resume-editing workflow demands.

**The lesson:**

Any product requirement that mixes (a) user-editable text AND (b) per-character or per-line visual styling inside the same rendered surface requires a real editor framework — Slate, Lexical, TipTap, ProseMirror, or CodeMirror depending on use case. Rolling your own with contentEditable on a React-controlled DOM looks deceptively simple for simple demos but does not survive production use.

**Stronger version of the lesson:** If the scoping conversation mentions "text editing with highlights" or "rich editor" or "inline annotations," the architectural answer is "pick an editor framework at intake" — not "we'll implement a simple version first." The "simple version" is a well-known trap: it works for a happy-path demo, then fails on the first real edit pattern a user tries.

**What should change for future ventures:**

- Add a question to `second-brain/05_reference/venture-intake-checklist.md`: "Does this product require user-editable text surfaces with per-character or per-line visual styling? If yes, pick an editor framework at spec-lock time, not during implementation."
- When a frontend spec mentions editing + styling in the same surface, the spec-review should flag this as a "editor framework decision needed" item rather than leaving the implementation approach open.
- For the app-build workflow when it gets automated: the workflow's spec-lock stage should include an "editor framework needed?" yes/no gate, with follow-up questions if yes.

**Cost of this lesson on resume-saas:** ~3 hours of contentEditable debugging tonight after Stage 4a's initial UI came out broken on live test. Net direction is correct (Slate migration is the right fix), but the time would have been saved entirely by picking Slate at spec-lock time. The fact that the Frontend MVP Spec v1 was reviewed and accepted without this question is a gap the intake checklist now closes.

**Related:**
- Build-log design-decisions table row 2026-04-22: "Migrate ProposedPane from contentEditable to Slate.js"
- Today's intake-gap meta-lesson (below this entry) is a similar pattern: a requirement that wasn't surfaced at intake costs hours mid-build. The editor framework gap is another instance of the same category.

---

### 2026-04-22 — Live end-to-end testing is the primary bug-surfacing mechanism; unit tests mock the hard parts

**What happened:** Stage 4a's Section 7 live test (operator manually exercised the review screen with a real resume + real job description) surfaced three distinct bug classes in ~15 minutes of clicking:

1. **Architecture bug:** Two stacked text areas in the middle pane (the "Changes preview" div + the freeform textarea) produced a broken interaction where clicks on the preview put focus on the textarea below, causing reverse-typed characters. This was not caught by any test because no test renders the component and interacts with it.

2. **Applied-logic bug:** `applyProposals` section-detection heuristic failed on a realistic resume. ADD_LINE proposals appended to the end of the document instead of inserting into the target section (resume uses "PROFESSIONAL EXPERIENCE:" — heuristic expected "EXPERIENCE"). REPLACE_LINE silently skipped because line-matching was whitespace-sensitive against bullet-formatted content. No unit test covers realistic resume content; the spec's own language called this "best-effort fallback" but in practice the fallback was the main path.

3. **UX model bug:** Single-level undo was the correct spec behavior but confusing in actual use — users naturally expect "undo" to keep undoing. Option A's "keep selections, explicit label" compromise didn't survive real testing. The visual inconsistency was confusing even with a clarifying label.

**Why it matters:** All three classes of bug are structurally invisible to unit tests as they're currently written. The backend's 40 unit tests mock the orchestrator (so Stage 3's nullable-narrative OpenAI schema bug didn't surface until live testing). The frontend has no tests yet, but when tests are added, they'll likely follow the same pattern — mocking the hard parts (real data, real interactions, real cursor/focus/scroll behavior).

**The pattern, stated plainly:** unit tests mock the parts that fail. Live end-to-end testing with real data is the only mechanism that exercises the unmocked parts. For this venture and likely for most app builds, scheduling dedicated live-test time is not optional — it is the primary bug-surfacing step, and it should happen at every stage boundary where UX or applied-logic could be wrong.

**What should change:**

- Treat live end-to-end testing as a required stage-gate, not an optional last step. Every stage that produces user-facing behavior gets a live test before being marked complete.
- Live tests should use REAL content (real resume, real JD, real user workflow), not minimal synthetic fixtures. The Stage 3 bug and the Stage 4a bugs both required realistic content to surface.
- When writing future specs, flag "best-effort fallback" language as a testing obligation, not a scope reduction. If the fallback is going to be exercised in practice, it needs a real-data test.
- When writing playbooks for app-build workflows, the test-strategy section must distinguish "unit-test-able" logic from "live-test-only" logic. Mixing the two produces false confidence.

**Applicability beyond resume-saas:**

This is not a resume-saas-specific observation. It applies to any venture with user-facing UI, applied heuristics, or external API dependencies. When the app-build workflow in ai-factory eventually gets formalized, "live end-to-end test with real data" should be a named step with the same weight as "unit tests pass."

**Related:**
- Stage 3 build-log entry (2026-04-21): proposal_schema.py nullable-narrative bug surfaced only in live test.
- Stage 4a Section 7 test report (operator notes, 2026-04-22): the three bugs above.
- Follow-on fix prompts (Stage 4a iteration): being produced in the strategic chat.

### 2026-04-22 — Intake gap surfaced mid-build: end-state product vision not captured at start

**What happened:** During Stage 4 planning (PDF export library
choice), a question about export quality prompted the operator to
clarify the product's actual end-state vision: resume-saas is meant
to be a format-preserving resume editor. Users upload a resume in
their own format, the system applies proposals, and the output
preserves the user's original formatting. The MVP currently being
built cannot do this — plain-text paste input discards all
formatting at the input stage. This was a significant mismatch
between what was being built and what the product is ultimately
meant to be.

**Why it matters:** The MVP is not wrong, but without explicit
framing it could have shipped with an unspoken gap between user
expectation and product capability. Caught in time to reframe as
Path C — MVP ships as a proposal-review tool, format preservation
becomes an explicit v2 roadmap item — but the close-call is the
lesson, not the resolution.

**What wasn't asked at intake:**
- What is the end-state product vision, beyond MVP scope?
- What file formats will users realistically input? What formats
  will they want out?
- Is format fidelity a core value proposition, or incidental?
- What does the user's end-to-end workflow actually look like, not
  just the app's happy path?

**Why it wasn't asked:** The strategic files at intake captured
"what to build" (a resume tailoring web app) and "MVP scope"
(proposal generation + review + export). They did not capture the
*product's distinctive value proposition* — the thing that
differentiates it from a ChatGPT prompt. That's where
format-preservation lives. Without it in the intake, every downstream
decision (paste-text inputs, plain-text export, simple PDF template)
was locally correct but collectively built away from the end-state.

**What should change:**
- Intake checklist must include end-state product vision as a
  first-class question, not just MVP scope.
- The intake checklist itself is being created at
  `second-brain/05_reference/venture-intake-checklist.md` as part
  of this capture. Future ventures read from it at kickoff.
- A mini-retro capturing the full arc of this discovery is being
  written at `second-brain/06_retros/2026-04-22_resume-saas-intake-gap-mid-build.md`.

**Additional observation (worth noting for future automation):**
The fact that this gap surfaced as a question — "will export
quality matter?" — and not as a silent miss is because the
strategic chat has a loose discipline of asking "does this tool
scale to end-state?" at library-choice time. That discipline saved
this one. Without it, jspdf would have been picked, the MVP would
have shipped, and the mismatch wouldn't have surfaced until a real
user tried to export.

A secondary observation: this capture itself — the intake
checklist, mini-retro, meta-lessons section — is all produced by
the two-surface strategic/execution workflow already in place. The
workflow surfaced its own gap AND produced the artifacts to prevent
recurrence. That's the system working as designed, and worth
preserving as a pattern when the workflow gets abstracted into a
playbook for future ventures.

---

## Session entries

<!-- New entries appended above this line -->

---

## 2026-04-21 — Stage 3.5: Fix OpenAI strict Structured Outputs schema (Claude Code in VS Code)

### What happened
- Inspected backend/schemas/proposal_schema.py to diagnose the 500 
  error surfaced in Stage 3's live end-to-end test.
- Root cause: the schema returned by json_schema_for_structured_outputs() 
  uses strict=true, but the top-level `narrative` property was declared 
  in `properties` without being listed in `required`. OpenAI's strict 
  Structured Outputs mode requires every property in `properties` to 
  also appear in `required`.
- Fix applied (two lines in json_schema_for_structured_outputs()):
  - Added "narrative" to the top-level required array.
  - Changed narrative's type from "string" to ["string", "null"] so 
    the model can legitimately return null when there's nothing to 
    narrate.
- No changes to validate_proposals() — it already accepts narrative=None.
- No test changes — all 40 backend tests still pass (they mock the 
  orchestrator, so the schema change is invisible to them).
- Verified the nested Proposal items.properties was already correct 
  (all 5 properties listed in required, additionalProperties: false).

### Live end-to-end test (second attempt, post-fix)
- Flask backend restarted on port 8080. Next.js frontend on port 3001.
- Pasted real resume + real job description, clicked Generate.
- Flask logged: POST /api/rewrite → 200
- Frontend transitioned from Processing to Round Trip Successful 
  placeholder.
- Result: 7 proposals returned, narrative=null (rendered as "No 
  narrative returned.")
- The entire stack — browser → Next.js proxy → Flask → orchestrator 
  → OpenAI API → schema validation → proposal ID assignment → JSON 
  response → frontend state update → UI render — is end-to-end 
  verified.

### Decisions made
- Kept narrative in the schema rather than removing it. It's an 
  intentional product feature (high-level summary for the user); 
  nullable-required is the right fit for strict-mode-with-optional-
  content.
- Did not attempt to upstream a test for the OpenAI round trip. All 
  tests continue to mock the orchestrator. A real-API integration 
  test would add flakiness, cost per test run, and an API-key 
  dependency — bad trade for MVP. Revisit post-launch.

### Known debt (still open, unchanged from prior entries)
- rewrite.py collapses all orchestrator exceptions to 500 service_error. 
  An OpenAI config bug (like the one we just fixed) surfaces to users 
  as a generic "Rewrite service failed" rather than anything that 
  helps a developer. Post-MVP polish candidate.
- Orchestrator still unverified against other OpenAI 2.x schema 
  quirks. Today's fix solves the immediate failure; future schema 
  edits (e.g., if we add fields in v1.1) should go through a live 
  sanity check before shipping.

### Artifacts produced
- backend/schemas/proposal_schema.py (2 lines changed in 
  json_schema_for_structured_outputs)

### Next session should start with
Stage 4: implement the real review screen. Three panes (OriginalPane, 
ProposedPane with diff highlighting, ProposalsList), diff visualization 
using the four proposal ops, freeform editing, versioning UI, 
client-side PDF/DOCX export via jspdf and docx libraries.

The MVP is now functionally plumbed end-to-end. Stage 4 turns the 
"Got N proposals" placeholder into the real review/export UX.

---

## 2026-04-21 — Stage 3: Input screen + end-to-end plumbing (Claude Code in VS Code)

### What happened
- Added Next.js rewrite rule in next.config.ts proxying /api/:path*
  to http://localhost:8080/api/:path*, eliminating CORS concerns for
  local dev.
- Created lib/api.ts with callRewrite() — a discriminated-union fetch
  wrapper that maps network failures, HTTP errors, and unexpected
  response shapes to typed error results instead of throwing.
- Created four new components:
  - components/ErrorBanner.tsx — reusable error display with
    dismissible action.
  - components/InputScreen.tsx — two textareas, disabled Generate
    button until both fields non-empty after trim.
  - components/ProcessingScreen.tsx — centered spinner, 60-second
    "Still working…" fallback.
  - components/AppShell.tsx — phase-driven switch; stage-3 placeholder
    for the review phase (Stage 4 replaces it with the real
    ReviewScreen).
- Wired AppProvider into app/layout.tsx at the root (layout stays a
  Server Component; provider creates a client boundary below it).
- Replaced app/page.tsx default create-next-app content with
  <AppShell />.
- Added "Running the dev servers" and "Running the backend tests"
  sections to repos/resume-saas/README.md documenting the canonical
  commands.
- Verified tsc --noEmit clean, npm run dev starts clean.

### End-to-end test (first live backend round trip)
- Ran Flask backend at http://localhost:8080 via:
    .venv/bin/flask --app app run --port 8080
- Ran Next.js frontend at http://localhost:3001 via:
    npm run dev
- Check 1 (empty form): Generate disabled. Pass.
- Check 2 (button toggles with both fields filled): Pass.
- Check 3 (real submit with resume + JD content):
    - Frontend transitioned to Processing screen.
    - Network call reached backend via proxy (Flask logged
      "POST /api/rewrite → 500").
    - Frontend rendered ErrorBanner with code=service_error,
      message="Rewrite service failed."
    - The frontend handled the backend error correctly, exactly as
      specified.

### What the error actually was
Flask terminal traceback revealed an openai.BadRequestError 400 from
the OpenAI Structured Outputs API:

    "Invalid schema for response_format 'resume_edit_proposals': In
    context=(), 'required' is required to be supplied and to be an
    array including every key in properties. Missing 'narrative'."

OpenAI's Structured Outputs feature, when strict=true, requires that
every property declared in `properties` also appear in `required`.
`narrative` is declared in properties but omitted from required in
backend/schemas/proposal_schema.py.

This is NOT a Stage 3 bug. It's a backend schema bug surfaced by the
first live end-to-end test. Stage 3 is complete — the frontend
correctly routed a backend error to the user. The schema fix is
Stage 3.5, tracked separately.

Related backend behavior worth noting: rewrite.py catches any
orchestrator exception as `service_error` / 500. An OpenAI 400
config bug is therefore surfaced to the user as a generic 500.
Semantically slightly wrong but acceptable for MVP; post-MVP polish
could pass through the real status code for configuration errors.

### Decisions made
- Proxy rewrite pattern (option B from the Stage 3 planning) over
  absolute-URL + CORS (option A) or Next.js API routes (option C).
  Rationale: no CORS complexity in dev, no env var required in
  lib/api.ts, single-string swap for production.
- Backend dev port 8080 over 5000 (AirPlay on macOS conflicts) and
  over 3000/3001 (Next.js territory). Chosen as standard Flask/backend
  alt-port.
- Stage 3 scope capped at Input + Processing + placeholder review.
  The real review screen is Stage 4. Not mixing the two keeps
  approvals and commits reviewable.
- Stage 3 considered complete despite the discovered backend schema
  bug. Conflating frontend completion with backend correctness would
  make progress impossible to measure.

### Known debt surfaced (filed, being addressed next in Stage 3.5)
- backend/schemas/proposal_schema.py has `narrative` in properties but
  not in required — violates OpenAI 2.x strict Structured Outputs
  contract. Fix in Stage 3.5.
- rewrite.py returns 500 for any orchestrator exception, including
  OpenAI 400 config bugs. Post-MVP polish candidate.

### Artifacts produced
- repos/resume-saas/frontend/next.config.ts (modified)
- repos/resume-saas/frontend/lib/api.ts (new)
- repos/resume-saas/frontend/components/ErrorBanner.tsx (new)
- repos/resume-saas/frontend/components/InputScreen.tsx (new)
- repos/resume-saas/frontend/components/ProcessingScreen.tsx (new)
- repos/resume-saas/frontend/components/AppShell.tsx (new)
- repos/resume-saas/frontend/app/layout.tsx (modified)
- repos/resume-saas/frontend/app/page.tsx (modified)
- repos/resume-saas/README.md (sections added)

### Next session should start with
Stage 3.5: fix proposal_schema.py so narrative is in required and
the schema passes OpenAI's strict Structured Outputs validation.
Re-run end-to-end test. Verify real proposals come back.

---

## 2026-04-21 — Stage 2.5: Backend dependency manifest + /api prefix (Claude Code in VS Code)

### What happened
- Discovered repos/resume-saas/ had no Python dependency manifest of
  any kind (no requirements.txt, pyproject.toml, Pipfile, or setup.py)
  and that the existing .venv was pre-existing with unknown state.
- Ran a clean inventory of backend imports: Flask, openai, python-docx,
  and pytest (tests-only) as the actual third-party dependencies.
  Confirmed pydantic is not imported anywhere despite being installed
  in environments elsewhere.
- Deleted the existing repos/resume-saas/.venv to eliminate unknown
  state.
- Created fresh .venv with Python 3.12.12. Wrote requirements.txt
  with compatible-release pins.
- Verified manifest completeness via delete-and-recreate cycle:
  installed from manifest, ran 40/40 tests passing, deleted .venv,
  recreated from scratch, installed from manifest again, 40/40 still
  passing. The manifest is sufficient.
- Updated .gitignore with additional Python and IDE artifact patterns.
- Changed repos/resume-saas/app.py to register all three blueprints
  (rewrite_bp, resume_bp, jobs_bp) with url_prefix="/api". Endpoints
  now live at /api/rewrite, /api/resume/parse, /api/jobs/*. Tests call
  handle() directly (no HTTP client), so the prefix change has zero
  test impact — confirmed 40/40 tests still passing.

### Decisions made
- Omit pydantic from requirements.txt until a real import exists
  (verified via grep: zero matches in backend/ and app.py). Add later
  if schema validation gets refactored onto pydantic.
- Omit flask-cors and python-dotenv from MVP manifest. Add when CORS
  wiring and local-env loading become real needs (anticipated during
  Stage 4 integration or deployment).
- Single requirements.txt for MVP (no dev/prod split). Revisit if
  production image size becomes a concern post-deploy.
- Compatible-release pins (>=major.minor,<major+1.0) chosen over exact
  pins. Allows patch/minor upgrades, blocks majors. Reasonable default
  for a small backend.
- openai 2.30.0 installed; v1-style client pattern
  (OpenAI(); client.chat.completions.create()) still works on 2.x per
  upstream changelog. Kept rewrite_orchestrator_v5.py unchanged.

### Known debt (filed, not fixed)
- rewrite_orchestrator_v5.py has NOT been verified end-to-end against
  openai 2.x in a real API call. Tests mock the orchestrator. First
  real proof will come during Stage 3 or Stage 4 integration. If the
  model call errors out due to an unexpected 2.x behavior, fix in
  isolation then.
- repos/resume-saas/app.py is still at repo root (not moved under
  backend/). Structural cleanup deferred; already logged in
  01_current-strategy.md open decisions.

### Artifacts produced
- repos/resume-saas/requirements.txt (new)
- repos/resume-saas/.gitignore (modified)
- repos/resume-saas/app.py (modified)
- repos/resume-saas/.venv/ (recreated clean; not committed, gitignored)

### Test baseline
- 40/40 backend tests passing in a freshly built venv. Baseline
  established for subsequent work.

### Next session should start with
Stage 3 of frontend scaffold: wire AppProvider into app/layout.tsx,
create InputScreen component, create lib/api.ts hitting
POST /api/rewrite, verify a submit reaches the backend.

---

## 2026-04-21 — Stage 2: AppContext + types (Claude Code in VS Code)

### What happened
- Created the state management layer for the frontend: five files under
  repos/resume-saas/frontend/lib/.
  - lib/types.ts — shared TypeScript types (Phase, Proposal,
    ProposalSection, ProposalOp, Version, AppError, AppState).
  - lib/context/actions.ts — discriminated-union Action type (13
    actions including CLEAR_ERROR beyond the spec's named set).
  - lib/applyProposals.ts — pure deterministic function implementing
    the spec's "Proposal application algorithm" with
    findSectionInsertIndex helper for ADD_LINE.
  - lib/context/reducer.ts — pure reducer with initialState; every
    action that touches acceptedProposalIds produces a new Set.
  - lib/context/AppContext.tsx — "use client" provider wrapping
    useReducer, plus useAppState hook with null-guard throw.
- `npx tsc --noEmit` passed with zero errors.
- `npm run dev` started cleanly; default landing page still renders
  (context is not yet wired into layout.tsx — that's Stage 3).

### Decisions made
- `error` field typed as `AppError { code: string; message: string }`
  rather than bare `string`. Rationale: matches the API's `{ error,
  message }` error body shape, so 500 responses can render code and
  message separately later. Minor deviation from spec text ("error:
  string | null") that improves fidelity to the actual backend contract.
- Added `CLEAR_ERROR` action beyond the spec's named list, so that
  "user dismisses error banner" can be dispatched without re-typing
  other input fields to trigger the implicit error-clearing in
  `SET_RESUME_TEXT` / `SET_JOB_DESCRIPTION`.
- Kept the spec's order-sensitivity for `applyProposals`: accepted
  proposals are filtered from the original proposals array (preserving
  API order), not iterated from the Set.
- Used `React.Context.Provider` form rather than React 19's new bare
  `<Context value={...}>` form. More universally recognized pattern.

### Known limitations (filed, not fixed)
- `findSectionInsertIndex` inserts just before the next section header.
  If the current section has trailing blank lines, new lines from
  ADD_LINE get inserted after the blanks rather than at the semantic
  "end" of the section. Spec explicitly scopes this as "best-effort
  heuristic." Acceptable for MVP; revisit in v1.1.

### Artifacts produced
- repos/resume-saas/frontend/lib/types.ts (new)
- repos/resume-saas/frontend/lib/context/actions.ts (new)
- repos/resume-saas/frontend/lib/applyProposals.ts (new)
- repos/resume-saas/frontend/lib/context/reducer.ts (new)
- repos/resume-saas/frontend/lib/context/AppContext.tsx (new)

### Next session should start with
Stage 3: wire AppProvider into app/layout.tsx, create InputScreen
component, create lib/api.ts (centralized fetch wrapper for
POST /api/rewrite), and verify a submit from the UI reaches the
backend (backend /api prefix work still pending — may need to happen
either as part of Stage 3 or right before it).

### Open questions for next session
- Should the backend /api prefix change happen before Stage 3's API
  wiring, or after Stage 3 scaffolding with /rewrite as the interim
  target? Leaning before, so frontend codes against the final URL.

---

## 2026-04-21 — Workspace CLAUDE.md versioning: deferred

### What happened
- Encountered: workspace/CLAUDE.md is edited and on disk but has no
  git repo to commit into. Workspace root is not initialized as a repo.
- Evaluated four options: init workspace as superproject repo, symlink
  into ai-factory, move into ai-factory, defer.
- Decision: defer. File remains at workspace/CLAUDE.md, uncommitted,
  local-only.

### Decisions made
- No versioning for workspace/CLAUDE.md at this time.
- Revisit this decision when: (a) working on a second machine, (b)
  collaborating with another person, (c) workspace grows more
  cross-cutting files that need tracking.

### Known risk accepted
- workspace/CLAUDE.md content is not recoverable from git if local
  disk is lost. Content pattern is documented in this chat history and
  in the strategic chat. Manual reconstruction is possible but tedious.

### Artifacts touched
- None (decision only, no file changes in this entry)

### Next session should start with
- Stage 2 of frontend scaffold: AppContext + types.

---

## 2026-04-21 — Stage 1: Next.js scaffold + Tailwind (Claude Code in VS Code)

### What happened
- Initialized Next.js project in repos/resume-saas/frontend/ via `npx create-next-app@latest` with TypeScript, Tailwind, ESLint, App Router, no src-dir, @/* import alias, npm.
- Verified TypeScript strict mode enabled (already true by default).
- Stripped default create-next-app styles from app/globals.css; kept only `@import "tailwindcss"` and the `@theme inline` block mapping Geist fonts to Tailwind tokens.
- Preserved empty components/ and lib/ directories with .gitkeep files.
- Ran `npm run dev` — server started on port 3001 (3000 was occupied by another process on this machine) with zero errors or warnings.
- Deleted frontend/CLAUDE.md (auto-generated by create-next-app; conflicts with our one-CLAUDE.md-per-scope convention). Kept frontend/AGENTS.md as reference material — it's a one-line pointer to node_modules/next/dist/docs/ for version-specific docs.

### Decisions made
- Accept current stable versions (Next.js 16.2.4, React 19.2.4, Tailwind v4) rather than pinning to older versions. Captured in Design decisions table.
- Keep frontend/AGENTS.md (created by installer) as reference material. Delete frontend/CLAUDE.md to avoid convention conflict.
- Use port 3001 for dev when 3000 is occupied; will be made explicit in docker-compose later.

### Artifacts produced / touched
- repos/resume-saas/frontend/package.json (new)
- repos/resume-saas/frontend/tsconfig.json (new)
- repos/resume-saas/frontend/next.config.ts (new)
- repos/resume-saas/frontend/eslint.config.mjs (new)
- repos/resume-saas/frontend/postcss.config.mjs (new)
- repos/resume-saas/frontend/next-env.d.ts (new)
- repos/resume-saas/frontend/app/layout.tsx (new, create-next-app default)
- repos/resume-saas/frontend/app/page.tsx (new, create-next-app default)
- repos/resume-saas/frontend/app/globals.css (new, stripped to Tailwind import + @theme)
- repos/resume-saas/frontend/app/favicon.ico (new)
- repos/resume-saas/frontend/AGENTS.md (new, kept)
- repos/resume-saas/frontend/README.md (new, create-next-app default)
- repos/resume-saas/frontend/package-lock.json (new)
- repos/resume-saas/frontend/public/ (SVG assets from create-next-app)
- repos/resume-saas/frontend/.gitignore (new, from installer)

### Version drift from original spec
The original frontend-mvp-spec-v1.md said "Next.js 14+ App Router" and
described Tailwind in v3 terms (three @tailwind directives). Actual
installed:
- Next.js 16.2.4 (current stable, released March 2026)
- React 19.2.4 (pulled in by Next.js 16)
- Tailwind v4 (single @import "tailwindcss" line replaces the three
  @tailwind directives)

The spec's core patterns (single route, state machine, React Context +
reducer, utility-class styling) are unaffected. Spec will be updated in
a follow-up task or we can leave the spec as-is and document actuals in
build-log.

### Open decisions surfaced
- Whether to update frontend-mvp-spec-v1.md to reflect actual versions
  or leave the spec + document in build-log. Deferred to next step.

### Next session should start with
Update workspace CLAUDE.md with Session End Protocol trigger phrase
and Working with the Strategic Chat section. Then Stage 2: AppContext +
types.

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
