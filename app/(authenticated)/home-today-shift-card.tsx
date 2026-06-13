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

export function HomeTodayShiftCard({
  todayShift,
  attendanceHref,
}: {
  todayShift: HomeTodayShift;
  attendanceHref: string;
}) {
  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
      aria-labelledby="today-shift-heading"
    >
      <h2 id="today-shift-heading" className="text-sm font-semibold text-zinc-900">
        Today on shift
      </h2>

      {todayShift.stationClosed ? (
        <p className="mt-2 text-xs text-zinc-600">
          {todayShift.todayLabel} — station closed
          {todayShift.closedHolidayName ? ` (${todayShift.closedHolidayName})` : ""}.
        </p>
      ) : todayShift.kpis && todayShift.kpis.scheduledTotal === 0 ? (
        <p className="mt-2 text-xs text-zinc-600">
          {todayShift.todayLabel} — no shifts scheduled today.
        </p>
      ) : todayShift.kpis ? (
        <p className="mt-2 text-xs text-zinc-600">
          <span className="font-medium text-zinc-800">{todayShift.todayLabel}</span>
          <span className="text-zinc-400"> · </span>
          <span className="font-semibold tabular-nums text-emerald-700">
            {todayShift.kpis.present}
          </span>{" "}
          present
          <span className="text-zinc-400"> · </span>
          <span className="font-semibold tabular-nums text-amber-700">
            {todayShift.kpis.late}
          </span>{" "}
          late
          <span className="text-zinc-400"> · </span>
          <span className="font-semibold tabular-nums text-rose-700">
            {todayShift.kpis.absent}
          </span>{" "}
          absent
        </p>
      ) : null}

      {!todayShift.stationClosed ? (
        <div className="mt-3">
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
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
      >
        View attendance today
        <ChevronRightIcon />
      </Link>
    </section>
  );
}
