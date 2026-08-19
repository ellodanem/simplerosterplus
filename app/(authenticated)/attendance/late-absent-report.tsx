"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  contrastTextForHex,
  type LateAbsentDayRow,
  type LateAbsentDrillDown,
  type LateAbsentPreset,
  type LateAbsentSummary,
} from "@/lib/late-absent-summary";

function statusPillClasses(status: LateAbsentDayRow["status"]): string {
  switch (status) {
    case "late":
      return "bg-amber-100 text-amber-900 ring-amber-200";
    case "absent":
    case "manual_absent":
      return "bg-rose-100 text-rose-900 ring-rose-200";
    case "present":
    case "manual_present":
      return "bg-emerald-100 text-emerald-900 ring-emerald-200";
    case "excused":
      return "bg-violet-100 text-violet-900 ring-violet-200";
    case "pending":
      return "bg-zinc-100 text-zinc-700 ring-zinc-200";
    case "exempt":
      return "bg-sky-100 text-sky-900 ring-sky-200";
  }
}

export function LateAbsentReport({
  orgName,
  locationId,
  locationName,
  timeZone,
  preset,
  startYmd,
  endYmd,
  periodLabel,
  summary,
  drillDown,
}: {
  orgName: string;
  locationId: string;
  locationName: string;
  timeZone: string;
  preset: LateAbsentPreset;
  startYmd: string;
  endYmd: string;
  periodLabel: string;
  summary: LateAbsentSummary;
  drillDown: LateAbsentDrillDown | null;
}) {
  const router = useRouter();
  const [localPreset, setLocalPreset] = useState<LateAbsentPreset>(preset);
  const [localStart, setLocalStart] = useState(startYmd);
  const [localEnd, setLocalEnd] = useState(endYmd);

  function applyFilters() {
    const params = new URLSearchParams({
      location: locationId,
      preset: localPreset,
    });
    if (localPreset === "custom") {
      params.set("start", localStart);
      params.set("end", localEnd);
    }
    if (drillDown) {
      params.set("staff", drillDown.staff.staffId);
    }
    router.push(`/attendance/late-absent?${params.toString()}`);
  }

  function openStaff(staffId: string) {
    const params = new URLSearchParams({
      location: locationId,
      preset,
      staff: staffId,
    });
    if (preset === "custom") {
      params.set("start", startYmd);
      params.set("end", endYmd);
    }
    router.push(`/attendance/late-absent?${params.toString()}`);
  }

  function backToSummary() {
    const params = new URLSearchParams({
      location: locationId,
      preset,
    });
    if (preset === "custom") {
      params.set("start", startYmd);
      params.set("end", endYmd);
    }
    router.push(`/attendance/late-absent?${params.toString()}`);
  }

  function downloadCsv() {
    const params = new URLSearchParams({
      location: locationId,
      preset,
    });
    if (preset === "custom") {
      params.set("start", startYmd);
      params.set("end", endYmd);
    }
    window.location.href = `/api/attendance/late-absent/csv?${params.toString()}`;
  }

  function printPage() {
    window.print();
  }

  const staffName = drillDown
    ? `${drillDown.staff.firstName} ${drillDown.staff.lastName}`
    : null;

  return (
    <div className="late-absent-root mx-auto max-w-5xl px-4 py-6">
      <div className="no-print mb-4">
        <Link
          href={`/attendance?location=${encodeURIComponent(locationId)}`}
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Attendance
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Late &amp; Absent
        </h1>
        <p className="mt-0.5 text-sm text-zinc-600">
          {orgName} · {locationName} · <span className="font-mono">{timeZone}</span>
        </p>
      </div>

      <div className="no-print mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Period</span>
            <select
              value={localPreset}
              onChange={(e) => setLocalPreset(e.target.value as LateAbsentPreset)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="this">This pay period</option>
              <option value="last">Last pay period</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {localPreset === "custom" ? (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">Start</span>
                <input
                  type="date"
                  value={localStart}
                  onChange={(e) => setLocalStart(e.target.value)}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">End</span>
                <input
                  type="date"
                  value={localEnd}
                  onChange={(e) => setLocalEnd(e.target.value)}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </label>
            </>
          ) : null}
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            Apply
          </button>
          <div className="ml-auto flex flex-wrap gap-2">
            {!drillDown ? (
              <button
                type="button"
                onClick={downloadCsv}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
              >
                Export CSV
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={printPage}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
                >
                  Print / PDF
                </button>
                <button
                  type="button"
                  onClick={backToSummary}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
                >
                  All staff
                </button>
              </>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-500">{periodLabel}</p>
      </div>

      {drillDown && staffName ? (
        <DrillDownView
          staffName={staffName}
          drillDown={drillDown}
          periodLabel={periodLabel}
        />
      ) : (
        <SummaryView summary={summary} onOpenStaff={openStaff} />
      )}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .late-absent-root {
            max-width: none;
            padding: 0;
          }
          body {
            background: white;
          }
          .print-colors {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

function SummaryView({
  summary,
  onOpenStaff,
}: {
  summary: LateAbsentSummary;
  onOpenStaff: (staffId: string) => void;
}) {
  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Late" value={summary.totalLate} tone="amber" />
        <MetricCard label="Absent" value={summary.totalAbsent} tone="rose" />
        <MetricCard
          label="Staff with incidents"
          value={summary.staffWithIncidents}
          hint={`${summary.staffRostered} rostered`}
          tone="zinc"
        />
      </div>

      <p className="mb-3 text-xs text-zinc-500">{summary.legend}</p>

      {summary.staff.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No late or absent incidents in this period.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-2.5">Staff</th>
                <th className="px-4 py-2.5 text-right">Late</th>
                <th className="px-4 py-2.5 text-right">Absent</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5">Last incident</th>
              </tr>
            </thead>
            <tbody>
              {summary.staff.map((s) => (
                <tr
                  key={s.staffId}
                  className="cursor-pointer border-b border-zinc-100 hover:bg-emerald-50/60"
                  onClick={() => onOpenStaff(s.staffId)}
                >
                  <td className="px-4 py-2.5 font-medium text-zinc-900">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-amber-800">
                    {s.lateCount}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-rose-800">
                    {s.absentCount}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-zinc-900">
                    {s.total}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600">
                    {s.lastIncidentLabel ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DrillDownView({
  staffName,
  drillDown,
  periodLabel,
}: {
  staffName: string;
  drillDown: LateAbsentDrillDown;
  periodLabel: string;
}) {
  const { staff, days, summary } = drillDown;
  const safeName = staffName.replace(/[^\w\-]+/g, "_").slice(0, 40);

  return (
    <div className="print-colors">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-zinc-900">{staffName}</h2>
        <p className="text-sm text-zinc-600">
          {periodLabel} · {staff.lateCount} late · {staff.absentCount} absent
        </p>
        <p className="mt-1 text-xs text-zinc-500">{summary.legend}</p>
        <p className="no-print mt-1 text-[11px] text-zinc-400">
          File hint: late-absent-{safeName}-{summary.startYmd}-to-{summary.endYmd}.pdf
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Shift</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Punch</th>
              <th className="px-4 py-2.5">After start</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.ymd} className="border-b border-zinc-100">
                <td className="px-4 py-2.5 text-zinc-800">{d.dateLabel}</td>
                <td className="px-4 py-2.5">
                  <span
                    className="inline-flex rounded px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: d.shiftColor ?? "#e4e4e7",
                      color: contrastTextForHex(d.shiftColor),
                    }}
                  >
                    {d.shiftName}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusPillClasses(d.status)}`}
                  >
                    {d.statusLabel}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-700">
                  {d.punchLabel}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-700">
                  {d.afterStartLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone: "amber" | "rose" | "zinc";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50 text-rose-950"
        : "border-zinc-200 bg-zinc-50 text-zinc-900";
  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-xs opacity-70">{hint}</div> : null}
    </div>
  );
}
