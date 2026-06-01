"use client";

export function ShareToolbar() {
  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-zinc-600">
        Read-only roster — share this page in your team chat or print for the break room.
      </p>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
      >
        Print
      </button>
    </div>
  );
}
