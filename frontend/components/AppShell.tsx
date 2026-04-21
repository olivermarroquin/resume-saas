"use client";

import { useAppState } from "../lib/context/AppContext";
import { InputScreen } from "./InputScreen";
import { ProcessingScreen } from "./ProcessingScreen";

export function AppShell() {
  const { state, dispatch } = useAppState();

  switch (state.phase) {
    case "input":
      return <InputScreen />;
    case "processing":
      return <ProcessingScreen />;
    case "review":
      // Stage 3 placeholder. Stage 4 replaces this with the real
      // ReviewScreen.
      return (
        <div className="mx-auto max-w-3xl p-6">
          <h2 className="mb-2 text-xl font-semibold">
            Round trip successful (Stage 3 placeholder)
          </h2>
          <p className="mb-4 text-sm text-gray-700">
            Got {state.proposals.length} proposals from the backend.
            {state.narrative
              ? ` Narrative: "${state.narrative}"`
              : " No narrative returned."}
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: "START_OVER" })}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-300"
          >
            Start over
          </button>
        </div>
      );
    default: {
      const _exhaustive: never = state.phase;
      return null;
    }
  }
}
