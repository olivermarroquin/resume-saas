"use client";

import { useAppState } from "../lib/context/AppContext";
import { ProposalCard } from "./ProposalCard";

export function ProposalsList() {
  const { state, dispatch } = useAppState();

  const total = state.proposals.length;
  const acceptedCount = state.acceptedProposalIds.size;
  const allAccepted = total > 0 && acceptedCount === total;
  const buttonLabel = allAccepted ? "Reject all" : "Accept all";

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 overflow-hidden h-full">
      <div className="shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Proposals ({total})
        </h2>
        {total > 0 && (
          <button
            type="button"
            onClick={() => dispatch({ type: "TOGGLE_ALL" })}
            className="rounded px-2 py-1 text-xs font-medium bg-white border border-gray-300 hover:bg-gray-50"
          >
            {buttonLabel}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {state.proposals.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>
    </div>
  );
}
