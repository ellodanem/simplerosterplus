"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StaffAvatar } from "@/app/components/staff-avatar";
import {
  presenceClasses,
  presenceLabel,
  type PresenceStatus,
} from "@/lib/attendance-policy";
import type { AttendanceStaff } from "@/lib/attendance-week";
import type { AttendanceLogData, LogKpis, LogRow } from "@/lib/attendance-log-data";
import {
  filterStaffForAttendanceDisplay,
  isArchivedAttendanceStaff,
  sortStaffForAttendanceRail,
} from "@/lib/attendance-staff-display";
import { LogRowEditor } from "./log-row-editor";
import { AddPunchModal } from "./add-punch-modal";
import { GraceSettingsModal } from "./grace-settings-modal";
import { PunchMethodBadge } from "./punch-method-badge";
import { useAttendanceFilters } from "./attendance-filter-context";

type FilterKey = "all" | "late" | "corrected" | "manual" | "device" | "in" | "out";
type LogViewState = Pick<
  AttendanceLogData,
  "graceMinutes" | "staff" | "rows" | "kpis" | "hasMoreRows" | "rowLimit"
>;

export function AttendanceLog({
  timeZone,
  todayYmd,
  windowStartYmd,
  defaultWindowDays,
  expandedWindow,
  windowDays,
  graceMinutes,
  staff,
  rows,
  kpis,
  hasMoreRows,
  rowLimit,
  locationId,
}: {
  timeZone: string;
  todayYmd: string;
  windowStartYmd: string;
  defaultWindowDays: number;
  expandedWindow: boolean;
  windowDays: number;
  graceMinutes: number;
  staff: AttendanceStaff[];
  rows: LogRow[];
  kpis: LogKpis;
  hasMoreRows: boolean;
  rowLimit: number;
  locationId: string;
}) {
  const router = useRouter();
  const { matchesStaff, showArchivedStaff } = useAttendanceFilters();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [staffFilter, setStaffFilter] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGraceModal, setShowGraceModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [logData, setLogData] = useState<LogViewState>({
    graceMinutes,
    staff,
    rows,
    kpis,
    hasMoreRows,
    rowLimit,
  });

  // Deferred search is handled in AttendanceFilterProvider via useDeferredValue.
  const reloadLog = useCallback(async () => {
    const params = new URLSearchParams({ location: locationId });
    if (expandedWindow) params.set("all", "1");
    const res = await fetch(`/api/attendance/log?${params.toString()}`);
    const body = (await res.json().catch(() => ({}))) as Partial<LogViewState> & { error?: string };
    if (!res.ok) throw new Error(body.error || "Could not refresh attendance log");
    setLogData({
      graceMinutes: body.graceMinutes ?? graceMinutes,
      staff: body.staff ?? staff,
      rows: body.rows ?? rows,
      kpis: body.kpis ?? kpis,
      hasMoreRows: body.hasMoreRows ?? hasMoreRows,
      rowLimit: body.rowLimit ?? rowLimit,
    });
  }, [expandedWindow, graceMinutes, staff, rows, kpis, hasMoreRows, rowLimit, locationId]);

  const staffById = useMemo(() => {
    const m = new Map<string, AttendanceStaff>();
    for (const s of logData.staff) m.set(s.id, s);
    return m;
  }, [logData.staff]);

  const filteredRows = useMemo(() => {
    return logData.rows.filter((r) => {
      if (staffFilter && r.punch.staffId !== staffFilter) return false;
      if (r.punch.staffId) {
        const s = staffById.get(r.punch.staffId);
        if (s && !matchesStaff(s)) return false;
      }
      if (filter === "in" && r.punch.punchType !== "in") return false;
      if (filter === "out" && r.punch.punchType !== "out") return false;
      if (filter === "manual" && r.punch.source !== "manual") return false;
      if (filter === "device" && r.punch.source === "manual") return false;
      if (filter === "corrected" && !r.punch.corrected) return false;
      if (filter === "late") {
        if (r.punch.punchType !== "in") return false;
        if (r.dayStatus !== "late") return false;
      }
      return true;
    });
  }, [logData.rows, filter, staffFilter, matchesStaff, staffById]);

  useEffect(() => {
    if (!showArchivedStaff && staffFilter) {
      const selected = staffById.get(staffFilter);
      if (selected && isArchivedAttendanceStaff(selected)) {
        setStaffFilter(null);
      }
    }
  }, [showArchivedStaff, staffFilter, staffById]);

  const railStaff = useMemo(() => {
    const filtered = filterStaffForAttendanceDisplay(logData.staff, showArchivedStaff).filter(
      matchesStaff,
    );
    return sortStaffForAttendanceRail(filtered);
  }, [logData.staff, showArchivedStaff, matchesStaff]);

  // Per-staff punch counts for the right rail. Always computed from the unfiltered `rows`
  // (the full window) so the badge numbers don't blink to zero when a user clicks one row.
  const staffCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of logData.rows) {
      if (!r.punch.staffId) continue;
      m.set(r.punch.staffId, (m.get(r.punch.staffId) ?? 0) + 1);
    }
    return m;
  }, [logData.rows]);

  const grouped = useMemo(() => {
    const m = new Map<string, LogRow[]>();
    for (const r of filteredRows) {
      const arr = m.get(r.dayYmd);
      if (arr) arr.push(r);
      else m.set(r.dayYmd, [r]);
    }
    // Rows came in punchAt desc, so each day's array is already newest-first. Keys are
    // unique YMDs in arrival order — also already desc.
    return Array.from(m.entries());
  }, [filteredRows]);

  function toggleWindowSize() {
    const params = new URLSearchParams({ view: "log", location: locationId });
    if (!expandedWindow) params.set("all", "1");
    router.push(`/attendance?${params.toString()}`);
  }

  const editing = editingId ? logData.rows.find((r) => r.punch.id === editingId) ?? null : null;

  const activeStaff = staffFilter ? (staffById.get(staffFilter) ?? null) : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <KpiChips kpis={logData.kpis} active={filter} onPick={setFilter} />
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
        >
          <span aria-hidden="true">+</span>
          Add punch
        </button>
      </div>

      {notice ? (
        <Banner tone="success" message={notice} onDismiss={() => setNotice(null)} />
      ) : null}
      {error ? <Banner tone="error" message={error} onDismiss={() => setError(null)} /> : null}

      {/* Two-column layout: log on the left, staff filter rail on the right. The rail
          gives the log a finite width on wide screens (filling the previous empty space)
          while letting a single staff be picked for a focused view. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <FilterPills active={filter} onPick={setFilter} />
          </div>

          {activeStaff ? (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-900">
                <StaffAvatar
                  firstName={activeStaff.firstName}
                  lastName={activeStaff.lastName}
                  size="sm"
                />
                <span>
                  Viewing punches for{" "}
                  <span className="font-semibold">
                    {activeStaff.firstName} {activeStaff.lastName}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStaffFilter(null)}
                className="rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-emerald-800 hover:bg-emerald-100"
              >
                Clear
              </button>
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-200 bg-white">
            {grouped.length === 0 ? (
              <EmptyState
                expandedWindow={expandedWindow}
                windowDays={windowDays}
                hasAnyRows={logData.rows.length > 0}
                onAddPunch={() => setShowAddModal(true)}
              />
            ) : (
              grouped.map(([ymd, group]) => (
                <DayGroup
                  key={ymd}
                  ymd={ymd}
                  rows={group}
                  todayYmd={todayYmd}
                  timeZone={timeZone}
                  staffById={staffById}
                  onRowClick={(rowId) => setEditingId(rowId)}
                />
              ))
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500">
              <span>
                {`Showing the last ${windowDays} days from ${windowStartYmd} (${logData.rows.length} ${
                  logData.rows.length === 1 ? "punch" : "punches"
                }${logData.hasMoreRows ? `, capped to the most recent ${logData.rowLimit}` : ""}).`}
              </span>
              <button
                type="button"
                onClick={toggleWindowSize}
                className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {expandedWindow ? `Back to last ${defaultWindowDays} days` : "Show 120 days"}
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            Grace window: <span className="font-semibold">{logData.graceMinutes} min</span> after the
            scheduled start.{" "}
            <button
              type="button"
              onClick={() => setShowGraceModal(true)}
              className="font-medium text-emerald-700 hover:underline"
            >
              Change
            </button>
            . Click any row to edit, delete, or override the day. The{" "}
            <Link
              className="text-emerald-700 hover:underline"
              href={`/attendance?view=week&location=${encodeURIComponent(locationId)}`}
            >
              Week view
            </Link>{" "}
            shows the same data as a Mon–Sun grid.
          </p>
        </div>

        <StaffFilterRail
          staff={railStaff}
          counts={staffCounts}
          activeStaffId={staffFilter}
          showArchivedStaff={showArchivedStaff}
          onPick={(id) => setStaffFilter(id)}
        />
      </div>

      {editing ? (
        <LogRowEditor
          row={editing}
          staff={editing.punch.staffId ? (staffById.get(editing.punch.staffId) ?? null) : null}
          timeZone={timeZone}
          onClose={() => setEditingId(null)}
          onError={setError}
          onNotice={async (msg) => {
            setNotice(msg);
            try {
              await reloadLog();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      ) : null}

      {showAddModal ? (
        <AddPunchModal
          open
          staff={logData.staff}
          timeZone={timeZone}
          todayYmd={todayYmd}
          onClose={() => setShowAddModal(false)}
          onError={setError}
          onAdded={async (msg) => {
            setShowAddModal(false);
            setNotice(msg);
            try {
              await reloadLog();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      ) : null}

      {showGraceModal ? (
        <GraceSettingsModal
          initialMinutes={logData.graceMinutes}
          onClose={() => setShowGraceModal(false)}
          onError={setError}
          onSaved={(msg, nextGraceMinutes) => {
            setShowGraceModal(false);
            setNotice(msg);
            setLogData((curr) => ({ ...curr, graceMinutes: nextGraceMinutes }));
          }}
        />
      ) : null}
    </div>
  );
}

function KpiChips({
  kpis,
  active,
  onPick,
}: {
  kpis: LogKpis;
  active: FilterKey;
  onPick: (f: FilterKey) => void;
}) {
  const chips: Array<{ key: FilterKey; label: string; count: number; tone: string }> = [
    { key: "all", label: "Total", count: kpis.total, tone: "bg-zinc-100 text-zinc-800" },
    { key: "late", label: "Late", count: kpis.late, tone: "bg-amber-100 text-amber-800" },
    { key: "corrected", label: "Corrected", count: kpis.corrected, tone: "bg-violet-100 text-violet-800" },
    { key: "manual", label: "Manual", count: kpis.manual, tone: "bg-sky-100 text-sky-800" },
    { key: "device", label: "Device", count: kpis.device, tone: "bg-zinc-100 text-zinc-700" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onPick(c.key)}
          aria-pressed={active === c.key}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            active === c.key
              ? "ring-2 ring-emerald-600 ring-offset-1"
              : "hover:brightness-95"
          } ${c.tone}`}
        >
          <span>{c.label}</span>
          <span className="rounded bg-white/60 px-1.5 text-[10px] font-bold text-zinc-700">
            {c.count}
          </span>
        </button>
      ))}
    </div>
  );
}

function FilterPills({
  active,
  onPick,
}: {
  active: FilterKey;
  onPick: (f: FilterKey) => void;
}) {
  // Compact In/Out toggle. KPI chips above cover the other filter dimensions; keeping
  // this strip narrow leaves more room for the search input on small screens.
  const group: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: "All" },
    { key: "in", label: "In" },
    { key: "out", label: "Out" },
  ];
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-zinc-300 text-xs">
      {group.map((g, idx) => (
        <button
          key={g.key}
          type="button"
          onClick={() => onPick(g.key)}
          className={`${idx > 0 ? "border-l border-zinc-300" : ""} px-2.5 py-1 font-medium ${
            active === g.key
              ? "bg-zinc-900 text-white"
              : "bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

function DayGroup({
  ymd,
  rows,
  todayYmd,
  timeZone,
  staffById,
  onRowClick,
}: {
  ymd: string;
  rows: LogRow[];
  todayYmd: string;
  timeZone: string;
  staffById: Map<string, AttendanceStaff>;
  onRowClick: (rowId: string) => void;
}) {
  const heading = dayHeading(ymd, todayYmd, timeZone);
  return (
    <section>
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/95 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 backdrop-blur">
        {heading}
        <span className="ml-2 font-normal normal-case text-zinc-500">
          {rows.length} {rows.length === 1 ? "punch" : "punches"}
        </span>
      </div>
      <ul className="divide-y divide-zinc-100">
        {rows.map((r) => (
          <LogRowItem
            key={r.punch.id}
            row={r}
            timeZone={timeZone}
            staff={r.punch.staffId ? (staffById.get(r.punch.staffId) ?? null) : null}
            onClick={() => onRowClick(r.punch.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function LogRowItem({
  row,
  timeZone,
  staff,
  onClick,
}: {
  row: LogRow;
  timeZone: string;
  staff: AttendanceStaff | null;
  onClick: () => void;
}) {
  const { punch, dayStatus, minutesLate } = row;
  const statusClasses = presenceClasses(dayStatus);
  // Show the day-status pill only on the IN row — the OUT row would just repeat the same
  // pill, which is noise. Both rows still get the Corrected pill when applicable.
  const showStatus = punch.punchType === "in";
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        // Fixed-width slots so direction pills, status pills, corrected pills, and times
        // line up vertically across rows. flex-1 only on the name; everything else has
        // shrink-0 + an explicit width so the columns are consistent.
        className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-zinc-50/70"
      >
        {staff ? (
          <StaffAvatar
            firstName={staff.firstName}
            lastName={staff.lastName}
            size="md"
            title={`${staff.firstName} ${staff.lastName}`}
          />
        ) : (
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600"
            aria-hidden="true"
          >
            ?
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-900">
            {staff ? `${staff.firstName} ${staff.lastName}` : "Unmatched punch"}
          </div>
          <div className="truncate text-xs text-zinc-500">
            {staff?.role ?? (punch.deviceUserId ? `Device user ID ${punch.deviceUserId}` : "—")}
          </div>
        </div>

        <div className="w-16 shrink-0">
          <DirectionPill type={punch.punchType} />
        </div>

        <div className="w-24 shrink-0">
          {showStatus ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClasses.solid}`}
              title={presenceLabel(dayStatus)}
            >
              {statusPillLabel(dayStatus, minutesLate)}
            </span>
          ) : null}
        </div>

        <div className="w-20 shrink-0">
          {punch.corrected ? (
            <span
              className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-800"
              title={
                punch.originalPunchAt
                  ? `Originally ${formatTimeInZone(punch.originalPunchAt, timeZone)}`
                  : "Corrected"
              }
            >
              Corrected
            </span>
          ) : null}
        </div>

        <div className="w-20 shrink-0 text-right">
          <div className="font-mono text-sm tabular-nums text-zinc-900">
            {formatTimeInZone(punch.punchAt, timeZone)}
          </div>
          <div className="flex justify-end">
            <PunchMethodBadge
              source={punch.source}
              verifyMethod={punch.verifyMethod}
            />
          </div>
        </div>
      </button>
    </li>
  );
}

function DirectionPill({ type }: { type: "in" | "out" }) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
        type === "in"
          ? "bg-emerald-100 text-emerald-800"
          : "bg-orange-100 text-orange-800"
      }`}
      aria-label={type === "in" ? "Punch in" : "Punch out"}
    >
      <span aria-hidden="true">{type === "in" ? "↓" : "↑"}</span>
      {type.toUpperCase()}
    </span>
  );
}

function StaffFilterRail({
  staff,
  counts,
  activeStaffId,
  showArchivedStaff,
  onPick,
}: {
  staff: AttendanceStaff[];
  counts: Map<string, number>;
  activeStaffId: string | null;
  showArchivedStaff: boolean;
  onPick: (id: string | null) => void;
}) {
  return (
    <aside className="w-full shrink-0 rounded-xl border border-zinc-200 bg-white p-3 lg:w-64">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Filter by staff
        </div>
        {activeStaffId ? (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="text-[11px] font-medium text-emerald-700 hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      {showArchivedStaff ? (
        <p className="mb-2 text-[11px] leading-snug text-zinc-500">
          Archived staff are shown for audit. Punches before their archive date stay visible in
          the log.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => onPick(null)}
        aria-pressed={activeStaffId === null}
        className={`mb-1 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition ${
          activeStaffId === null
            ? "bg-emerald-50 text-emerald-900"
            : "text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        <span>All staff</span>
        <span className="rounded bg-zinc-100 px-1.5 text-[11px] font-semibold text-zinc-700">
          {Array.from(counts.values()).reduce((a, b) => a + b, 0)}
        </span>
      </button>

      <ul className="divide-y divide-zinc-100">
        {staff.length === 0 ? (
          <li className="py-2 text-sm text-zinc-500">No staff yet.</li>
        ) : (
          staff.map((s) => {
            const count = counts.get(s.id) ?? 0;
            const isActive = activeStaffId === s.id;
            const archived = isArchivedAttendanceStaff(s);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onPick(s.id)}
                  aria-pressed={isActive}
                  className={`flex w-full items-center gap-2 py-1.5 pl-1 pr-2 text-left text-sm transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-900"
                      : archived
                        ? "text-zinc-500 hover:bg-zinc-50"
                        : "hover:bg-zinc-50"
                  }`}
                >
                  <StaffAvatar firstName={s.firstName} lastName={s.lastName} size="sm" />
                  <span className="min-w-0 flex-1 truncate" title={`${s.firstName} ${s.lastName}`}>
                    <span>{s.firstName} {s.lastName}</span>
                    {archived ? (
                      <span className="ml-1.5 inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        Archived
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                      count > 0
                        ? "bg-zinc-100 text-zinc-700"
                        : "bg-zinc-50 text-zinc-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}

function statusPillLabel(status: PresenceStatus, minutesLate: number | null): string {
  switch (status) {
    case "present": return "On time";
    case "late": return minutesLate !== null ? `Late ${minutesLate}m` : "Late";
    case "absent": return "Absent";
    case "manual_present": return "Manual present";
    case "manual_absent": return "Manual absent";
    case "exempt": return "Exempt";
    case "on_vacation": return "Vacation";
    case "day_off": return "Day off";
    case "station_closed": return "Closed";
    case "scheduled": return "Scheduled";
    case "no_shift": return "Unscheduled";
  }
}

function EmptyState({
  expandedWindow,
  windowDays,
  hasAnyRows,
  onAddPunch,
}: {
  expandedWindow: boolean;
  windowDays: number;
  hasAnyRows: boolean;
  onAddPunch: () => void;
}) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-sm font-medium text-zinc-700">
        {expandedWindow
          ? "No punches in the extended history window."
          : hasAnyRows
            ? "No matches for your filters."
            : `No punches in the last ${windowDays} days yet.`}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {expandedWindow
          ? "Manual punches will appear here as you add them."
          : "Add one to get started, or switch to Week view to see the schedule."}
      </p>
      <button
        type="button"
        onClick={onAddPunch}
        className="mt-3 inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        <span aria-hidden="true">+</span>
        Add punch
      </button>
    </div>
  );
}

function Banner({
  tone,
  message,
  onDismiss,
}: {
  tone: "success" | "error";
  message: string;
  onDismiss: () => void;
}) {
  const cls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-red-200 bg-red-50 text-red-800";
  return (
    <div
      className={`mb-3 flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${cls}`}
      role="status"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

function dayHeading(ymd: string, todayYmd: string, timeZone: string): string {
  // Today / Yesterday / full date — for everything older, show the full weekday + date so
  // the grouping is unambiguous when scrolling.
  if (ymd === todayYmd) return `Today · ${formatLongDay(ymd, timeZone)}`;
  // Compute a YMD-difference string for "yesterday" without TZ headaches: take the YMDs
  // as if they were dates and subtract.
  const [y, m, d] = ymd.split("-").map(Number);
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  const a = Date.UTC(y, m - 1, d);
  const b = Date.UTC(ty, tm - 1, td);
  if (b - a === 24 * 60 * 60_000) return `Yesterday · ${formatLongDay(ymd, timeZone)}`;
  return formatLongDay(ymd, timeZone);
}

function formatLongDay(ymd: string, timeZone: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(probe);
}

function formatTimeInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
