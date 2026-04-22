"use client";

import { useAppState } from "../lib/context/AppContext";

export function OriginalPane() {
  const { state } = useAppState();

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 overflow-hidden h-full">
      <div className="shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Original
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
          {state.resumeText}
        </pre>
      </div>
    </div>
  );
}
