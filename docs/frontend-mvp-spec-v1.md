# Frontend MVP Spec v1

## Purpose

Define the architecture, user flow, state model, and component structure
for the resume-saas frontend MVP. This spec is the authoritative contract
for the Next.js application built in `repos/resume-saas/frontend/`. No
scaffold code is written until this spec is reviewed and accepted.

---

## Revision History

- **2026-04-22:** Post-live-test revision. Reverted to single middle
  pane (contentEditable) with inline per-op highlighting; expanded
  undo to multi-level; added Toggle All action; changed Restore
  Original to clear both text and acceptedProposalIds. See
  `repos/resume-saas/docs/build-log.md` Design Decisions table and
  Meta-lessons section for rationale.

---

## Scope

This spec covers the MVP web UI that lets a user:

1. Paste a resume and a job description.
2. Submit them to the existing backend `POST /api/rewrite` endpoint.
3. Review returned edit proposals side-by-side with the original resume.
4. Accept or reject individual proposals.
5. Freeform-edit the resulting resume.
6. Save snapshots (versions) in browser memory.
7. Export any version as PDF, DOCX, or copied plain text.

It does not cover: authentication, backend persistence, file upload,
URL scraping of job postings, server-side export, real-time
collaboration, analytics, payments, account management, inline-diff
proposal editing, or mobile-optimized layouts beyond basic responsive
Tailwind behavior.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14+ with App Router |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS (utility classes only; no CSS modules, no styled-components) |
| State | React Context + hooks (no Redux, Zustand, or Jotai) |
| HTTP | Native `fetch`, wrapped in a centralized API client (`lib/api.ts`) |
| PDF export | `jspdf` (client-side) |
| DOCX export | `docx` (client-side) |
| Clipboard | Native `navigator.clipboard` API |
| Auth | None (MVP) |
| Persistence | None (MVP — all state in browser memory, lost on page refresh) |

---

## Routing

**Single route.** The entire MVP runs at `/`. State transitions between
screens are driven by a state-machine field in React Context, not by URL
changes. Rationale: persisting in-memory state across route changes adds
complexity without user benefit in MVP. Bookmarkable deep-linking and
per-screen URLs are explicit non-goals for v1.

---

## State Machine

The app has three logical screens driven by a `phase` value:

- `input` — user is entering resume and job description
- `processing` — POST /api/rewrite is in flight
- `review` — proposals returned; user is accepting/rejecting/editing

Transitions:

- `input` → `processing`: user clicks "Generate" with both fields non-empty
- `processing` → `review`: API returns 200 with valid proposals
- `processing` → `input`: API returns error; user sees error message on input screen
- `review` → `input`: user clicks "Start over"

No other transitions exist in v1.

---

## Screen 1 — Input

**Purpose:** Collect the two required text inputs.

**Layout:** Two large textareas stacked vertically (or side-by-side on
wide viewports). Above each: a label. Below both: a single "Generate"
button.

**Fields:**

- **Resume (paste text):** Multi-line textarea, min ~12 rows visible.
  Placeholder text explains "Paste your resume here."
- **Job Description (paste text):** Multi-line textarea, min ~12 rows
  visible. Placeholder text explains "Paste the full job description here."

**Input format:** Paste-text only in MVP. File upload (PDF, DOCX) and
URL scraping for job descriptions are explicit non-goals; they come in v1.1.

**Validation:**

- "Generate" button is disabled while either field is empty (after
  trimming whitespace).
- No character limits enforced in MVP (backend will error on empty; any
  length above zero proceeds).

**On Generate click:**

- Transition `phase` to `processing`.
- Call `POST /api/rewrite` with `{ resume_text, job_description }`.

**Error display:**

- If the API call fails (network error, 400, or 500), transition `phase`
  back to `input` and display an error banner above the form explaining
  what happened in plain language.
- The user's input is preserved across the failed attempt.

---

## Screen 2 — Processing

**Purpose:** Keep the user oriented while the synchronous API call runs.

**Layout:** Full-screen centered container with:

- A spinner or animated indicator
- A status message: "Tailoring your resume…"
- A secondary line: "This usually takes 10–30 seconds."

**Behavior:**

- No user interaction beyond the implicit wait. No cancel button in MVP.
- If the call takes longer than 60 seconds, display an additional line:
  "Still working…" Do not auto-cancel.

**No polling.** The rewrite endpoint is synchronous. The frontend holds
open a single HTTP request and waits for the response.

---

## Screen 3 — Review & Export

**Purpose:** Let the user inspect proposals, accept/reject them,
freeform-edit the result, save versions, and export.

### Layout

Three panes in a responsive layout (stacked on narrow viewports):

1. **Left pane — Original resume.** Read-only. Displays `resume_text`
   as submitted.
2. **Center pane — Proposed resume.** Single editable surface
   implemented as a `<div contentEditable>`. Renders the resume with
   all currently-accepted proposals applied AND per-op diff
   highlighting inline. The same surface is used for freeform editing
   — there is no separate read-only preview. Typing-level undo is
   handled by the browser's native Ctrl+Z / Cmd+Z within this
   element.
3. **Right pane — Proposals list.** Scrollable panel showing every
   proposal returned by the API as a card. Card structure is
   unchanged from the prior design (section badge, op badge, before
   text, after text, rationale, toggle). Above the list, a single
   **"Accept all" / "Reject all"** button (three-state label based
   on current acceptedProposalIds).

Above the center pane: a narrative banner if the API returned a
`narrative` string. Below the center pane: action buttons:

- **Undo last toggle** — pops one entry off the undo stack; reverts
  both text state and checkbox state. Disabled when undo stack is
  empty.
- **Clear all edits and selections** — resets center pane to original
  resume text, clears acceptedProposalIds, clears the undo stack.
  (Replaces the previous "Restore original text (keeps proposal
  selections)" button.)
- **Save as version** (Stage 4b)
- **Export** dropdown (Stage 4b)
- **Start over**

### Diff visualization

Per-op highlighting is applied inline within the contentEditable
middle pane. The pane's content is structured as a sequence of line
elements (each a `<div>`), and highlighted line elements receive
Tailwind background classes:

- ADD_LINE: added line gets `bg-green-100 text-green-900`
- REPLACE_LINE: replacement line gets `bg-yellow-100 text-yellow-900`
- REPLACE_PHRASE: the containing line gets `bg-yellow-100 text-yellow-900`
- DELETE_LINE: a ghost row showing the deleted original line is
  rendered at the deletion point with `bg-red-100 text-red-900 
  line-through`. The ghost row is itself contentEditable:false so
  the user can't accidentally type into it.

Because contentEditable is used, the user can click anywhere in the
rendered content and type to make freeform edits. Edits that modify
highlighted regions cause those regions to be re-evaluated on the
next re-render (the highlight may disappear if the edit breaks the
proposal's `before` or `after` match).

Inline proposal popovers (clicking a change to see its rationale
directly in the editor) remain deferred to v1.1. The right pane's
proposal cards are the authoritative rationale surface.

### Proposal toggle behavior

When the user toggles a proposal on or off:

1. The current `{ currentText, acceptedProposalIds }` pair is pushed
   onto the undo stack.
2. `acceptedProposalIds` is updated to reflect the toggle.
3. `currentText` is regenerated from scratch as
   `original resume text + all currently-accepted proposals applied`
   via the `applyProposals` function.
4. Any freeform edits the user had made in the center pane are
   discarded. This is the intentional tradeoff: toggles are the
   primary interaction during the "decide what to change" phase;
   freeform editing is for final polish.
5. The user's scroll position in the middle pane is preserved; the
   cursor is reset to the start of the pane with focus preserved if
   the pane was focused.

Toggle All works the same way but pushes a single undo-stack entry
representing the full change, not one entry per proposal toggled.

### Undo (multi-level, toggles only)

The undo stack is an unbounded stack of 
`{ text: string, acceptedProposalIds: Set<number> }` snapshots. It is
pushed on every TOGGLE_PROPOSAL and TOGGLE_ALL. It is cleared by
RESTORE_ORIGINAL and START_OVER.

The "Undo last toggle" button pops the top entry and restores both
`currentText` and `acceptedProposalIds` from that snapshot. The
button is disabled when the stack is empty.

Freeform typing edits are NOT pushed onto the undo stack. They are
handled by the browser's native undo (Ctrl+Z / Cmd+Z) within the
contentEditable element. This is intentional: mixing toggle-level
and character-level undo semantics produces confusing behavior.

There is no redo. Multi-level undo covers the "I clicked too many
toggles" case; if the user wants to re-accept a proposal, they click
its toggle again (which pushes a new undo-stack entry).

### Clear all edits and selections

A "Clear all edits and selections" button resets review state to its
post-API-response baseline:

- `currentText` is reset to the raw original resume text
- `acceptedProposalIds` is cleared to an empty Set
- The undo stack is cleared
- The proposals array and the original inputs are preserved

Semantically: "I want to start the review over, but I don't want to
re-submit to the API." This is a harder reset than Undo but softer
than Start Over (which also re-requires the user to paste inputs and
wait for the API round-trip).

The button is always enabled; there is no "dirty" state check. If
review state is already at the baseline, clicking is a no-op.

### Freeform editing

The center pane is a fully editable textarea. Users can type anywhere,
paste, delete. Edits persist until the user toggles a proposal (see
above) or clicks Restore original.

### Versioning

The app maintains an in-memory array of saved versions:

- **v1** is always the original resume text (auto-populated; not user-saved).
- **v2, v3, …** are snapshots the user creates by clicking "Save as
  version." Each save captures the current center-pane text.
- A version list UI (sidebar, dropdown, or inline list) lets the user
  view saved versions and load any of them back into the center pane as
  the current working state. Loading a version replaces the center pane
  text; it does not affect proposal toggles.
- Deletion of versions is not supported in MVP.
- All versions are lost on page refresh. No persistence.

### Export

The user can export any version (or the current working state) as:

- **PDF** — generated client-side via `jspdf` from the version's plain text.
- **DOCX** — generated client-side via `docx` from the version's plain text.
- **Copy to clipboard** — native `navigator.clipboard.writeText()` call.

Exports are plain-text formatted — no rich styling, no fonts beyond
default, no embedded images. Output-quality improvements (typography,
template rendering) are deferred; if client-side quality proves
insufficient, a server-side export endpoint is the v1.1 fallback.

### Start over

A "Start over" button transitions `phase` back to `input` and clears all
state except, optionally, the user's last-submitted inputs (TBD during
build; default: clear everything).

---

## API Contract

Authoritative spec: `ai-factory/docs/rewrite-api-spec-v1.md`. The
frontend codes against that spec.

Summary:

- `POST /api/rewrite` with
  `{ resume_text: string, job_description: string }`
- 200 response: `{ proposals: Proposal[], narrative?: string }`
- Each `Proposal` has:
  - `id: number`
  - `section: "SUMMARY" | "SKILLS" | "EXPERIENCE"`
  - `op: "REPLACE_LINE" | "ADD_LINE" | "DELETE_LINE" | "REPLACE_PHRASE"`
  - `before: string[]` (length 1 for REPLACE_LINE, REPLACE_PHRASE)
  - `after: string[]` (length 1 for REPLACE_LINE, REPLACE_PHRASE; `[""]` for DELETE_LINE)
  - `rationale: string`
- Error responses: `400 invalid_json`, `400 missing_field`,
  `500 service_error`, `500 invalid_output`. All error bodies:
  `{ error: string, message: string }`.

---

## React Context shape

A single `AppContext` at the root of the app holds:

```ts
type Phase = "input" | "processing" | "review";

type Proposal = {
  id: number;
  section: "SUMMARY" | "SKILLS" | "EXPERIENCE";
  op: "REPLACE_LINE" | "ADD_LINE" | "DELETE_LINE" | "REPLACE_PHRASE";
  before: string[];
  after: string[];
  rationale: string;
};

type Version = {
  label: string;     // e.g., "v1", "v2"
  text: string;      // snapshot of resume text
  createdAt: number; // Date.now()
};

type UndoEntry = {
  text: string;
  acceptedProposalIds: Set<number>;
};

type AppState = {
  phase: Phase;

  // Inputs
  resumeText: string;
  jobDescription: string;

  // API response
  proposals: Proposal[];
  narrative: string | null;

  // Review state
  acceptedProposalIds: Set<number>;  // which proposals are currently accepted
  currentText: string;               // center-pane text (freeform-editable)
  undoStack: UndoEntry[];            // multi-level undo stack of toggle-level snapshots
  versions: Version[];               // saved snapshots (v1..vN)

  // UI
  error: string | null;
};
```

Reducer-style actions (exact names TBD during implementation):

- `SET_RESUME_TEXT`, `SET_JOB_DESCRIPTION`
- `START_GENERATE` (transitions to `processing`)
- `GENERATE_SUCCESS` (stores proposals, narrative; initializes `v1`,
  `currentText`, empty `acceptedProposalIds`; transitions to `review`)
- `GENERATE_FAILURE` (stores error, transitions back to `input`)
- `TOGGLE_PROPOSAL` (pushes current `{ text, acceptedProposalIds }` onto undoStack; updates acceptedProposalIds; regenerates currentText from original + accepted proposals)
- `TOGGLE_ALL` (pushes current `{ text, acceptedProposalIds }` onto undoStack; toggles acceptedProposalIds to all-on if any are off, all-off otherwise; regenerates currentText)
- `EDIT_CURRENT_TEXT` (sets `currentText`; does NOT push to undoStack — typing-level undo is handled by browser-native Ctrl+Z in the contentEditable element)
- `UNDO` (pops the top entry from undoStack; restores both currentText and acceptedProposalIds from the snapshot; no-op if stack is empty)
- `RESTORE_ORIGINAL` (sets `currentText` to original `resumeText`; clears acceptedProposalIds; clears undoStack; button labeled "Clear all edits and selections" in the UI)
- `SAVE_VERSION` (appends snapshot to `versions`)
- `LOAD_VERSION` (sets `currentText` to the chosen version's text)
- `START_OVER` (resets state; transitions to `input`)

---

## Proposal application algorithm

The "currently accepted" proposal set is applied to the original resume
text to produce `currentText` on every toggle. This function is
deterministic and runs client-side.

Input: original resume text (string), array of accepted `Proposal`s.
Output: transformed text (string).

Algorithm:

1. Split original resume into lines.
2. For each accepted proposal, in API-returned order:
   - `REPLACE_LINE`: find the first line matching `before[0]` exactly
     (after trimming). Replace it with `after[0]`.
   - `REPLACE_PHRASE`: find the first occurrence of `before[0]` as a
     substring anywhere in the text. Replace it with `after[0]`.
   - `ADD_LINE`: append `after[0]` to the end of its section. Section
     detection is best-effort heuristic matching against common headers
     (e.g., "SUMMARY", "Summary", "SKILLS", "Skills", etc.); if no
     header is found, append to end of document.
   - `DELETE_LINE`: find the first line matching `before[0]` exactly
     (after trimming) and remove it.
3. If a proposal's `before` text cannot be found (the original has
   already been mutated by a prior proposal), skip it silently. Log a
   warning to the console.
4. Re-join lines with `\n` and return.

This algorithm is deliberately simple. Edge cases (overlapping
proposals, section detection failures, multiple matches) are handled
by best-effort fallbacks rather than explicit resolution logic.

**Known limitations surfaced during Stage 4a live testing (2026-04-22):**

- Section detection for ADD_LINE currently fails on resumes that use
  qualified section headers (e.g., "PROFESSIONAL EXPERIENCE:" rather
  than "EXPERIENCE"). The fallback is "append to end of document,"
  which is visually wrong. Fix in progress — will use case-insensitive
  substring matching against known section keywords (SUMMARY,
  SKILLS, EXPERIENCE).
- REPLACE_LINE matching is whitespace-sensitive against bullet-
  formatted content (e.g., "• Led team of 5" in the original vs.
  "Led team of 5" in the proposal's `before[0]`). Matches fail
  silently. Fix in progress — will strip leading bullet glyphs and
  normalize whitespace before comparison.

These limitations are being addressed in the Stage 4a iteration
following the live test. Post-fix, the "best-effort fallback"
framing applies to true edge cases, not to main-path behavior.

This approach remains acceptable for MVP because:

- Proposals from the orchestrator are generated against the current
  resume text, so `before` references should be valid.
- Users can always freeform-edit or restore original.

Robustness improvements (fuzzy matching, conflict detection, explicit
section structure) are deferred.

---

## Component structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout, wraps children in AppProvider
│   ├── page.tsx            # Root route; renders <AppShell />
│   └── globals.css         # Tailwind directives only
├── components/
│   ├── AppShell.tsx        # Top-level component; reads phase, renders correct screen
│   ├── InputScreen.tsx     # Screen 1
│   ├── ProcessingScreen.tsx # Screen 2
│   ├── ReviewScreen.tsx    # Screen 3 (composes panes below)
│   ├── OriginalPane.tsx    # Read-only original resume display
│   ├── ProposedPane.tsx    # Single contentEditable center pane with inline per-op diff highlighting
│   ├── ProposalsList.tsx   # Right-pane list of proposal cards; includes "Accept all" / "Reject all" button
│   ├── ProposalCard.tsx    # Individual proposal with toggle
│   ├── VersionSidebar.tsx  # Saved versions UI
│   ├── ExportMenu.tsx      # PDF/DOCX/Clipboard dropdown
│   └── ErrorBanner.tsx     # Reusable error display
└── lib/
    ├── api.ts              # Centralized fetch wrapper for /api/rewrite
    ├── applyProposals.ts   # Proposal application algorithm
    ├── exportPdf.ts        # jspdf wrapper
    ├── exportDocx.ts       # docx wrapper
    ├── context/
    │   └── AppContext.tsx  # Context provider + reducer + hooks
    └── types.ts            # Shared TypeScript types (Proposal, Version, etc.)
```

All client components must declare `"use client"` at the top. Pure
display components (no state, no handlers) may remain server components.

---

## Styling conventions

- Tailwind utility classes only.
- No custom CSS beyond `globals.css` (which contains only the three
  Tailwind directives: `@tailwind base; @tailwind components; @tailwind
  utilities;`).
- Responsive design: mobile-first breakpoints (`sm`, `md`, `lg`). On
  narrow viewports, the three review panes stack vertically.
- Color palette: Tailwind default grays for structure; green-100 /
  red-100 / yellow-100 for diff highlighting; blue-600 for primary
  actions.
- No dark mode in MVP.

---

## Error handling

| Source | Handling |
|---|---|
| Network failure (offline, DNS, etc.) | Error banner: "Network error — check your connection and try again." Stay on input screen. |
| 400 invalid_json | Should not happen in practice; if it does, display raw error message. Stay on input screen. |
| 400 missing_field | Should not happen (frontend validates before submit); display raw error if it does. Stay on input screen. |
| 500 service_error | Error banner: "Something went wrong on our side. Please try again in a moment." Stay on input screen. |
| 500 invalid_output | Error banner: "We got an unusable response. Please try again." Stay on input screen. |
| Unexpected response shape | Same as 500 invalid_output. |

All errors preserve the user's inputs on the input screen. No input is
ever lost due to an error.

---

## Non-goals (explicit, do not implement in MVP)

- User accounts, login, session management
- Backend persistence of resumes, JDs, proposals, or versions
- File upload (PDF, DOCX) — paste-text only
- URL scraping of job postings
- Server-side PDF/DOCX export
- Inline proposal popovers in the diff view (deferred to v1.1)
- Redo (multi-level undo is implemented; redo is not)
- Keyboard shortcuts
- Real-time collaboration
- Analytics / telemetry
- Payments / billing
- Dark mode
- i18n / localization
- Mobile-optimized layouts beyond basic responsive Tailwind
- Accessibility beyond Tailwind's defaults and basic semantic HTML
  (comprehensive a11y audit is post-MVP)

---

## Exit condition

This spec is complete when:

1. `repos/resume-saas/docs/frontend-mvp-spec-v1.md` is written and reviewed.
2. The spec is accepted as the contract for the scaffold.
3. Implementation of `repos/resume-saas/frontend/` begins only after acceptance.
