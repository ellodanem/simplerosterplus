"use client";

import { useRef, useState } from "react";
import { RosterShareTable } from "@/app/components/roster-share-table";
import {
  captureElementToPng,
  downloadDataUrl,
} from "@/lib/client/roster-png-capture";
import type { RosterShareViewData } from "@/lib/roster-share-data";
import { dayHeaderLabel } from "@/lib/roster-week";

function closeShareWindow() {
  window.close();
}

export function ShareRosterClient({
  data,
  todayYmd,
}: {
  data: RosterShareViewData;
  todayYmd: string;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekStartLabel = dayHeaderLabel(data.weekStartYmd, data.timeZone);
  const weekEndLabel = dayHeaderLabel(data.weekEndYmd, data.timeZone);

  async function downloadImage() {
    if (!captureRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const png = await captureElementToPng(captureRef.current);
      downloadDataUrl(png, `roster-${data.weekStartYmd}.png`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          Read-only roster — open this link anytime, or download an image to save or share.
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void downloadImage()}
            disabled={busy}
            className="rounded-md border border-emerald-600 bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
          >
            {busy ? "Preparing…" : "Download image"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            Print
          </button>
          <button
            type="button"
            onClick={closeShareWindow}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>

      {error ? (
        <div className="no-print mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <div ref={captureRef} className="rounded-xl bg-white p-4 sm:p-6">
        <header className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Shared roster
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            {data.orgName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {data.locationName} · Week of {weekStartLabel.weekday} {weekStartLabel.date} –{" "}
            {weekEndLabel.weekday} {weekEndLabel.date} ·{" "}
            <span className="font-mono">{data.timeZone}</span>
          </p>
        </header>
        <RosterShareTable data={data} todayYmd={todayYmd} />
      </div>
    </>
  );
}
