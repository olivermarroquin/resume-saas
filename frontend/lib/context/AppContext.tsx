"use client";

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { AppState } from "../types";
import { reducer, initialState } from "./reducer";
import type { Action } from "./actions";

type AppContextValue = {
  state: AppState;
  dispatch: Dispatch<Action>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Primary hook. Throws if used outside AppProvider.
 */
export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (ctx === null) {
    throw new Error("useAppState must be used within <AppProvider>");
  }
  return ctx;
}
