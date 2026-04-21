"use client";

import type { AppError } from "../lib/types";

type Props = {
  error: AppError;
  onDismiss: () => void;
};

export function ErrorBanner({ error, onDismiss }: Props) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start justify-between gap-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900"
    >
      <div>
        <p className="font-medium">{error.message}</p>
        <p className="mt-1 text-xs text-red-700">Code: {error.code}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded px-2 py-1 text-red-900 hover:bg-red-100"
        aria-label="Dismiss error"
      >
        Dismiss
      </button>
    </div>
  );
}
