import type { AppState, Proposal } from "../types";
import type { Action } from "./actions";
import { applyProposals } from "../applyProposals";

export const initialState: AppState = {
  phase: "input",
  resumeText: "",
  jobDescription: "",
  proposals: [],
  narrative: null,
  acceptedProposalIds: new Set<number>(),
  currentText: "",
  undoStash: null,
  versions: [],
  error: null,
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_RESUME_TEXT":
      return { ...state, resumeText: action.payload, error: null };

    case "SET_JOB_DESCRIPTION":
      return { ...state, jobDescription: action.payload, error: null };

    case "START_GENERATE":
      return { ...state, phase: "processing", error: null };

    case "GENERATE_SUCCESS": {
      const { proposals, narrative } = action.payload;
      const v1: AppState["versions"][number] = {
        label: "v1",
        text: state.resumeText,
        createdAt: Date.now(),
      };
      return {
        ...state,
        phase: "review",
        proposals,
        narrative,
        acceptedProposalIds: new Set<number>(),
        currentText: state.resumeText,
        undoStash: null,
        versions: [v1],
        error: null,
      };
    }

    case "GENERATE_FAILURE":
      return { ...state, phase: "input", error: action.payload };

    case "TOGGLE_PROPOSAL": {
      const { proposalId } = action.payload;
      const nextAccepted = new Set(state.acceptedProposalIds);
      if (nextAccepted.has(proposalId)) {
        nextAccepted.delete(proposalId);
      } else {
        nextAccepted.add(proposalId);
      }
      const accepted = orderedAccepted(state.proposals, nextAccepted);
      const nextText = applyProposals(state.resumeText, accepted);
      return {
        ...state,
        acceptedProposalIds: nextAccepted,
        undoStash: state.currentText, // stash current before regenerating
        currentText: nextText,
      };
    }

    case "EDIT_CURRENT_TEXT":
      // Freeform edit. Does not clear undoStash (spec).
      return { ...state, currentText: action.payload };

    case "UNDO": {
      if (state.undoStash == null) return state;
      return {
        ...state,
        currentText: state.undoStash,
        undoStash: null,
      };
    }

    case "RESTORE_ORIGINAL":
      // Does NOT touch acceptedProposalIds (spec).
      return { ...state, currentText: state.resumeText };

    case "SAVE_VERSION": {
      const nextLabel = `v${state.versions.length + 1}`;
      const snapshot: AppState["versions"][number] = {
        label: nextLabel,
        text: state.currentText,
        createdAt: Date.now(),
      };
      return { ...state, versions: [...state.versions, snapshot] };
    }

    case "LOAD_VERSION": {
      const target = state.versions.find(
        (v) => v.label === action.payload.label,
      );
      if (!target) return state;
      return { ...state, currentText: target.text };
    }

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "START_OVER":
      // Reset to initial state (clears everything including last inputs).
      return {
        ...initialState,
        acceptedProposalIds: new Set<number>(),
      };

    default: {
      // Exhaustiveness check
      const _exhaustive: never = action;
      return state;
    }
  }
}

/**
 * Filter proposals down to the currently accepted set, preserving
 * API-returned order. This is important because applyProposals is
 * order-sensitive (later proposals may depend on earlier ones).
 */
function orderedAccepted(
  proposals: Proposal[],
  acceptedIds: Set<number>,
): Proposal[] {
  return proposals.filter((p) => acceptedIds.has(p.id));
}
