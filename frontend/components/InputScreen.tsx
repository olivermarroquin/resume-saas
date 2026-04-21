"use client";

import { useAppState } from "../lib/context/AppContext";
import { callRewrite } from "../lib/api";
import { ErrorBanner } from "./ErrorBanner";

export function InputScreen() {
  const { state, dispatch } = useAppState();

  const canSubmit =
    state.resumeText.trim().length > 0 &&
    state.jobDescription.trim().length > 0;

  async function handleGenerate() {
    if (!canSubmit) return;
    dispatch({ type: "START_GENERATE" });
    const result = await callRewrite({
      resume_text: state.resumeText,
      job_description: state.jobDescription,
    });
    if (result.ok) {
      dispatch({
        type: "GENERATE_SUCCESS",
        payload: {
          proposals: result.data.proposals,
          narrative: result.data.narrative,
        },
      });
    } else {
      dispatch({ type: "GENERATE_FAILURE", payload: result.error });
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">resume-saas</h1>
      <p className="mb-6 text-sm text-gray-600">
        Paste your resume and the target job description. We&apos;ll
        return a set of edit proposals tailored to the job.
      </p>

      {state.error && (
        <ErrorBanner
          error={state.error}
          onDismiss={() => dispatch({ type: "CLEAR_ERROR" })}
        />
      )}

      <div className="mb-4">
        <label
          htmlFor="resume"
          className="mb-1 block text-sm font-medium"
        >
          Resume
        </label>
        <textarea
          id="resume"
          value={state.resumeText}
          onChange={(e) =>
            dispatch({
              type: "SET_RESUME_TEXT",
              payload: e.target.value,
            })
          }
          placeholder="Paste your resume here."
          rows={12}
          className="w-full resize-y rounded border border-gray-300 p-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="mb-6">
        <label
          htmlFor="jd"
          className="mb-1 block text-sm font-medium"
        >
          Job Description
        </label>
        <textarea
          id="jd"
          value={state.jobDescription}
          onChange={(e) =>
            dispatch({
              type: "SET_JOB_DESCRIPTION",
              payload: e.target.value,
            })
          }
          placeholder="Paste the full job description here."
          rows={12}
          className="w-full resize-y rounded border border-gray-300 p-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canSubmit}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        Generate
      </button>
    </div>
  );
}
