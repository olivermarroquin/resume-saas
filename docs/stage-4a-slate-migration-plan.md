# Stage 4a Slate Migration Plan

**Created:** 2026-04-22 (end of session, ~3 hours into contentEditable debugging)
**Status:** Ready to execute. Read this first thing when resuming.
**Estimated execution time:** 2-4 hours including test and close-out.

---

## TL;DR

Tonight, the ProposedPane (middle pane of the Review screen) was rebuilt three times as a React-controlled contentEditable surface. All three versions failed live testing. The root cause is structural: React and Chrome's contentEditable both want to own the DOM during editing, and their respective "source of truth" diverges on every user interaction (Enter, backspace, paste, multi-line select). Every fix we tried patched a symptom of the divergence; none addressed the divergence itself.

Tomorrow's work: replace the contentEditable surface with a Slate.js editor. Slate owns the editor abstraction; React wraps it; AppContext still holds state; the per-op highlighting becomes element-type styling inside Slate's render function. This is a component replacement, not a patch.

All prior work is preserved: types, actions, reducer, cursor-helper learnings (valuable as diagnostic), AppContext, OriginalPane, ProposalsList, ReviewScreen, layout fixes. Only ProposedPane and the `lib/diffPreview.ts` helper need to be migrated.

---

## Why this came up

### Symptom timeline

The Stage 4a live test (2026-04-22) exposed a class of contentEditable bugs in ProposedPane. Three rounds of fixes each resolved one bug surface and revealed another:

**Round 1 — ProposedPane initial build (Fix 1b)**

- Approach: `<div contentEditable>` wrapping React-rendered line `<div>` children with per-op highlight classes. Character-offset cursor preservation via useRef + useEffect.
- Broke on Enter: Chrome inserted bare `<div>` nodes mid-paragraph, React reconciliation produced duplicate content, cursor jumped to wrong line.

**Round 2 — contentEditable="plaintext-only" (Fix 6 Option C)**

- Approach: constrain Chrome's Enter behavior by using the plaintext-only mode.
- Broke on cursor positioning: our character-offset helpers used a TreeWalker that skipped over `<div><br></div>` empty lines (no text node inside), so the cursor landed one line off.

**Round 3 — Line-div walker (Fix 6.1)**

- Approach: rewrite the cursor helpers to walk line `<div>` children instead of text nodes. Handle empty lines explicitly.
- Fixed Enter. Broke on backspace across empty lines: Chrome's native delete modifies the DOM; React reconciles against the modified DOM; state updates with wrong content; cursor restores to wrong position; next keystroke goes to wrong place; pattern cascades.

### Root cause

React renders line divs from `computeDiffLines(currentText, ...)`. Chrome's contentEditable mutates those same divs on every keystroke. When the user types a character into a text node, both systems agree — React sees the new text via onInput, re-renders, reconciliation finds the same children, nothing structural changes.

But when the user presses Enter, backspace, or pastes multi-line content, Chrome changes DOM structure: splits nodes, inserts bare divs, creates or removes text nodes. React's reconciliation then runs against a DOM that has children React didn't produce. Reconciliation can't safely match them — there are no keys, classes don't match, parent-child relationships diverge. The result is unpredictable: sometimes React replaces the browser's nodes, sometimes it leaves them alone, sometimes content gets duplicated because React thinks a node is missing when it's actually been reparented.

This is not a bug in any single line of our code. It's a consequence of the architecture: you cannot have two independent systems (React's reconciler and the browser's contentEditable implementation) both writing to the same DOM without one of them winning conflicts. For pure-typing flows they happen to agree, which is why casual demos work. For production editing workflows they diverge, which is why resume-editing broke.

### Why patching can't fix it

Each fix we tried moved the divergence point:
- Fix 1b: kept both systems active; divergence on Enter.
- Fix 6 Option C: constrained what Chrome inserts; divergence on cursor position.
- Fix 6.1: improved our reading of the DOM; divergence on backspace.

There is no fix that makes React and contentEditable agree on who owns the DOM. The only structural solution is to remove one of them from the equation.

---

## Why Slate

### The framework choice

Three real candidates for replacing contentEditable with a library that owns the editing abstraction:

- **Slate.js** — React-native, ~100kb gzip, immutable document model, plugin system, mature (v0.90+ stable).
- **Lexical (Meta)** — More featured, ~200-300kb gzip, good extensibility, newer.
- **TipTap/ProseMirror** — Powerful, steeper learning curve, ~200kb+.

Slate chosen because:
1. **Bundle size** — ~100kb is the lightest real option. Matches the tradeoff decisions already made (react-pdf for quality, accept bundle cost).
2. **React-native API** — `<Editable>` component, hooks-based editor instance, no shim layer. Fits the existing codebase.
3. **Element-type styling** — Slate's `renderElement` function maps node types to React components. Our per-op highlighting (REPLACE_LINE yellow, ADD_LINE green, DELETE_LINE red-strike) becomes four element types with styled render functions. Natural fit.
4. **v1.1 roadmap alignment** — Inline proposal popovers (currently deferred) are naturally expressible as Slate inline nodes. Picking Slate now keeps v1.1 cheap.

### What "migration" actually means

NOT a rewrite of Stage 4a. Preserved intact:

- `lib/types.ts` — AppState, Proposal, UndoEntry, Version. Unchanged.
- `lib/context/actions.ts` — Full action union. Unchanged.
- `lib/context/reducer.ts` — TOGGLE_PROPOSAL, TOGGLE_ALL, UNDO, RESTORE_ORIGINAL, EDIT_CURRENT_TEXT, everything else. Unchanged.
- `lib/applyProposals.ts` — Proposal application algorithm with Fix 2's section detection and line matching. Unchanged.
- `lib/api.ts` — Backend call. Unchanged.
- `components/OriginalPane.tsx` — Unchanged.
- `components/ProposalsList.tsx`, `ProposalCard.tsx` — Unchanged.
- `components/ReviewScreen.tsx` — Unchanged. (Fix 5.2 layout stays.)
- `components/AppShell.tsx`, `InputScreen.tsx`, `ProcessingScreen.tsx`, `ErrorBanner.tsx` — All unchanged.
- `app/layout.tsx`, `app/page.tsx`, `globals.css` — All unchanged.
- Backend — Unchanged.

Rewritten:

- `components/ProposedPane.tsx` — Full replacement. Drops the cursor-helper code (obsolete), the contentEditable div, the diff-preview sub-section.
- `lib/diffPreview.ts` — Likely obsolete after migration, since diff-line computation becomes a render-time mapping from state to Slate document, not a standalone helper. Possibly deletable. Decide during implementation.

New:

- `package.json` — Add `slate` and `slate-react` dependencies.

---

## Proposed implementation approach

**Framing: this is a proposed design, to be validated against Slate's documentation at implementation time. Tomorrow-you should read Slate's quickstart (https://docs.slatejs.org/walkthroughs/01-installing-slate) before committing to this specific shape. If Slate's idioms suggest a cleaner approach, take it — this plan is a starting point, not a spec to follow literally.**

### Data model

Slate's document is a tree of nodes. Our use case maps to:

- Root document = array of line nodes
- Each line node = an element with `type` field and a text leaf child
- `type` values: `"plain"`, `"add"`, `"replace"`, `"delete-ghost"` — matching our four highlight states

Proposed element shape:

```typescript
type LineElement = {
  type: "plain" | "add" | "replace" | "delete-ghost";
  children: [{ text: string }];
};

type Descendant = LineElement;
```

Each line is a block-level element with exactly one text child. Users edit the text child. Enter creates a new block element. Backspace at start of a block merges it into the previous block. Standard Slate behavior.

### Render function

```typescript
// Proposed shape. Validate against Slate docs.
const renderElement = useCallback((props: RenderElementProps) => {
  const { attributes, children, element } = props;
  const el = element as LineElement;
  const cls = HIGHLIGHT_CLASS[el.type];
  const isGhost = el.type === "delete-ghost";
  return (
    <div
      {...attributes}
      className={`px-1 rounded-sm whitespace-pre-wrap ${cls}`}
      contentEditable={isGhost ? false : undefined}
    >
      {children}
    </div>
  );
}, []);
```

### State sync

Two directions:

**State → Slate (on toggle / undo / restore / start-over):**

When `acceptedProposalIds` or `undoStack.length` changes, compute the new logical text via `applyProposals(resumeText, accepted)`, then convert that text + proposal metadata into a Slate document value.

```typescript
// Proposed. Validate.
function textAndProposalsToSlateValue(
  text: string,
  resumeText: string,
  acceptedProposals: Proposal[],
): Descendant[] {
  // Reuse the existing computeDiffLines logic — it already maps 
  // (text, acceptedProposals, resumeText) to a sequence of lines 
  // with highlight types. Adapt its output to LineElement shape.
  const diffLines = computeDiffLines(text, resumeText, acceptedProposals);
  return diffLines.map((dl) => ({
    type: highlightToElementType(dl.highlight),
    children: [{ text: dl.text }],
  }));
}
```

Editor value is updated imperatively via `editor.children = newValue; editor.onChange()` or (per Slate idioms) by resetting the editor. Validate at implementation time — Slate has specific patterns for programmatic value replacement that don't break the editor's internal invariants.

**Slate → State (on user editing):**

Slate's `<Editable onChange>` fires whenever the document changes. Read the new document, convert to plain text (join children with `\n`), dispatch `EDIT_CURRENT_TEXT`.

```typescript
// Proposed. Validate.
const handleChange = (value: Descendant[]) => {
  const text = value
    .filter((node) => (node as LineElement).type !== "delete-ghost")
    .map((node) => (node as LineElement).children[0].text)
    .join("\n");
  dispatch({ type: "EDIT_CURRENT_TEXT", payload: text });
};
```

### Structural change detection

Current ProposedPane distinguishes structural (toggle / undo / restore) from typing-driven renders using acceptedIdsKey and undoDepth refs. This logic mostly transfers:

- On typing: React re-renders but Slate's editor owns its own state; we do NOT need to sync anything back into Slate. Don't call editor.children = ... on every render — that would wipe the user's cursor.
- On structural change: we DO want to replace the editor's document with a fresh one computed from the new `acceptedProposalIds`. Detect via the same key/depth comparison we use now.

Implementation sketch (validate against Slate):

```typescript
// Proposed. Validate.
useEffect(() => {
  const structuralChange =
    prevAcceptedKeyRef.current !== acceptedIdsKey ||
    prevUndoDepthRef.current !== undoDepth;
  
  if (structuralChange) {
    // Replace the editor's document with a fresh one.
    const newValue = textAndProposalsToSlateValue(
      state.currentText, 
      state.resumeText, 
      acceptedProposals
    );
    Transforms.delete(editor, { at: [[0], [editor.children.length]] });
    Transforms.insertNodes(editor, newValue, { at: [0] });
    // Reset cursor to start.
    Transforms.select(editor, Editor.start(editor, []));
  }
  
  prevAcceptedKeyRef.current = acceptedIdsKey;
  prevUndoDepthRef.current = undoDepth;
}, [acceptedIdsKey, undoDepth]);
```

Slate's correct pattern for replacing editor value may differ. Check docs.

### Component structure

```typescript
// Proposed. Validate.
export function ProposedPane() {
  const { state, dispatch } = useAppState();
  const editor = useMemo(() => withReact(createEditor()), []);
  
  const acceptedProposals = state.proposals.filter((p) => 
    state.acceptedProposalIds.has(p.id)
  );
  
  const initialValue: Descendant[] = useMemo(
    () => textAndProposalsToSlateValue(
      state.currentText, 
      state.resumeText, 
      acceptedProposals
    ),
    [] // intentionally empty — recompute on structural change via useEffect
  );
  
  // ... structuralChange detection useEffect ...
  
  return (
    <div className="flex flex-col rounded-lg border border-gray-200 overflow-hidden h-full">
      {/* Header — same buttons as current ProposedPane: Undo, Clear all */}
      {/* Narrative banner — same */}
      <Slate editor={editor} initialValue={initialValue} onChange={handleChange}>
        <Editable
          renderElement={renderElement}
          className="flex-1 overflow-y-auto font-mono text-sm leading-relaxed p-3 space-y-px focus:outline-none focus:ring-1 focus:ring-blue-400"
          spellCheck={false}
        />
      </Slate>
    </div>
  );
}
```

---

## Scope boundaries

### In scope for this migration

- Replace `components/ProposedPane.tsx` with Slate-based implementation.
- Install `slate` and `slate-react` via npm.
- Adapt or replace `lib/diffPreview.ts` — keep the computeDiffLines logic but expose it in a form that produces Slate LineElement[] (or just call it from ProposedPane and map the output, your call at implementation time).
- Retain all four action behaviors in the header: Undo last toggle, Clear all edits and selections. Same labels, same behavior.
- Retain narrative banner above the editor.
- Retain per-op highlighting: REPLACE_LINE yellow, ADD_LINE green, DELETE_LINE red-strike ghost, REPLACE_PHRASE yellow on containing line.
- Run the seven Enter tests from Stage 4a at the end. All must pass.
- Capture in build-log as "Stage 4a Slate migration complete."

### Out of scope — DO NOT expand this migration into

- Multi-cursor support.
- Collaborative editing.
- Rich text formatting (bold, italic, links). Spec still says plain text.
- Undo/redo at the character level inside Slate (browser-native Ctrl+Z remains the freeform-edit undo).
- Inline proposal popovers. Deferred to v1.1.
- Scroll-sync across panes. Deferred to v1.1.
- Indentation preservation for REPLACE_LINE. Already captured as deferred.
- Strategy A backend fixes for orchestrator op-type accuracy. Already captured as v1.1.

Anything that would expand scope should surface in strategic chat first, not during implementation.

---

## Test criteria

Migration is complete when ALL of these pass on live test:

### Original Stage 4a checks that must still pass

1. Transitions: Input → Processing → Review.
2. All three panes render. Narrative banner shows when present.
3. Proposal count in right pane matches API response.
4. Toggle ADD_LINE: line appears inside correct section (not end of document). Green highlight.
5. Toggle REPLACE_LINE: line changes. Yellow highlight. Bullet-prefixed lines match.
6. Toggle REPLACE_PHRASE: phrase changes inside line. Containing line yellow.
7. Toggle DELETE_LINE (if returned): line removes, red-strike ghost row appears, ghost is not editable.
8-9. Typing at arbitrary positions works. Characters in correct order. Cursor stable.
10. Toggle after freeform edit: edit discarded, cursor to start of pane, focus preserved.
11. Multi-level undo: three accepts, three undos, each reverses both text AND right-pane checkbox. Disabled when empty.
12. Accept all: right-pane toggles all on, pane regenerates, button becomes "Reject all".
13. Reject all: right-pane toggles all off, pane resets to original.
14. Clear all edits and selections: pane resets AND right-pane checkboxes clear. Undo stack clears.
15. Start over: returns to Input screen with empty fields.

### New Enter tests that must pass (these failed on pre-Slate builds)

E1. Single Enter after existing text → clean empty line.
E2. Enter + type → text on new line, cursor at end.
E3. Second Enter → another clean empty line.
E4. Type, Enter, type, Enter, type → three clean lines.
E5. Enter mid-line → line splits at cursor, cursor at start of new second-half.
E6. Type on new line after Enter mid-line → text appears at correct position.
E7. Toggle after freeform edits → all edits discarded, state resets correctly.

### Bonus: backspace tests

B1. Backspace at start of a line → merges with previous line, cursor at merge point.
B2. Backspace on an empty line → removes the empty line, cursor at end of previous.
B3. Delete key at end of a line → merges with next line.

These weren't testable on pre-Slate builds because Enter broke first. Slate handles all three natively — just confirm.

---

## Rollback plan

If Slate migration blocks for an unexpected reason (e.g., a Slate bug or incompatibility with React 19):

1. Discard the Slate migration commits.
2. Keep Fix 6.1 landed state. That's the last known checkpoint — Enter works partially, freeform editing has known bugs.
3. Reassess: try Lexical, or roll back to the two-pane split, or ship with freeform editing disabled.

Rollback is cheap because all other Stage 4a code is stable and unchanged.

---

## Follow-up artifacts after migration

- Build-log entry: "Stage 4a Slate migration complete" with note on which Slate idioms the proposed approach needed to adjust for.
- Update `docs/frontend-mvp-spec-v1.md` to reflect Slate as the editor implementation. Single-section update under "Screen 3 — Review & Export / Layout".
- Task Completion Checkpoint at the end (standard).

---

## Time estimate

- Slate orientation (read quickstart + skim API surface): 30 min
- Implement ProposedPane.tsx replacement: 60-90 min
- Integration testing (seven checks from original Stage 4a + seven Enter checks + three backspace checks): 30-45 min
- Build-log + spec updates + task completion checkpoint: 15-30 min

Total: 2-4 hours. If it's taking significantly longer than that, stop and reassess.

---

## What tomorrow-you should do first

1. Read this document end-to-end. ~10 min.
2. Read Slate's "Installing Slate" and "The Basics" walkthroughs. ~20 min.
3. Validate the "Proposed implementation approach" section against Slate's idioms. Take notes on what should change.
4. If the approach holds, paste a condensed execution prompt into Claude Code. If it needs major adjustment, draft a revised approach in strategic chat first.
5. Install dependencies, implement, test.

Do not start implementing without step 2. The time saved by reading Slate's docs first is meaningfully larger than the time spent reading them.

---

## Session state at close

- Latest commit: diagnostic console.logs removed from ProposedPane.
- Open bugs: freeform editing unreliable (will be resolved by Slate migration).
- All other Stage 4a functionality working.
- Layout (Fix 5.2) working — panes scroll independently.
- Fix 4 defensive fallbacks working (within documented 30% substring threshold limits).

You are not rewriting Stage 4a. You are replacing one component within Stage 4a.
