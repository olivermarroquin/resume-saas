"use client";

import { useAppState } from "../lib/context/AppContext";
import { InputScreen } from "./InputScreen";
import { ProcessingScreen } from "./ProcessingScreen";
import { ReviewScreen } from "./ReviewScreen";

export function AppShell() {
  const { state } = useAppState();

  switch (state.phase) {
    case "input":
      return <InputScreen />;
    case "processing":
      return <ProcessingScreen />;
    case "review":
      return <ReviewScreen />;
    default: {
      const _exhaustive: never = state.phase;
      return null;
    }
  }
}
