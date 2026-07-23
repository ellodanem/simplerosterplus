"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OvertimeSettingsModal } from "@/app/components/overtime-settings-modal";
import { StaffAvatar } from "@/app/components/staff-avatar";
import { dayHeaderLabel } from "@/lib/roster-week";
import { formatYmdInZone, startOfLocalDayUtc } from "@/lib/datetime-policy";
import {
  presenceClasses,
  presenceGlyph,
  presenceLabel,
  type PresenceStatus,
} from "@/lib/attendance-policy";
import type {
  AttendanceCell,
  AttendanceStaff,
  AttendanceWeekData,
  SerializedOverride,
  SerializedPunch,
} from "@/lib/attendance-week";
import {
  countOvertimeAlerts,
  formatOvertimeHours,
  getWorkedMinutesByStaff,
  summarizeOvertimeByStaff,
  type OvertimeSettings,
  type OvertimeStatus,
} from "@/lib/overtime";
import { methodGlyph, methodFullLabel } from "./punch-method-badge";
import { useSuggestedPunchType } from "./use-suggested-punch-type";
import { useAttendanceFilters } from "./attendance-filter-context";
import {
  filterStaffForAttendanceDisplay,
  isArchivedAttendanceStaff,
} from "@/lib/attendance-staff-display";

type Holiday = { name: string; stationClosed: boolean };
type BlockReason = "vacation" | "sickLeave" | "dayOff";
type AttendanceWeekViewState = Pick<
  AttendanceWeekData,
  | "staff"
  | "holidays"
  | "blockMap"
  | "expectedByCell"
  | "cells"
  | "punches"
  | "overrides"
  | "graceMinutes"
  | "irregularCount"
  | "irregularByStaff"
  | "filedYmds"
>;

const HHMM_RE = /^(\d{2}):(\d{2})$/;

export function AttendanceGrid({
  weekStartYmd,
  days,
  timeZone,
  prevWeek,
  nextWeek,
  thisWeek,
  todayYmd,
  staff,
  selectedStaffId,
  holidays,
  blockMap,
  expectedByCell,
  cells,
  punches,
  overrides,
  graceMinutes,
  irregularCount,
  irregularByStaff,
  filedYmds,
  initialOvertimeSettings,
  locationId,
}: {
  weekStartYmd: string;
  days: string[];
  timeZone: string;
  prevWeek: string;
  nextWeek: string;
  thisWeek: string;
  todayYmd: string;
  staff: AttendanceStaff[];
  /** When set, the grid shows only this staff member's row. Driven by `?staff=` in the URL. */
  selectedStaffId: string | null;
  holidays: Record<string, Holiday>;
  blockMap: Record<string, BlockReason>;
  expectedByCell: Record<string, { startHHmm: string; endHHmm: string }>;
  cells: Record<string, AttendanceCell>;
  punches: SerializedPunch[];
  overrides: SerializedOverride[];
  graceMinutes: number;
  irregularCount: number;
  irregularByStaff: Record<string, number>;
  filedYmds: string[];
  initialOvertimeSettings: OvertimeSettings;
  locationId: string;
}) {
  const router = useRouter();
  const { matchesStaff, showArchivedStaff } = useAttendanceFilters();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openCell, setOpenCell] = useState<{ staffId: string; ymd: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [showOvertimeSettings, setShowOvertimeSettings] = useState(false);
  const [overtimeSettings, setOvertimeSettings] = useState(initialOvertimeSettings);
  const [weekData, setWeekData] = useState<AttendanceWeekViewState>({
    staff,
    holidays,
    blockMap,
    expectedByCell,
    cells,
    punches,
    overrides,
    graceMinutes,
    irregularCount,
    irregularByStaff,
    filedYmds,
  });

  const reloadWeek = useCallback(async () => {
    const params = new URLSearchParams({
      week: weekStartYmd,
      location: locationId,
    });
    if (showArchivedStaff) params.set("archived", "1");
    const res = await fetch(`/api/attendance/week?${params.toString()}`);
    const body = (await res.json().catch(() => ({}))) as Partial<AttendanceWeekViewState> & {
      error?: string;
    };
    if (!res.ok) throw new Error(body.error || "Could not refresh attendance week");
    setWeekData({
      staff: body.staff ?? staff,
      holidays: body.holidays ?? holidays,
      blockMap: body.blockMap ?? blockMap,
      expectedByCell: body.expectedByCell ?? expectedByCell,
      cells: body.cells ?? cells,
      punches: body.punches ?? punches,
      overrides: body.overrides ?? overrides,
      graceMinutes: body.graceMinutes ?? graceMinutes,
      irregularCount: body.irregularCount ?? irregularCount,
      irregularByStaff: body.irregularByStaff ?? irregularByStaff,
      filedYmds: body.filedYmds ?? filedYmds,
    });
  }, [
    weekStartYmd,
    locationId,
    staff,
    holidays,
    blockMap,
    expectedByCell,
    cells,
    punches,
    overrides,
    graceMinutes,
    irregularCount,
    irregularByStaff,
    filedYmds,
    showArchivedStaff,
  ]);

  const currentStaff = weekData.staff;
  const currentHolidays = weekData.holidays;
  const currentBlockMap = weekData.blockMap;
  const currentExpectedByCell = weekData.expectedByCell;
  const currentCells = weekData.cells;
  const currentPunches = weekData.punches;
  const currentOverrides = weekData.overrides;
  const currentGraceMinutes = weekData.graceMinutes;
  const currentIrregularCount = weekData.irregularCount;
  const currentIrregularByStaff = weekData.irregularByStaff;
  const currentFiledYmds = weekData.filedYmds;

  const filedYmdSet = useMemo(() => new Set(currentFiledYmds), [currentFiledYmds]);

  const staffById = useMemo(() => {
    const m = new Map<string, AttendanceStaff>();
    for (const s of currentStaff) m.set(s.id, s);
    return m;
  }, [currentStaff]);

  const overrideByKey = useMemo(() => {
    const m = new Map<string, SerializedOverride>();
    for (const o of currentOverrides) m.set(`${o.staffId}__${o.date}`, o);
    return m;
  }, [currentOverrides]);

  const punchesByKey = useMemo(() => {
    const m = new Map<string, SerializedPunch[]>();
    for (const p of currentPunches) {
      if (!p.staffId) continue;
      const ymd = formatYmdInZone(new Date(p.punchAt), timeZone);
      if (!days.includes(ymd)) continue;
      const key = `${p.staffId}__${ymd}`;
      const arr = m.get(key);
      if (arr) arr.push(p);
      else m.set(key, [p]);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.punchAt.localeCompare(b.punchAt));
    }
    return m;
  }, [currentPunches, timeZone, days]);

  function cellKey(staffId: string, ymd: string): string {
    return `${staffId}__${ymd}`;
  }

  function blockedReason(s: AttendanceStaff, ymd: string): "holiday" | BlockReason | null {
    if (currentHolidays[ymd]?.stationClosed) return "holiday";
    return currentBlockMap[cellKey(s.id, ymd)] ?? null;
  }

  const filteredStaff = useMemo(
    () => currentStaff.filter(matchesStaff),
    [currentStaff, matchesStaff],
  );

  const visibleStaff = useMemo(() => {
    const base = selectedStaffId
      ? filteredStaff.filter((s) => s.id === selectedStaffId)
      : filteredStaff;
    return base;
  }, [filteredStaff, selectedStaffId]);

  const selectedStaff = selectedStaffId
    ? currentStaff.find((s) => s.id === selectedStaffId)
    : null;

  const visibleIrregularCount = useMemo(() => {
    if (!selectedStaffId) return currentIrregularCount;
    return currentIrregularByStaff[selectedStaffId] ?? 0;
  }, [selectedStaffId, currentIrregularCount, currentIrregularByStaff]);

  const workedMinutesByStaff = useMemo(
    () =>
      getWorkedMinutesByStaff({
        punches: currentPunches,
        weekStartYmd,
        timeZone,
      }),
    [currentPunches, timeZone, weekStartYmd],
  );

  const overtimeByStaff = useMemo(
    () => summarizeOvertimeByStaff(workedMinutesByStaff, overtimeSettings),
    [workedMinutesByStaff, overtimeSettings],
  );

  const visibleOvertimeAlertCounts = useMemo(
    () =>
      countOvertimeAlerts(
        visibleStaff.map(
          (person) =>
            overtimeByStaff[person.id] ?? {
              totalMinutes: 0,
              status: "normal" as const,
            },
        ),
      ),
    [overtimeByStaff, visibleStaff],
  );

  function weekUrl(weekYmd: string, staffId: string | null): string {
    const params = new URLSearchParams({
      view: "week",
      week: weekYmd,
      location: locationId,
    });
    if (staffId) params.set("staff", staffId);
    if (showArchivedStaff) params.set("archived", "1");
    return `/attendance?${params.toString()}`;
  }

  function goToWeek(ymd: string) {
    router.push(weekUrl(ymd, selectedStaffId));
  }

  function setStaffFilter(staffId: string | null) {
    router.push(weekUrl(weekStartYmd, staffId));
  }

  const orderedStaff = useMemo(() => {
    const railStaff = filterStaffForAttendanceDisplay(filteredStaff, showArchivedStaff);
    return [...railStaff].sort((a, b) => {
      const ai = currentIrregularByStaff[a.id] ?? 0;
      const bi = currentIrregularByStaff[b.id] ?? 0;
      if (ai !== bi) return bi - ai;
      const aArchived = isArchivedAttendanceStaff(a);
      const bArchived = isArchivedAttendanceStaff(b);
      if (aArchived !== bArchived) return aArchived ? 1 : -1;
      const ln = a.lastName.localeCompare(b.lastName);
      if (ln !== 0) return ln;
      return a.firstName.localeCompare(b.firstName);
    });
  }, [filteredStaff, showArchivedStaff, currentIrregularByStaff]);

  async function refresh() {
    await reloadWeek();
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToWeek(prevWeek)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => goToWeek(thisWeek)}
              disabled={thisWeek === weekStartYmd}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => goToWeek(nextWeek)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Next →
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              Jump to:
              <input
                type="date"
                value={weekStartYmd}
                onChange={(e) => {
                  if (e.target.value) goToWeek(e.target.value);
                }}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
              />
            </label>
            {overtimeSettings.enabled &&
            (visibleOvertimeAlertCounts.approaching > 0 || visibleOvertimeAlertCounts.over > 0) ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium ${
                  visibleOvertimeAlertCounts.over > 0
                    ? "border border-rose-200 bg-rose-50 text-rose-800"
                    : "border border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                OT:{" "}
                {[
                  visibleOvertimeAlertCounts.approaching > 0
                    ? `${visibleOvertimeAlertCounts.approaching} approaching`
                    : null,
                  visibleOvertimeAlertCounts.over > 0
                    ? `${visibleOvertimeAlertCounts.over} over`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : null}
            {visibleIrregularCount > 0 ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-sm font-medium text-rose-800"
                title="Switch to the Log tab to see the matching punches"
              >
                {visibleIrregularCount}{" "}
                {visibleIrregularCount === 1 ? "irregularity" : "irregularities"}
                {selectedStaff ? ` for ${selectedStaff.firstName}` : " this week"}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setShowOvertimeSettings(true)}
              className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              OT alerts
            </button>
          </div>
        </div>

        {selectedStaff ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <span>
              Showing{" "}
              <span className="font-semibold">
                {selectedStaff.firstName} {selectedStaff.lastName}
              </span>{" "}
              only
            </span>
            <button
              type="button"
              onClick={() => setStaffFilter(null)}
              className="rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Show all staff
            </button>
          </div>
        ) : null}

        {notice ? (
          <div
            className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            role="status"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-emerald-700 hover:text-emerald-900"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ) : null}

        {error ? (
          <div
            className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="status"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[58rem] table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: "10rem" }} />
              {days.map((d) => (
                <col key={d} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="sticky left-0 z-10 min-w-[10rem] border-r border-zinc-200 bg-zinc-50 px-3 py-3 text-left">
                  Staff
                </th>
                {days.map((d) => {
                  const h = dayHeaderLabel(d, timeZone);
                  const isToday = d === todayYmd;
                  const closed = currentHolidays[d]?.stationClosed;
                  const filed = filedYmdSet.has(d);
                  return (
                    <th
                      key={d}
                      aria-current={isToday ? "date" : undefined}
                      className={`min-w-[7rem] px-2 py-2 text-left ${
                        closed ? "bg-zinc-100" : filed ? "bg-zinc-50" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span className="text-xs font-semibold text-zinc-500">
                          {h.weekday}
                        </span>
                        <span className="text-sm font-medium normal-case text-zinc-800">
                          {h.date}
                        </span>
                        {filed ? (
                          <span
                            className="inline-flex items-center gap-0.5 rounded bg-zinc-200/80 px-1 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-zinc-600"
                            title="Filed in Extract Pay Period — read-only"
                          >
                            <span aria-hidden="true">🔒</span>
                            Filed
                          </span>
                        ) : null}
                      </div>
                      {currentHolidays[d] ? (
                        <div
                          className="mt-0.5 truncate text-[11px] font-normal normal-case text-zinc-500"
                          title={currentHolidays[d].name}
                        >
                          {currentHolidays[d].name}
                        </div>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {currentStaff.length === 0 ? (
                <tr>
                  <td
                    colSpan={1 + days.length}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    No staff yet. Add staff to the roster, then come back here to track
                    attendance.
                  </td>
                </tr>
              ) : (
                visibleStaff.map((s) => {
                  const overtimeSummary = overtimeByStaff[s.id];
                  return (
                    <tr key={s.id} className="hover:bg-zinc-50/40">
                      <td className="sticky left-0 z-10 border-r border-zinc-200 bg-white px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <StaffAvatar firstName={s.firstName} lastName={s.lastName} size="sm" />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() =>
                                setStaffFilter(selectedStaffId === s.id ? null : s.id)
                              }
                              className={`truncate text-left text-sm font-medium hover:underline ${
                                selectedStaffId === s.id
                                  ? "text-emerald-800"
                                  : isArchivedAttendanceStaff(s)
                                    ? "text-zinc-500"
                                    : "text-zinc-900"
                              }`}
                              title={`${s.firstName} ${s.lastName}`}
                            >
                              {s.firstName} {s.lastName}
                            </button>
                            {isArchivedAttendanceStaff(s) ? (
                              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                                Archived
                              </div>
                            ) : null}
                            {s.role ? (
                              <div className="truncate text-xs text-zinc-500" title={s.role}>
                                {s.role}
                              </div>
                            ) : null}
                            {overtimeSettings.enabled && (overtimeSummary?.totalMinutes ?? 0) > 0 ? (
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="text-zinc-500">
                                  {formatOvertimeHours(overtimeSummary?.totalMinutes ?? 0)} worked
                                </span>
                                {overtimeSummary && overtimeSummary.status !== "normal" ? (
                                  <span
                                    className={`rounded-full px-2 py-0.5 font-semibold ${overtimePillClasses(overtimeSummary.status)}`}
                                  >
                                    {overtimePillLabel(overtimeSummary.status)}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      {days.map((d) => {
                        const key = cellKey(s.id, d);
                        const cell = currentCells[key];
                        const expected = currentExpectedByCell[key] ?? null;
                        const cellPunches = punchesByKey.get(key) ?? [];
                        const filed = filedYmdSet.has(d);
                        return (
                          <td key={d} className="p-1 align-top">
                            <AttendanceCellButton
                              status={cell?.status ?? "no_shift"}
                              expected={expected}
                              punches={cellPunches}
                              timeZone={timeZone}
                              isToday={d === todayYmd}
                              filed={filed}
                              onClick={() => {
                                if (blockedReason(s, d) && !filed) {
                                  // Block reason cells aren't interactive — keeps parity
                                  // with roster grid where blocked cells are read-only.
                                  return;
                                }
                                setOpenCell({ staffId: s.id, ymd: d });
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Grace window: <span className="font-semibold">{currentGraceMinutes} min</span> after
          shift start before a punch counts as late; absent only after that window with no
          in-punch. OT uses worked hours for the week. Click an open cell to add a punch or
          override the day. Filed days (🔒) are read-only after Extract Pay Period is saved.
        </p>
      </div>

      <aside className="w-full shrink-0 rounded-xl border border-zinc-200 bg-white p-3 lg:w-64">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Staff this week
          </span>
          {selectedStaffId ? (
            <button
              type="button"
              onClick={() => setStaffFilter(null)}
              className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900"
            >
              Show all
            </button>
          ) : null}
        </div>
        {showArchivedStaff ? (
          <p className="mb-2 text-[11px] leading-snug text-zinc-500">
            Archived staff are shown for audit. Days after their archive date stay blank.
          </p>
        ) : null}
        <ul className="divide-y divide-zinc-100">
          {orderedStaff.length === 0 ? (
            <li className="py-2 text-sm text-zinc-500">No staff yet.</li>
          ) : (
            orderedStaff.map((s) => {
              const count = currentIrregularByStaff[s.id] ?? 0;
              const active = selectedStaffId === s.id;
              const archived = isArchivedAttendanceStaff(s);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setStaffFilter(active ? null : s.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-2 rounded-md py-1.5 pl-1 pr-0.5 text-left text-sm transition ${
                      active
                        ? "bg-emerald-50 ring-1 ring-emerald-200"
                        : archived
                          ? "text-zinc-500 hover:bg-zinc-50"
                          : "hover:bg-zinc-50"
                    }`}
                  >
                    <StaffAvatar firstName={s.firstName} lastName={s.lastName} size="sm" />
                    <span
                      className={`min-w-0 flex-1 truncate ${
                        active ? "font-medium text-emerald-900" : archived ? "text-zinc-500" : "text-zinc-800"
                      }`}
                      title={`${s.firstName} ${s.lastName}`}
                    >
                      {s.firstName} {s.lastName}
                      {archived ? (
                        <span className="ml-1.5 inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                          Archived
                        </span>
                      ) : null}
                    </span>
                    {count > 0 ? (
                      <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-rose-100 px-1.5 text-[11px] font-semibold text-rose-700">
                        {count}
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-600">OK</span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {showOvertimeSettings ? (
        <OvertimeSettingsModal
          initialSettings={overtimeSettings}
          onClose={() => setShowOvertimeSettings(false)}
          onSaved={(nextSettings, message) => {
            setShowOvertimeSettings(false);
            setOvertimeSettings(nextSettings);
            setNotice(message);
          }}
        />
      ) : null}

      {openCell ? (
        <CellEditorModal
          staff={staffById.get(openCell.staffId)!}
          ymd={openCell.ymd}
          timeZone={timeZone}
          expected={currentExpectedByCell[cellKey(openCell.staffId, openCell.ymd)] ?? null}
          cell={currentCells[cellKey(openCell.staffId, openCell.ymd)] ?? null}
          punches={punchesByKey.get(cellKey(openCell.staffId, openCell.ymd)) ?? []}
          override={overrideByKey.get(cellKey(openCell.staffId, openCell.ymd)) ?? null}
          readOnly={filedYmdSet.has(openCell.ymd)}
          pending={pending}
          onError={setError}
          onNotice={setNotice}
          onClose={() => setOpenCell(null)}
          onMutate={async (fn) => {
            setPending(true);
            setError(null);
            try {
              await fn();
              await refresh();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setPending(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function overtimePillLabel(status: OvertimeStatus): string {
  return status === "over" ? "Over OT" : "Approaching OT";
}

function overtimePillClasses(status: OvertimeStatus): string {
  return status === "over"
    ? "bg-rose-100 text-rose-800"
    : "bg-amber-100 text-amber-800";
}

function AttendanceCellButton({
  status,
  expected,
  punches,
  timeZone,
  isToday,
  filed,
  onClick,
}: {
  status: PresenceStatus;
  expected: { startHHmm: string; endHHmm: string } | null;
  punches: SerializedPunch[];
  timeZone: string;
  isToday: boolean;
  filed: boolean;
  onClick: () => void;
}) {
  const classes = presenceClasses(status);
  const blocked =
    status === "station_closed" ||
    status === "on_vacation" ||
    status === "on_sick_leave" ||
    status === "day_off";
  const interactive = filed || !blocked;
  const title = filed
    ? `${presenceLabel(status)} — filed in Extract Pay Period (read-only)`
    : presenceLabel(status);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      title={title}
      className={`flex min-h-16 w-full flex-col items-stretch gap-1 rounded-lg border px-2 py-1 text-left transition disabled:cursor-not-allowed ${
        filed
          ? "border-zinc-200/80 bg-zinc-50/90"
          : classes.soft || (isToday ? "bg-emerald-50/40" : "bg-white")
      } ${
        interactive && !filed
          ? "border-zinc-200 hover:border-zinc-400"
          : interactive && filed
            ? "border-zinc-200/80 hover:border-zinc-300"
            : "border-zinc-200/70 opacity-80"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-bold ${classes.solid}`}
          aria-hidden="true"
        >
          {presenceGlyph(status)}
        </span>
        <span className="truncate text-[11px] font-medium text-zinc-700">
          {presenceLabel(status)}
        </span>
        {filed ? (
          <span
            className="ml-auto shrink-0 text-[10px] text-zinc-400"
            aria-hidden="true"
            title="Filed — read-only"
          >
            🔒
          </span>
        ) : null}
      </div>
      {expected ? (
        <div className="truncate text-[10px] text-zinc-500">
          {expected.startHHmm}–{expected.endHHmm}
        </div>
      ) : null}
      {punches.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {punches.map((p) => {
            const methodTitle = methodFullLabel(p.source, p.verifyMethod);
            const correctedTitle = p.corrected
              ? `Corrected — original ${p.originalPunchAt ? formatTimeInZone(p.originalPunchAt, timeZone) : "?"}`
              : null;
            return (
              <span
                key={p.id}
                className={`inline-flex max-w-full items-center gap-0.5 self-start rounded px-1 font-mono text-[10px] ${
                  p.punchType === "in"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-orange-100 text-orange-800"
                }`}
                title={correctedTitle ? `${correctedTitle} · ${methodTitle}` : methodTitle}
              >
                <span aria-hidden="true">{p.punchType === "in" ? "↓" : "↑"}</span>
                {formatTimeInZone(p.punchAt, timeZone)}
                <span aria-hidden="true" className="ml-0.5 opacity-70">
                  {methodGlyph(p.source, p.verifyMethod)}
                </span>
              </span>
            );
          })}
        </div>
      ) : null}
    </button>
  );
}

function formatTimeInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/**
 * Per-cell editor. Lets the supervisor add/edit/delete punches and set an override on a
 * single (staff, day). Modeled after Roster's `ShiftPopover` but rendered as a centered
 * modal because there's more content per cell than a quick template-picker.
 */
function CellEditorModal({
  staff,
  ymd,
  timeZone,
  expected,
  cell,
  punches,
  override,
  readOnly,
  pending,
  onError,
  onNotice,
  onClose,
  onMutate,
}: {
  staff: AttendanceStaff;
  ymd: string;
  timeZone: string;
  expected: { startHHmm: string; endHHmm: string } | null;
  cell: AttendanceCell | null;
  punches: SerializedPunch[];
  override: SerializedOverride | null;
  readOnly: boolean;
  pending: boolean;
  onError: (msg: string) => void;
  onNotice: (msg: string) => void;
  onClose: () => void;
  onMutate: (fn: () => Promise<void>) => Promise<void>;
}) {
  // Default the new-punch time to the expected shift's start/end when one exists, so
  // back-filling a forgotten clock-in defaults to the obvious right answer. Falls back to
  // "now" in zone when there's no roster entry on this day.
  const defaultInTime = expected?.startHHmm ?? nowHhmmInZone(timeZone);
  const defaultOutTime = expected?.endHHmm ?? nowHhmmInZone(timeZone);

  const { type: newType, setType: setNewType, refresh: refreshSuggestedType } =
    useSuggestedPunchType(staff.id);
  const [newTime, setNewTime] = useState<string>(defaultInTime);
  const [newNote, setNewNote] = useState<string>("");
  const [overrideStatus, setOverrideStatus] = useState<"present" | "absent" | null>(
    override?.status ?? null,
  );
  const [lateReason, setLateReason] = useState<string>(override?.lateReason ?? "");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function onPickType(t: "in" | "out") {
    setNewType(t);
    setNewTime(t === "in" ? defaultInTime : defaultOutTime);
  }

  async function addPunch() {
    if (!HHMM_RE.test(newTime)) {
      onError("Time must be HH:MM (24-hour).");
      return;
    }
    const punchAt = combineYmdAndHhmm(ymd, newTime, timeZone);
    await onMutate(async () => {
      const res = await fetch("/api/attendance/punches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staff.id,
          punchAt: punchAt.toISOString(),
          punchType: newType,
          note: newNote.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not add punch");
      onNotice(`Added ${newType === "in" ? "in" : "out"}-punch at ${newTime}.`);
      setNewNote("");
      refreshSuggestedType();
    });
  }

  async function deletePunch(id: string) {
    const ok = window.confirm("Delete this punch? This cannot be undone.");
    if (!ok) return;
    await onMutate(async () => {
      const res = await fetch(`/api/attendance/punches/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not delete punch");
      onNotice("Punch deleted.");
      refreshSuggestedType();
    });
  }

  async function saveOverride(next: "present" | "absent" | null) {
    await onMutate(async () => {
      const res = await fetch("/api/attendance/overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staff.id,
          date: ymd,
          status: next,
          lateReason: lateReason.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save override");
      setOverrideStatus(next);
      onNotice(next === null ? "Override cleared." : `Marked as ${next}.`);
    });
  }

  const status = cell?.status ?? "no_shift";
  const classes = presenceClasses(status);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-0 cursor-default bg-zinc-900/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Attendance for ${staff.firstName} ${staff.lastName} on ${ymd}`}
        className="relative z-10 mt-4 w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <StaffAvatar firstName={staff.firstName} lastName={staff.lastName} size="md" />
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                {staff.firstName} {staff.lastName}
              </h2>
              <p className="text-xs text-zinc-500">{dayHeaderLabel(ymd, timeZone).date}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {readOnly ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              This day was filed in Extract Pay Period and is read-only. Open the saved pay
              period to review or print.
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex size-6 items-center justify-center rounded text-xs font-bold ${classes.solid}`}
              aria-hidden="true"
            >
              {presenceGlyph(status)}
            </span>
            <span className="text-sm font-medium text-zinc-900">
              {presenceLabel(status)}
            </span>
            {expected ? (
              <span className="text-xs text-zinc-500">
                Expected {expected.startHHmm}–{expected.endHHmm}
              </span>
            ) : (
              <span className="text-xs text-zinc-500">No shift scheduled</span>
            )}
          </div>

          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Punches on this day
            </h3>
            {punches.length === 0 ? (
              <p className="text-sm text-zinc-500">No punches yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
                {punches.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded px-1.5 text-[10px] font-semibold uppercase ${
                          p.punchType === "in"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {p.punchType}
                      </span>
                      <span className="font-mono text-zinc-800">
                        {formatTimeInZone(p.punchAt, timeZone)}
                      </span>
                      {p.corrected ? (
                        <span
                          className="rounded bg-violet-100 px-1.5 text-[10px] font-semibold uppercase text-violet-800"
                          title={
                            p.originalPunchAt
                              ? `Originally ${formatTimeInZone(p.originalPunchAt, timeZone)}`
                              : undefined
                          }
                        >
                          Corrected
                        </span>
                      ) : null}
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500"
                        title={methodFullLabel(p.source, p.verifyMethod)}
                      >
                        <span aria-hidden="true">{methodGlyph(p.source, p.verifyMethod)}</span>
                      </span>
                    </span>
                    {!readOnly ? (
                      <button
                        type="button"
                        onClick={() => deletePunch(p.id)}
                        disabled={pending}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
                        aria-label="Delete punch"
                        title="Delete punch"
                      >
                        ✕
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!readOnly ? (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Add a punch
            </h3>
            <div className="flex flex-wrap items-end gap-2">
              <div className="inline-flex overflow-hidden rounded-md border border-zinc-300">
                <button
                  type="button"
                  onClick={() => onPickType("in")}
                  className={`px-2.5 py-1 text-sm font-medium ${
                    newType === "in"
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  In
                </button>
                <button
                  type="button"
                  onClick={() => onPickType("out")}
                  className={`border-l border-zinc-300 px-2.5 py-1 text-sm font-medium ${
                    newType === "out"
                      ? "bg-orange-600 text-white"
                      : "bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  Out
                </button>
              </div>
              <label className="flex flex-col text-xs text-zinc-600">
                Time
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                />
              </label>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Note (optional)"
                className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={addPunch}
                disabled={pending}
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add
              </button>
            </div>
          </section>
          ) : null}

          {!readOnly ? (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Override
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => saveOverride("present")}
                disabled={pending}
                className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                  overrideStatus === "present"
                    ? "bg-emerald-700 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Mark present
              </button>
              <button
                type="button"
                onClick={() => saveOverride("absent")}
                disabled={pending}
                className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                  overrideStatus === "absent"
                    ? "bg-rose-700 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Mark absent
              </button>
              <button
                type="button"
                onClick={() => saveOverride(null)}
                disabled={pending || overrideStatus === null}
                className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear
              </button>
            </div>
            <input
              type="text"
              value={lateReason}
              onChange={(e) => setLateReason(e.target.value)}
              placeholder="Late reason (optional)"
              className="mt-2 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Overrides win over computed status — e.g. mark present even when no punches
              landed, or absent even when the staff punched in.
            </p>
          </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Current HH:MM in the given IANA zone, used when there's no scheduled shift to default to. */
function nowHhmmInZone(timeZone: string): string {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return f.format(new Date());
}

/**
 * Combine a `YYYY-MM-DD` and `HH:MM` (both interpreted in `timeZone`) into a single UTC
 * instant. Reuses `startOfLocalDayUtc` for the DST-safe day resolution then offsets by
 * the minutes-of-day — same approach as the server-side policy helper.
 */
function combineYmdAndHhmm(ymd: string, hhmm: string, timeZone: string): Date {
  const m = HHMM_RE.exec(hhmm);
  if (!m) throw new Error("Time must be HH:MM");
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  const dayStart = startOfLocalDayUtc(ymd, timeZone);
  return new Date(dayStart.getTime() + (hours * 60 + minutes) * 60_000);
}
