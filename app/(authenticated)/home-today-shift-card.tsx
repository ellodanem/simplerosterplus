import Link from "next/link";
import type { HomeTodayShift } from "@/lib/home-today-shift";

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function statusPillClasses(status: HomeTodayShift["scheduled"][number]["status"]): string {
  switch (status) {
    case "present":
      return "bg-emerald-100 text-emerald-800";
    case "late":
      return "bg-amber-100 text-amber-800";
    case "awaiting":
      return "bg-slate-100 text-slate-700";
    case "absent":
      return "bg-rose-100 text-rose-800";
  }
}

function KpiChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose" | "slate";
}) {
  const toneClasses = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
    slate: "text-slate-600",
  }[tone];

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-2 text-center">
      <div className={`text-lg font-bold tabular-nums ${toneClasses}`}>{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </div>
    </div>
  );
}

export function HomeTodayShiftCard({
  todayShift,
  timeZone,
  attendanceHref,
}: {
  todayShift: HomeTodayShift;
  timeZone: string;
  attendanceHref: string;
}) {
  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
      aria-labelledby="today-shift-heading"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="today-shift-heading" className="text-sm font-semibold text-zinc-900">
            Today on shift
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {todayShift.todayLabel} · <span className="font-mono">{timeZone}</span>
          </p>
        </div>
      </div>

      {todayShift.stationClosed ? (
        <p className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Station closed today
          {todayShift.closedHolidayName ? ` — ${todayShift.closedHolidayName}` : ""}.
        </p>
      ) : todayShift.kpis && todayShift.kpis.scheduledTotal === 0 ? (
        <p className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          No shifts scheduled today.
        </p>
      ) : todayShift.kpis ? (
        <>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            <KpiChip label="Present" value={todayShift.kpis.present} tone="emerald" />
            <KpiChip label="Late" value={todayShift.kpis.late} tone="amber" />
            <KpiChip label="Absent" value={todayShift.kpis.absent} tone="rose" />
            <KpiChip label="Awaiting" value={todayShift.kpis.awaiting} tone="slate" />
          </div>

          <div className="mt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Scheduled today ({todayShift.kpis.scheduledTotal})
            </h3>
            <ul className="mt-2 space-y-2">
              {todayShift.scheduled.map((row) => (
                <li
                  key={row.staffId}
                  className="flex items-start justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">
                      {row.displayName}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-zinc-500">
                      {row.shiftName ?? "Shift"}
                      {row.firstInLabel || row.lastOutLabel ? (
                        <>
                          {" "}
                          ·{" "}
                          {row.firstInLabel ? `In ${row.firstInLabel}` : null}
                          {row.firstInLabel && row.lastOutLabel ? " · " : null}
                          {row.lastOutLabel ? `Out ${row.lastOutLabel}` : null}
                        </>
                      ) : (
                        <span className="text-zinc-400"> · —</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPillClasses(row.status)}`}
                  >
                    {row.statusLabel}
                  </span>
                </li>
              ))}
            </ul>
            {todayShift.hiddenScheduledCount > 0 ? (
              <p className="mt-2 text-xs text-zinc-500">
                +{todayShift.hiddenScheduledCount} more on shift today
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {!todayShift.stationClosed ? (
        <div className="mt-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Recent punches
          </h3>
          {todayShift.recentPunches.length > 0 ? (
            <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-100">
              {todayShift.recentPunches.map((punch) => (
                <li
                  key={punch.id}
                  className="flex items-center gap-2 px-2.5 py-2 text-xs"
                >
                  <span className="w-10 shrink-0 font-mono tabular-nums text-zinc-600">
                    {punch.timeLabel}
                  </span>
                  <span
                    className={`inline-flex w-8 shrink-0 justify-center rounded px-1 py-0.5 text-[10px] font-bold uppercase ${
                      punch.punchType === "in"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {punch.punchType}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">
                    {punch.staffName}
                  </span>
                  {punch.fromDevice ? (
                    <span
                      className="shrink-0 text-zinc-400"
                      title="Device punch"
                      aria-label="Device punch"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <rect x="4" y="2" width="16" height="20" rx="2" />
                        <path d="M12 18h.01" />
                      </svg>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">No punches yet today.</p>
          )}
        </div>
      ) : null}

      <Link
        href={attendanceHref}
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
      >
        View attendance today
        <ChevronRightIcon />
      </Link>
    </section>
  );
}
