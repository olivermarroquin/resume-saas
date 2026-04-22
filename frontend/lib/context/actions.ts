import type { Proposal, AppError } from "../types";

export type Action =
  | { type: "SET_RESUME_TEXT"; payload: string }
  | { type: "SET_JOB_DESCRIPTION"; payload: string }
  | { type: "START_GENERATE" }
  | {
      type: "GENERATE_SUCCESS";
      payload: { proposals: Proposal[]; narrative: string | null };
    }
  | { type: "GENERATE_FAILURE"; payload: AppError }
  | { type: "TOGGLE_PROPOSAL"; payload: { proposalId: number } }
  | { type: "TOGGLE_ALL" }
  | { type: "EDIT_CURRENT_TEXT"; payload: string }
  | { type: "UNDO" }
  | { type: "RESTORE_ORIGINAL" }
  | { type: "SAVE_VERSION" }
  | { type: "LOAD_VERSION"; payload: { label: string } }
  | { type: "CLEAR_ERROR" }
  | { type: "START_OVER" };
