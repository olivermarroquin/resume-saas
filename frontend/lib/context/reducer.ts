import type { AppState, Proposal, UndoEntry, Version } from "../types";
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
  undoStack: [],
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
      const v1: Version = {
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
        undoStack: [],
        versions: [v1],
        error: null,
      };
    }

    case "GENERATE_FAILURE":
      return { ...state, phase: "input", error: action.payload };

    case "TOGGLE_PROPOSAL": {
      const { proposalId } = action.payload;
      const snapshot: UndoEntry = {
        text: state.currentText,
        acceptedProposalIds: new Set(state.acceptedProposalIds),
      };
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
        undoStack: [...state.undoStack, snapshot],
        currentText: nextText,
      };
    }

    case "TOGGLE_ALL": {
      const allIds = state.proposals.map((p) => p.id);
      const allAccepted = allIds.every((id) => state.acceptedProposalIds.has(id));
      const snapshot: UndoEntry = {
        text: state.currentText,
        acceptedProposalIds: new Set(state.acceptedProposalIds),
      };
      const nextAccepted = allAccepted
        ? new Set<number>()
        : new Set<number>(allIds);
      const accepted = orderedAccepted(state.proposals, nextAccepted);
      const nextText = applyProposals(state.resumeText, accepted);
      return {
        ...state,
        acceptedProposalIds: nextAccepted,
        undoStack: [...state.undoStack, snapshot],
        currentText: nextText,
      };
    }

    case "EDIT_CURRENT_TEXT":
      return { ...state, currentText: action.payload };

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const next = [...state.undoStack];
      const entry = next.pop()!;
      return {
        ...state,
        currentText: entry.text,
        acceptedProposalIds: entry.acceptedProposalIds,
        undoStack: next,
      };
    }

    case "RESTORE_ORIGINAL":
      return {
        ...state,
        currentText: state.resumeText,
        acceptedProposalIds: new Set<number>(),
        undoStack: [],
      };

    case "SAVE_VERSION": {
      const nextLabel = `v${state.versions.length + 1}`;
      const snapshot: Version = {
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
      return {
        ...initialState,
        acceptedProposalIds: new Set<number>(),
      };

    default: {
      void (action as never);
      return state;
    }
  }
}

function orderedAccepted(
  proposals: Proposal[],
  acceptedIds: Set<number>,
): Proposal[] {
  return proposals.filter((p) => acceptedIds.has(p.id));
}
