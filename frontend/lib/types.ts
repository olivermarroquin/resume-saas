// Shared TypeScript types for the resume-saas frontend.
// Source of truth: repos/resume-saas/docs/frontend-mvp-spec-v1.md

export type Phase = "input" | "processing" | "review";

export type ProposalSection = "SUMMARY" | "SKILLS" | "EXPERIENCE";

export type ProposalOp =
  | "REPLACE_LINE"
  | "ADD_LINE"
  | "DELETE_LINE"
  | "REPLACE_PHRASE";

export type Proposal = {
  id: number;
  section: ProposalSection;
  op: ProposalOp;
  before: string[];
  after: string[];
  rationale: string;
};

export type Version = {
  label: string;     // e.g., "v1", "v2"
  text: string;      // snapshot of resume text
  createdAt: number; // Date.now()
};

export type AppError = {
  code: string;
  message: string;
};

export type AppState = {
  phase: Phase;

  // Inputs
  resumeText: string;
  jobDescription: string;

  // API response
  proposals: Proposal[];
  narrative: string | null;

  // Review state
  acceptedProposalIds: Set<number>;
  currentText: string;
  undoStash: string | null;
  versions: Version[];

  // UI
  error: AppError | null;
};
