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
 * logical text in the given container.
 *
 * The container holds one <div> per logical line. The logical text
 * is those divs' textContent joined by "\n" (matching how
 * readTextFromContainer produces state.currentText).
 *
 * This function walks LINE DIVS, not text nodes. That handles the
 * empty-line case correctly: a <div><br></div> has no text node
 * inside it, but it still represents a line position in the
 * logical text. Text-node walkers would skip right past it.
 *
 * Returns 0 if no selection or cursor is outside the container.
 */
function getCursorCharOffset(container: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.endContainer)) return 0;

  const lineChildren = Array.from(container.children) as HTMLElement[];
  let offset = 0;

  for (let i = 0; i < lineChildren.length; i++) {
    const line = lineChildren[i];
    // Skip ghost rows (contentEditable=false) — they represent
    // deleted content and are not part of the logical text.
    if (line.getAttribute("contenteditable") === "false") continue;

    const lineText = line.textContent ?? "";

    // Is the cursor inside this line div (or its descendants)?
    if (line === range.endContainer || line.contains(range.endContainer)) {
      // Cursor is somewhere in this line. Compute offset within
      // this line's text.
      let withinLine = 0;
      if (range.endContainer === line) {
        // Cursor is directly in the line element, not in a text
        // child. This happens for empty lines (<div><br></div>).
        // Treat cursor position as 0 within this line.
        withinLine = 0;
      } else {
        // Cursor is in a descendant text node. Walk text nodes
        // inside this line, summing lengths until we hit the
        // cursor's text node.
        const walker = document.createTreeWalker(
          line,
          NodeFilter.SHOW_TEXT,
          null,
        );
        let node: Node | null = walker.nextNode();
        while (node != null) {
          if (node === range.endContainer) {
            withinLine += range.endOffset;
            break;
          }
          withinLine += (node.textContent ?? "").length;
          node = walker.nextNode();
        }
      }
      return offset + withinLine;
    }

    // Cursor is not in this line. Add this line's length + 1
    // (for the "\n" separator) and continue.
    offset += lineText.length;
    // Only add separator if there's a next line (matches join("\n")
    // behavior).
    if (i < lineChildren.length - 1) {
      offset += 1;
    }
  }

  return offset;
}

/**
 * Place the cursor at the given character offset in the logical
 * text of the container.
 *
 * Walks LINE DIVS matching the getCursorCharOffset model. For an
 * empty line (<div><br></div>), places the cursor directly in the
 * line element (offset 0 within it) since there's no text node
 * to position within.
 */
function setCursorCharOffset(container: HTMLElement, offset: number): void {
  if (offset < 0) offset = 0;

  const lineChildren = Array.from(container.children) as HTMLElement[];
  const editableLines = lineChildren.filter(
    (el) => el.getAttribute("contenteditable") !== "false",
  );

  if (editableLines.length === 0) return;

  let remaining = offset;

  for (let i = 0; i < editableLines.length; i++) {
    const line = editableLines[i];
    const lineText = line.textContent ?? "";
    const isLast = i === editableLines.length - 1;

    if (remaining <= lineText.length) {
      // Cursor belongs in this line.
      const sel = window.getSelection();
      if (!sel) return;
      const range = document.createRange();

      if (lineText.length === 0) {
        // Empty line. Place cursor directly in the line element.
        range.setStart(line, 0);
      } else {
        // Non-empty line. Walk its text nodes to find position.
        const walker = document.createTreeWalker(
          line,
          NodeFilter.SHOW_TEXT,
          null,
        );
        let textNode: Node | null = walker.nextNode();
        let posInLine = remaining;
        let lastTextNode: Node | null = null;
        let lastLen = 0;
        while (textNode != null) {
          const len = (textNode.textContent ?? "").length;
          if (posInLine <= len) {
            range.setStart(textNode, posInLine);
            break;
          }
          posInLine -= len;
          lastTextNode = textNode;
          lastLen = len;
          textNode = walker.nextNode();
        }
        if (textNode == null && lastTextNode != null) {
          // Ran past end; place at end of last text node.
          range.setStart(lastTextNode, lastLen);
        } else if (textNode == null) {
          // No text nodes at all in a non-empty line? Shouldn't
          // happen, but fall back to line element.
          range.setStart(line, 0);
        }
      }

      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }

    // Cursor is past this line. Subtract this line's length + 1
    // (for the "\n" separator) if not last line.
    remaining -= lineText.length;
    if (!isLast) remaining -= 1;
  }

  // Ran past all lines. Place cursor at end of last line.
  const lastLine = editableLines[editableLines.length - 1];
  const lastText = lastLine.textContent ?? "";
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  if (lastText.length === 0) {
    range.setStart(lastLine, 0);
  } else {
    const walker = document.createTreeWalker(
      lastLine,
      NodeFilter.SHOW_TEXT,
      null,
    );
    let lastTextNode: Node | null = null;
    let lastLen = 0;
    let node: Node | null = walker.nextNode();
    while (node != null) {
      lastTextNode = node;
      lastLen = (node.textContent ?? "").length;
      node = walker.nextNode();
    }
    if (lastTextNode != null) {
      range.setStart(lastTextNode, lastLen);
    } else {
      range.setStart(lastLine, 0);
    }
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
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
        contentEditable={"plaintext-only" as unknown as boolean}
        suppressContentEditableWarning
        onInput={handleInput}
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
