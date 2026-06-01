"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-emerald-800">Simple Roster Plus</p>
            <h1 className="mt-2 text-xl font-semibold text-zinc-900">Something went wrong</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              A critical error occurred. Please refresh the page or sign in again.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Try again
              </button>
              <a
                href="/login"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Back to sign in
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
