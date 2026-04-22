"use client";

import { useEffect, useRef } from "react";
import { useAppState } from "../lib/context/AppContext";
import { computeDiffLines } from "../lib/diffPreview";

const highlightClass: Record<string, string> = {
  green: "bg-green-100 text-green-900",
  yellow: "bg-yellow-100 text-yellow-900",
  "red-strike": "bg-red-100 text-red-900 line-through",
  none: "",
};

export function ProposedPane() {
  const { state, dispatch } = useAppState();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const acceptedProposals = state.proposals.filter((p) =>
    state.acceptedProposalIds.has(p.id),
  );
  const diffLines = computeDiffLines(
    state.currentText,
    state.resumeText,
    acceptedProposals,
  );

  // After any toggle-driven or regeneration-driven currentText change,
  // reset cursor to start of textarea and preserve focus if already focused.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const hadFocus = document.activeElement === el;
    el.setSelectionRange(0, 0);
    el.scrollTop = 0;
    if (hadFocus) el.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentText, state.acceptedProposalIds]);

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
            Restore original text (keeps proposal selections)
          </button>
        </div>
      </div>

      {/* Narrative banner */}
      {state.narrative && (
        <div className="shrink-0 bg-blue-50 border-b border-blue-100 px-4 py-2">
          <p className="text-sm italic text-blue-800">{state.narrative}</p>
        </div>
      )}

      {/* Diff preview — ~40% */}
      <div className="shrink-0 basis-2/5 overflow-y-auto border-b border-gray-200 bg-white">
        <div className="px-3 py-1 bg-gray-50 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Changes preview
          </span>
        </div>
        <div className="font-mono text-sm leading-relaxed p-3 space-y-px">
          {diffLines.map((dl) => (
            <div
              key={dl.key}
              className={`px-1 rounded-sm whitespace-pre-wrap ${highlightClass[dl.highlight] ?? ""}`}
            >
              {dl.text || "\u00A0"}
            </div>
          ))}
        </div>
      </div>

      {/* Editable textarea — ~60% */}
      <div className="flex-1 flex flex-col min-h-0">
        <textarea
          ref={textareaRef}
          value={state.currentText}
          onChange={(e) =>
            dispatch({ type: "EDIT_CURRENT_TEXT", payload: e.target.value })
          }
          className="flex-1 resize-none font-mono text-sm p-3 focus:outline-none focus:ring-1 focus:ring-blue-400"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
