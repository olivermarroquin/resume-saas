"use client";

import { useEffect, useState } from "react";

export function ProcessingScreen() {
  const [showStillWorking, setShowStillWorking] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowStillWorking(true), 60_000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div
        role="status"
        aria-label="Processing"
        className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
      />
      <p className="text-lg font-medium">Tailoring your resume…</p>
      <p className="mt-1 text-sm text-gray-600">
        This usually takes 10–30 seconds.
      </p>
      {showStillWorking && (
        <p className="mt-3 text-sm text-gray-500">Still working…</p>
      )}
    </div>
  );
}
