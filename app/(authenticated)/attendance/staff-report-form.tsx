"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { StaffAttendanceReport, StaffReportDay } from "@/lib/staff-attendance-report";

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
};

function statusClasses(status: StaffReportDay["status"]): string {
  switch (status) {
    case "present":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "absent":
      return "bg-rose-50 text-rose-800 ring-rose-200";
    case "excused":
      return "bg-sky-50 text-sky-800 ring-sky-200";
    case "pending":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "off":
      return "bg-zinc-100 text-zinc-600 ring-zinc-200";
  }
}

/** Revert: plain mono string — punches.map((p) => `${p.timeLabel} ${p.punchType.toUpperCase()}…`).join(" · ") */
function punchChipClasses(punchType: "in" | "out"): string {
  return punchType === "in"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-orange-100 text-orange-800";
}

function PunchList({ punches }: { punches: StaffReportDay["punches"] }) {
  if (punches.length === 0) return <>—</>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {punches.map((p, i) => (
        <span key={`${p.timeLabel}-${p.punchType}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 ? (
            <span className="text-zinc-400" aria-hidden="true">
              ·
            </span>
          ) : null}
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${punchChipClasses(p.punchType)}`}
          >
            <span aria-hidden="true">{p.punchType === "in" ? "↓" : "↑"}</span>
            {p.timeLabel} {p.punchType.toUpperCase()}
            {p.corrected ? "*" : null}
          </span>
        </span>
      ))}
    </span>
  );
}

export function StaffReportForm({
  staff,
  locationId,
  defaultStaffId,
  defaultStartYmd,
  defaultEndYmd,
  initialReport,
  orgName,
  timeZone,
  locationName,
}: {
  staff: StaffOption[];
  locationId: string;
  defaultStaffId: string;
  defaultStartYmd: string;
  defaultEndYmd: string;
  initialReport: StaffAttendanceReport | null;
  orgName: string;
  timeZone: string;
  locationName: string;
}) {
  const router = useRouter();
  const [staffId, setStaffId] = useState(defaultStaffId);
  const [startYmd, setStartYmd] = useState(defaultStartYmd);
  const [endYmd, setEndYmd] = useState(defaultEndYmd);

  const report = initialReport;

  function generate() {
    if (!staffId || !startYmd || !endYmd) return;
    const params = new URLSearchParams({
      staff: staffId,
      start: startYmd,
      end: endYmd,
      location: locationId,
    });
    router.push(`/attendance/report?${params.toString()}`);
  }

  function printReport() {
    window.print();
  }

  const staffLabel = useMemo(() => {
    if (!report) return null;
    return `${report.staff.firstName} ${report.staff.lastName}`;
  }, [report]);

  return (
    <div className="staff-report-root">
      <div className="no-print mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Staff member</span>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="">Select staff…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Start date</span>
            <input
              type="date"
              value={startYmd}
              onChange={(e) => setStartYmd(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">End date</span>
            <input
              type="date"
              value={endYmd}
              onChange={(e) => setEndYmd(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={!staffId || !startYmd || !endYmd}
              className="inline-flex items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Generate report
            </button>
            {report ? (
              <button
                type="button"
                onClick={printReport}
                className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
              >
                Print
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {report ? (
        <div className="report-print-area rounded-lg border border-zinc-200 bg-white shadow-sm print:border-0 print:shadow-none">
          <div className="border-b border-zinc-200 px-4 py-4 print:px-0">
            <h2 className="text-lg font-semibold text-zinc-900">Staff attendance report</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {staffLabel} · {report.startYmd} to {report.endYmd}
            </p>
            <p className="text-sm text-zinc-500">
              {orgName} · {locationName} · {timeZone}
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-800">
              Period total: <span className="font-mono">{report.totalHoursLabel}</span>
            </p>
            <p className="text-xs text-zinc-500">
              Hours use the first {report.expectedPunchesPerDay} punches per day (report display
              only).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 print:bg-white">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-zinc-700">Date</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-zinc-700">Status</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-zinc-700">Clock times</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-zinc-700">Hours</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-zinc-700">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {report.days.map((day) => (
                  <tr key={day.ymd} className="align-top">
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-900">
                      <div className="font-medium">{day.weekday}</div>
                      <div className="text-zinc-500">{day.dateLabel}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusClasses(day.status)}`}
                      >
                        {day.statusLabel}
                      </span>
                      {day.punchQualityHint ? (
                        <p className="mt-1 max-w-[12rem] text-xs text-amber-700">
                          {day.punchQualityHint}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <PunchList punches={day.punches} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-zinc-900">
                      {day.hoursLabel ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-600">
                      {day.notes.length > 0 ? (
                        <ul className="list-inside list-disc space-y-0.5">
                          {day.notes.map((note, i) => (
                            <li key={`${day.ymd}-note-${i}`}>{note}</li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-zinc-200 bg-zinc-50 print:bg-white">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-zinc-700">
                    Period total
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-zinc-900">
                    {report.totalHoursLabel}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 print:px-0">
            * Corrected punch. Generated {new Date().toLocaleString()}.
          </p>
        </div>
      ) : (
        <div className="no-print rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-600">
          Choose a staff member and date range, then select Generate report.
        </div>
      )}

      <style jsx global>{`
        @media print {
          header,
          .no-print,
          nav[aria-label="Main"] {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .staff-report-root {
            max-width: none;
          }
          .report-print-area {
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
