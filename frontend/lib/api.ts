import type { Proposal, AppError } from "./types";

type RewriteRequest = {
  resume_text: string;
  job_description: string;
};

export type RewriteResponse = {
  proposals: Proposal[];
  narrative: string | null;
};

export type RewriteResult =
  | { ok: true; data: RewriteResponse }
  | { ok: false; error: AppError };

/**
 * POST /api/rewrite — submit resume + JD, receive edit proposals.
 *
 * Returns a discriminated-union result instead of throwing, so
 * callers handle both success and failure paths explicitly.
 *
 * Network failures, non-200 responses, and unexpected response
 * shapes all resolve to { ok: false, error }.
 */
export async function callRewrite(
  body: RewriteRequest,
): Promise<RewriteResult> {
  let res: Response;
  try {
    res = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      error: {
        code: "network_error",
        message:
          "Network error — check your connection and try again.",
      },
    };
  }

  // Attempt to parse JSON regardless of status. The backend always
  // returns JSON (success or error shape).
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    return {
      ok: false,
      error: {
        code: "invalid_response",
        message: "We got an unusable response. Please try again.",
      },
    };
  }

  if (!res.ok) {
    // Backend error shape: { error: string, message: string }
    if (isBackendError(parsed)) {
      return {
        ok: false,
        error: { code: parsed.error, message: parsed.message },
      };
    }
    return {
      ok: false,
      error: {
        code: `http_${res.status}`,
        message: `Request failed with status ${res.status}.`,
      },
    };
  }

  if (!isRewriteResponse(parsed)) {
    return {
      ok: false,
      error: {
        code: "invalid_response",
        message: "We got an unusable response. Please try again.",
      },
    };
  }

  return { ok: true, data: parsed };
}

// --- type guards ---

function isBackendError(
  v: unknown,
): v is { error: string; message: string } {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.error === "string" && typeof o.message === "string";
}

function isRewriteResponse(v: unknown): v is RewriteResponse {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.proposals)) return false;
  // Narrative is optional.
  if (
    o.narrative !== undefined &&
    o.narrative !== null &&
    typeof o.narrative !== "string"
  ) {
    return false;
  }
  // Do NOT deeply validate each proposal here; the Proposal shape
  // is the backend's contract. Basic array shape is sufficient to
  // proceed; per-item validation can be added if the backend
  // becomes flaky.
  return true;
}
