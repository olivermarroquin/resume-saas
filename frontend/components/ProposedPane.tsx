"use client";

import { useEffect, useRef } from "react";
import { useAppState } from "../lib/context/AppContext";
import { computeDiffLines, type DiffLine } from "../lib/diffPreview";

const HIGHLIGHT_CLASS: Record<DiffLine["highlight"], string> = {
  green: "bg-green-100 text-green-900",
  yellow: "bg-yellow-100 text-yellow-900",
  "red-strike": "bg-red-100 text-red-900 line-through",
  none: "",
};

// ---------- Cursor offset helpers ----------

/**
 * Compute the cursor's character offset from the start of the
 * given container's text content. Returns 0 if no selection, or
 * if the selection is outside the container.
 */
function getCursorCharOffset(container: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.endContainer)) return 0;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
  );
  let offset = 0;
  let node: Node | null = walker.nextNode();
  while (node != null) {
    if (node === range.endContainer) {
      return offset + range.endOffset;
    }
    offset += (node.textContent ?? "").length;
    node = walker.nextNode();
  }
  return offset;
}

/**
 * Place the cursor at the given character offset from the start of
 * the container's text content.
 */
function setCursorCharOffset(container: HTMLElement, offset: number): void {
  if (offset < 0) offset = 0;
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
  );
  let remaining = offset;
  let node: Node | null = walker.nextNode();
  let lastTextNode: Node | null = null;
  let lastTextLength = 0;
  while (node != null) {
    const len = (node.textContent ?? "").length;
    if (remaining <= len) {
      const sel = window.getSelection();
      if (!sel) return;
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    remaining -= len;
    lastTextNode = node;
    lastTextLength = len;
    node = walker.nextNode();
  }
  if (lastTextNode != null) {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.setStart(lastTextNode, lastTextLength);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

/**
 * Read the total plain text from the container, joining line <div>
 * children with newlines. Ghost (contentEditable=false) lines are
 * skipped — they represent deleted content and are not part of the
 * logical text.
 */
function readTextFromContainer(container: HTMLElement): string {
  const children = Array.from(container.children) as HTMLElement[];
  return children
    .filter((el) => el.getAttribute("contenteditable") !== "false")
    .map((el) => el.textContent ?? "")
    .join("\n");
}

// ---------- Component ----------

export function ProposedPane() {
  const { state, dispatch } = useAppState();
  const divRef = useRef<HTMLDivElement>(null);

  const prevAcceptedKeyRef = useRef<string>("");
  const prevUndoDepthRef = useRef<number>(0);
  const savedOffsetRef = useRef<number>(0);

  const acceptedIdsKey = Array.from(state.acceptedProposalIds)
    .sort((a, b) => a - b)
    .join(",");
  const undoDepth = state.undoStack.length;

  const acceptedProposals = state.proposals.filter((p) =>
    state.acceptedProposalIds.has(p.id),
  );
  const diffLines = computeDiffLines(
    state.currentText,
    state.resumeText,
    acceptedProposals,
  );

  useEffect(() => {
    const div = divRef.current;
    if (!div) return;

    const structuralChange =
      prevAcceptedKeyRef.current !== acceptedIdsKey ||
      prevUndoDepthRef.current !== undoDepth;

    if (structuralChange) {
      // User toggled / undid / restored. Always reset scroll and
      // cursor to the start of the pane and return focus to the pane.
      // The pane is the primary interaction surface for this product,
      // and the toggle action just changed the pane's content — the
      // user's next action is almost certainly to read the change or
      // continue editing, both of which benefit from focus being on
      // the pane. No hadFocus guard.
      div.scrollTop = 0;
      if (div.firstChild) {
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.setStart(div.firstChild, 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
      div.focus();
    } else {
      if (document.activeElement === div) {
        setCursorCharOffset(div, savedOffsetRef.current);
      }
    }

    prevAcceptedKeyRef.current = acceptedIdsKey;
    prevUndoDepthRef.current = undoDepth;
  });

  const handleInput = () => {
    const div = divRef.current;
    if (!div) return;
    savedOffsetRef.current = getCursorCharOffset(div);
    const text = readTextFromContainer(div);
    dispatch({ type: "EDIT_CURRENT_TEXT", payload: text });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    handleInput();
  };

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 overflow-hidden h-full">
      {/* Header */}
      <div className="shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Proposed
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={state.undoStack.length === 0}
            onClick={() => dispatch({ type: "UNDO" })}
            className="rounded px-2 py-1 text-xs font-medium bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Undo last toggle
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "RESTORE_ORIGINAL" })}
            className="rounded px-2 py-1 text-xs font-medium bg-white border border-gray-300 hover:bg-gray-50"
          >
            Clear all edits and selections
          </button>
        </div>
      </div>

      {/* Narrative banner */}
      {state.narrative && (
        <div className="shrink-0 bg-blue-50 border-b border-blue-100 px-4 py-2">
          <p className="text-sm italic text-blue-800">{state.narrative}</p>
        </div>
      )}

      {/* Single contentEditable surface — React-owned children */}
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        className="flex-1 overflow-y-auto font-mono text-sm leading-relaxed p-3 space-y-px focus:outline-none focus:ring-1 focus:ring-blue-400"
        spellCheck={false}
      >
        {diffLines.map((dl) => {
          const isGhost = dl.highlight === "red-strike";
          return (
            <div
              key={dl.key}
              contentEditable={isGhost ? false : undefined}
              className={`${HIGHLIGHT_CLASS[dl.highlight]} px-1 rounded-sm whitespace-pre-wrap`}
            >
              {dl.text || "\u00A0"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
