"use client";

import type { Proposal, ProposalSection } from "../lib/types";
import { useAppState } from "../lib/context/AppContext";

const sectionBadgeClass: Record<ProposalSection, string> = {
  SUMMARY: "bg-blue-100 text-blue-800",
  SKILLS: "bg-purple-100 text-purple-800",
  EXPERIENCE: "bg-emerald-100 text-emerald-800",
};

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { state, dispatch } = useAppState();
  const isAccepted = state.acceptedProposalIds.has(proposal.id);

  const beforeText = proposal.before[0] ?? "";
  const afterText = proposal.after[0] ?? "";
  const isDelete = proposal.op === "DELETE_LINE";

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isAccepted ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
      }`}
    >
      {/* Top row: badges + toggle */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sectionBadgeClass[proposal.section]}`}
        >
          {proposal.section}
        </span>
        <span className="rounded px-1.5 py-0.5 text-xs font-medium uppercase bg-gray-100 text-gray-600 tracking-wide">
          {proposal.op.replace("_", " ")}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isAccepted}
          onClick={() =>
            dispatch({ type: "TOGGLE_PROPOSAL", payload: { proposalId: proposal.id } })
          }
          className={`ml-auto relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
            isAccepted ? "bg-blue-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
              isAccepted ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Before */}
      {beforeText && (
        <div className="mb-1">
          <span className="text-xs text-gray-400 uppercase font-medium">Before</span>
          <div className="mt-0.5 rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 whitespace-pre-wrap">
            {beforeText}
          </div>
        </div>
      )}

      {/* After */}
      <div className="mb-2">
        <span className="text-xs text-gray-400 uppercase font-medium">After</span>
        <div className="mt-0.5 rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 whitespace-pre-wrap">
          {isDelete ? "(deleted)" : afterText}
        </div>
      </div>

      {/* Rationale */}
      <p className="text-xs italic text-gray-500 leading-snug">{proposal.rationale}</p>
    </div>
  );
}
