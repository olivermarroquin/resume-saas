"use client";

import { useAppState } from "../lib/context/AppContext";
import { OriginalPane } from "./OriginalPane";
import { ProposedPane } from "./ProposedPane";
import { ProposalsList } from "./ProposalsList";

export function ReviewScreen() {
  const { dispatch } = useAppState();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Action bar */}
      <div className="shrink-0 flex items-center justify-end px-4 py-2 border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => dispatch({ type: "START_OVER" })}
          className="rounded px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 hover:bg-gray-50"
        >
          Start over
        </button>
      </div>

      {/* Three-pane layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 min-h-0 overflow-hidden">
        {/* Mobile order: ProposedPane first, then OriginalPane, then ProposalsList */}
        <div className="order-2 md:order-1 h-[70vh] md:h-full">
          <OriginalPane />
        </div>
        <div className="order-1 md:order-2 h-[70vh] md:h-full">
          <ProposedPane />
        </div>
        <div className="order-3 md:order-3 h-[70vh] md:h-full">
          <ProposalsList />
        </div>
      </div>
    </div>
  );
}
