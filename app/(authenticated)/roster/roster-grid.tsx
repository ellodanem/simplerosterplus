"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AddStaffForm } from "@/app/components/add-staff-form";
import { Modal } from "@/app/components/modal";
import { OvertimeSettingsModal } from "@/app/components/overtime-settings-modal";
import {
  isRosterDayLocked,
  rosterLockedDays,
  rosterUnlockedDays,
} from "@/lib/roster-week-lock";
import { dayHeaderLabel, dayHeaderLabelCompact, shiftYmd } from "@/lib/roster-week";
import { dateTextColorFromYmd } from "@/lib/date-color";
import { formatBreakMinutes, paidShiftMinutes } from "@/lib/shift-duration";
import {
  countOvertimeAlerts,
  formatOvertimeHours,
  getScheduledMinutesByStaff,
  summarizeOvertimeByStaff,
  type OvertimeSettings,
  type OvertimeStatus,
} from "@/lib/overtime";
import { HolidayCalendarSettings } from "./holiday-calendar-settings";
import { TemplatesManager, type Template } from "./templates-manager";
import { RequestsModal, type RequestStaff } from "./requests-modal";
import { WeekStartSettings } from "./week-start-settings";

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
};

type Holiday = { name: string; stationClosed: boolean };
type HolidayOption = { code: string; name: string };
type HolidayCalendarConfig = {
  countryCode: string | null;
  subdivisionCode: string | null;
  syncYears: number[];
  countries: HolidayOption[];
  subdivisions: HolidayOption[];
};

type BlockReason = "holiday" | "vacation" | "dayOff";

type CellAnchor = {
  type: "cell";
  staffId: string;
  ymd: string;
  top: number;
  left: number;
};
type RowAnchor = { type: "row"; staffId: string; top: number; left: number };
type Anchor = CellAnchor | RowAnchor;

const FALLBACK_COLOR = "#475569";

function formatRosterDayList(ymds: string[], timeZone: string): string {
  if (ymds.length === 0) return "";
  const labels = ymds.map((ymd) => {
    const header = dayHeaderLabel(ymd, timeZone);
    return `${header.weekday} ${header.date}`;
  });
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function isDayLocked(ymd: string, weekStartYmd: string, todayYmd: string): boolean {
  return isRosterDayLocked(ymd, weekStartYmd, todayYmd);
}

export function RosterGrid({
  weekId,
  weekStartYmd,
  weekStartWeekday,
  weekStartLabel,
  orgName,
  weekPublished,
  days,
  timeZone,
  prevWeek,
  nextWeek,
  thisWeek,
  todayYmd,
  weekLocked,
  staff,
  templates: initialTemplates,
  initialEntries,
  initialPreviousWeekEntries,
  holidays,
  blockMap: initialBlockMap,
  initialPendingCount,
  initialOpenRequests = false,
  initialOvertimeSettings,
  initialHolidayCalendar,
}: {
  weekId: string;
  weekStartYmd: string;
  weekStartWeekday: number;
  weekStartLabel: string;
  orgName: string;
  weekPublished: boolean;
  days: string[];
  timeZone: string;
  prevWeek: string;
  nextWeek: string;
  thisWeek: string;
  todayYmd: string;
  weekLocked: boolean;
  staff: Staff[];
  templates: Template[];
  initialEntries: Record<string, string>;
  initialPreviousWeekEntries: Record<string, string | null>;
  holidays: Record<string, Holiday>;
  blockMap: Record<string, "vacation" | "dayOff">;
  initialPendingCount: number;
  initialOpenRequests?: boolean;
  initialOvertimeSettings: OvertimeSettings;
  initialHolidayCalendar: HolidayCalendarConfig;
}) {
  const router = useRouter();
  const [staffRows, setStaffRows] = useState<Staff[]>(staff);
  const [entries, setEntries] = useState<Record<string, string>>(initialEntries);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [showPresets, setShowPresets] = useState(false);
  const [showWeekStartSettings, setShowWeekStartSettings] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showHolidaySettings, setShowHolidaySettings] = useState(false);
  const [showOvertimeSettings, setShowOvertimeSettings] = useState(false);
  const [showRequests, setShowRequests] = useState(initialOpenRequests);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(initialPendingCount);
  const [copying, setCopying] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (initialOpenRequests) setShowRequests(true);
  }, [initialOpenRequests]);
  const [blockMap, setBlockMap] = useState(initialBlockMap);
  const [overtimeSettings, setOvertimeSettings] = useState(initialOvertimeSettings);

  const templateById = useMemo(() => {
    const m = new Map<string, Template>();
    for (const t of templates) m.set(t.id, t);
    return m;
  }, [templates]);

  const staffById = useMemo(() => {
    const m = new Map<string, Staff>();
    for (const s of staffRows) m.set(s.id, s);
    return m;
  }, [staffRows]);

  const dayCounts = useMemo(() => {
    const result: Record<
      string,
      {
        templateCounts: Map<string, number>;
        offCount: number;
        isClosed: boolean;
      }
    > = {};
    for (const ymd of days) {
      const isClosed = !!holidays[ymd]?.stationClosed;
      const templateCounts = new Map<string, number>();
      let assigned = 0;
      let unavailable = 0;
      if (!isClosed) {
        for (const s of staffRows) {
          if (blockMap[`${s.id}__${ymd}`]) {
            unavailable++;
            continue;
          }
          const tplId = entries[`${s.id}__${ymd}`];
          if (tplId) {
            templateCounts.set(tplId, (templateCounts.get(tplId) ?? 0) + 1);
            assigned++;
          }
        }
      }
      const active = isClosed ? 0 : staffRows.length - unavailable;
      const offCount = Math.max(0, active - assigned);
      result[ymd] = { templateCounts, offCount, isClosed };
    }
    return result;
  }, [days, entries, holidays, staffRows, blockMap]);

  const scheduledMinutesByStaff = useMemo(() => {
    const shifts: Array<{ staffId: string; minutes: number }> = [];
    for (const [key, templateId] of Object.entries(entries)) {
      const template = templateById.get(templateId);
      if (!template) continue;
      const [staffId] = key.split("__");
      shifts.push({
        staffId,
        minutes: paidShiftMinutes(
          template.startTime,
          template.endTime,
          template.unpaidBreakMinutes ?? 0,
        ),
      });
    }
    return getScheduledMinutesByStaff(shifts);
  }, [entries, templateById]);

  const overtimeByStaff = useMemo(
    () => summarizeOvertimeByStaff(scheduledMinutesByStaff, overtimeSettings),
    [scheduledMinutesByStaff, overtimeSettings],
  );

  const overtimeAlertCounts = useMemo(
    () => countOvertimeAlerts(Object.values(overtimeByStaff)),
    [overtimeByStaff],
  );

  const lockedDays = useMemo(
    () => rosterLockedDays(weekStartYmd, todayYmd),
    [weekStartYmd, todayYmd],
  );
  const unlockedDays = useMemo(
    () => rosterUnlockedDays(weekStartYmd, todayYmd),
    [weekStartYmd, todayYmd],
  );
  const clearableShiftCount = useMemo(() => {
    let count = 0;
    for (const ymd of unlockedDays) {
      for (const s of staffRows) {
        if (blockMap[`${s.id}__${ymd}`]) continue;
        if (entries[`${s.id}__${ymd}`]) count++;
      }
    }
    return count;
  }, [unlockedDays, staffRows, blockMap, entries]);

  function cellKey(staffId: string, ymd: string): string {
    return `${staffId}__${ymd}`;
  }

  function lastWeekHoverText(staffId: string, ymd: string): string {
    const prevKey = cellKey(staffId, shiftYmd(ymd, -7));
    if (!(prevKey in initialPreviousWeekEntries)) {
      return "Last week: Not scheduled";
    }
    const templateId = initialPreviousWeekEntries[prevKey];
    if (!templateId) {
      return "Last week: Off";
    }
    const tpl = templateById.get(templateId);
    return tpl ? `Last week: ${tpl.name}` : "Last week: Off";
  }

  function blockedReason(s: Staff, ymd: string): BlockReason | null {
    const h = holidays[ymd];
    if (h && h.stationClosed) return "holiday";
    const leave = blockMap[`${s.id}__${ymd}`];
    if (leave) return leave;
    return null;
  }

  function openCellPopover(
    e: React.MouseEvent<HTMLButtonElement>,
    s: Staff,
    ymd: string,
  ) {
    if (weekLocked) return;
    if (isDayLocked(ymd, weekStartYmd, todayYmd)) return;
    if (blockedReason(s, ymd)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({
      type: "cell",
      staffId: s.id,
      ymd,
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
    });
  }

  function openRowPopover(e: React.MouseEvent<HTMLButtonElement>, s: Staff) {
    if (weekLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({
      type: "row",
      staffId: s.id,
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
    });
  }

  async function putEntry(staffId: string, ymd: string, templateId: string | null) {
    const res = await fetch(`/api/roster/weeks/${encodeURIComponent(weekId)}/entries`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, date: ymd, shiftTemplateId: templateId }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(data.error || "Could not save");
    }
  }

  async function putEntriesBatch(staffId: string, ymds: string[], templateId: string | null) {
    const res = await fetch(`/api/roster/weeks/${encodeURIComponent(weekId)}/entries/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, dates: ymds, shiftTemplateId: templateId }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(data.error || "Could not save shifts");
    }
  }

  async function setCell(staffId: string, ymd: string, templateId: string | null) {
    if (weekLocked) return;
    if (isDayLocked(ymd, weekStartYmd, todayYmd)) return;
    const key = cellKey(staffId, ymd);
    const previous = entries[key];
    setEntries((s) => {
      const next = { ...s };
      if (templateId) next[key] = templateId;
      else delete next[key];
      return next;
    });
    setPending((s) => ({ ...s, [key]: true }));
    setError(null);
    try {
      await putEntry(staffId, ymd, templateId);
    } catch (e) {
      setEntries((s) => {
        const next = { ...s };
        if (previous) next[key] = previous;
        else delete next[key];
        return next;
      });
      setError((e as Error).message);
    } finally {
      setPending((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
    }
  }

  async function applyToRow(staffId: string, templateId: string | null) {
    if (weekLocked) return;
    const s = staffById.get(staffId);
    if (!s) return;

    const targets: string[] = [];
    const previousByKey: Record<string, string | undefined> = {};
    for (const ymd of days) {
      if (isDayLocked(ymd, weekStartYmd, todayYmd)) continue;
      if (blockedReason(s, ymd)) continue;
      targets.push(ymd);
      previousByKey[cellKey(staffId, ymd)] = entries[cellKey(staffId, ymd)];
    }
    if (targets.length === 0) return;

    setEntries((curr) => {
      const next = { ...curr };
      for (const ymd of targets) {
        const k = cellKey(staffId, ymd);
        if (templateId) next[k] = templateId;
        else delete next[k];
      }
      return next;
    });
    setPending((curr) => {
      const next = { ...curr };
      for (const ymd of targets) next[cellKey(staffId, ymd)] = true;
      return next;
    });
    setError(null);

    try {
      await putEntriesBatch(staffId, targets, templateId);
    } catch (e) {
      setEntries((curr) => {
        const next = { ...curr };
        for (const ymd of targets) {
          const k = cellKey(staffId, ymd);
          const prev = previousByKey[k];
          if (prev) next[k] = prev;
          else delete next[k];
        }
        return next;
      });
      setError((e as Error).message);
    } finally {
      setPending((curr) => {
        const next = { ...curr };
        for (const ymd of targets) delete next[cellKey(staffId, ymd)];
        return next;
      });
    }
  }

  function goToWeek(ymd: string) {
    router.push(`/roster?week=${ymd}`);
  }

  function requestDates(req: {
    type: "vacation" | "dayOff";
    startDate?: string;
    endDate?: string;
    date?: string;
  }): string[] {
    if (req.type === "dayOff") return req.date ? [req.date] : [];
    if (!req.startDate || !req.endDate) return [];
    const dates: string[] = [];
    for (const ymd of days) {
      if (ymd >= req.startDate && ymd <= req.endDate) dates.push(ymd);
    }
    return dates;
  }

  function applyApprovedRequestChange(req: {
    type: "vacation" | "dayOff";
    staff: { id: string };
    startDate?: string;
    endDate?: string;
    date?: string;
  }, clearedDates: string[]) {
    const nextDates = requestDates(req);
    if (nextDates.length > 0) {
      setBlockMap((curr) => {
        const next = { ...curr };
        const blockType = req.type === "vacation" ? "vacation" : "dayOff";
        for (const ymd of nextDates) next[cellKey(req.staff.id, ymd)] = blockType;
        return next;
      });
    }
    if (clearedDates.length > 0) {
      setEntries((curr) => {
        const next = { ...curr };
        for (const ymd of clearedDates) delete next[cellKey(req.staff.id, ymd)];
        return next;
      });
    }
  }

  function removeApprovedRequestChange(req: {
    staff: { id: string };
    type: "vacation" | "dayOff";
    startDate?: string;
    endDate?: string;
    date?: string;
  }) {
    const nextDates = requestDates(req);
    if (nextDates.length === 0) return;
    setBlockMap((curr) => {
      const next = { ...curr };
      for (const ymd of nextDates) delete next[cellKey(req.staff.id, ymd)];
      return next;
    });
  }

  async function copyPreviousWeek() {
    if (weekLocked) return;
    const lockedLabel = lockedDays.length > 0 ? formatRosterDayList(lockedDays, timeZone) : null;
    if (Object.keys(entries).length > 0) {
      const ok = window.confirm(
        lockedLabel
          ? `Replace unlocked days with the previous week's shifts? ${lockedLabel} ${lockedDays.length === 1 ? "is" : "are"} locked and will not change. Approved vacation and days off will not change.`
          : "Replace this week's roster with the previous week's shifts? Existing entries will be overwritten.",
      );
      if (!ok) return;
    }
    setCopying(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/roster/weeks/${encodeURIComponent(weekId)}/copy-previous`,
        { method: "POST" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        copied?: number;
        skipped?: number;
        entries?: { staffId: string; date: string; shiftTemplateId: string | null }[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not copy previous week");

      const next: Record<string, string> = {};
      for (const e of data.entries ?? []) {
        if (e.shiftTemplateId) next[cellKey(e.staffId, e.date)] = e.shiftTemplateId;
      }
      setEntries(next);

      const copied = data.copied ?? 0;
      const skipped = data.skipped ?? 0;
      if (copied === 0 && skipped === 0) {
        setNotice("Previous week has no shifts to copy.");
      } else {
        const word = copied === 1 ? "shift" : "shifts";
        setNotice(
          `Copied ${copied} ${word} from the previous week${skipped > 0 ? ` (${skipped} skipped due to locked days, holidays, vacation, or approved days off)` : ""}.`,
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCopying(false);
    }
  }

  async function clearWeek() {
    if (weekLocked || unlockedDays.length === 0 || clearableShiftCount === 0) return;

    const unlockedLabel = formatRosterDayList(unlockedDays, timeZone);
    const lockedLabel =
      lockedDays.length > 0 ? formatRosterDayList(lockedDays, timeZone) : null;
    const shiftWord = clearableShiftCount === 1 ? "shift" : "shifts";

    let message = `Clear all ${clearableShiftCount} ${shiftWord} on ${unlockedLabel}?`;
    if (lockedLabel) {
      message += `\n\n${lockedLabel} ${lockedDays.length === 1 ? "is" : "are"} locked and will not change.`;
    }
    message += "\n\nApproved vacation and days off will not change.";

    if (!window.confirm(message)) return;

    setClearing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/roster/weeks/${encodeURIComponent(weekId)}/clear-unlocked`,
        { method: "POST" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        cleared?: number;
        skipped?: number;
        entries?: { staffId: string; date: string; shiftTemplateId: string | null }[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not clear week");

      const next: Record<string, string> = {};
      for (const e of data.entries ?? []) {
        if (e.shiftTemplateId) next[cellKey(e.staffId, e.date)] = e.shiftTemplateId;
      }
      setEntries(next);

      const cleared = data.cleared ?? 0;
      if (cleared === 0) {
        setNotice("No shifts to clear on unlocked days.");
      } else {
        const word = cleared === 1 ? "shift" : "shifts";
        setNotice(
          `Cleared ${cleared} ${word} on ${unlockedLabel}${lockedLabel ? `. Locked days (${lockedLabel}) were not changed` : ""}.`,
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Roster</h1>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900">
              Week starting {weekStartLabel}{" "}
              <span style={{ color: dateTextColorFromYmd(weekStartYmd) }}>
                {dayHeaderLabel(weekStartYmd, timeZone).date}
              </span>
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {orgName} · <span className="font-mono">{timeZone}</span>
            {weekPublished ? (
              <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                Published
              </span>
            ) : null}
            {weekLocked ? (
              <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-700">
                Locked
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyPreviousWeek}
            disabled={copying || weekLocked}
            title={weekLocked ? "Past weeks are read-only" : undefined}
            className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-sm font-medium text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copying ? "Copying…" : "Copy previous week"}
          </button>
          <button
            type="button"
            onClick={() => setShowRequests(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-sm font-medium text-rose-800 hover:bg-rose-100"
          >
            Requests
            {pendingRequests > 0 ? (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
                {pendingRequests}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setShowPresets(true)}
            className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-sm font-medium text-violet-800 hover:bg-violet-100"
          >
            Shift presets
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm font-medium text-zinc-400"
          >
            AI scheduler
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSettingsMenu((current) => !current)}
              aria-label="Open roster settings"
              aria-haspopup="menu"
              aria-expanded={showSettingsMenu}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              title="Roster settings"
            >
              <svg
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
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6c.36-.16.74-.24 1.13-.24H10a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.16.36.24.74.24 1.13V10a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .33H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1 .33 1.65 1.65 0 0 0-.51.34Z" />
              </svg>
            </button>
            {showSettingsMenu ? (
              <>
                <button
                  type="button"
                  aria-label="Close roster settings"
                  onClick={() => setShowSettingsMenu(false)}
                  className="fixed inset-0 z-30 cursor-default bg-transparent"
                />
                <div className="absolute right-0 top-full z-40 mt-2 w-48 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsMenu(false);
                      setShowWeekStartSettings(true);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    <span>Week start</span>
                    <span className="text-[11px] text-zinc-400">Calendar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsMenu(false);
                      setShowHolidaySettings(true);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    <span>Holiday calendar</span>
                    <span className="text-[11px] text-zinc-400">Sync</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsMenu(false);
                      setShowOvertimeSettings(true);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    <span>OT alerts</span>
                    <span className="text-[11px] text-zinc-400">Rules</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

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
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            disabled={thisWeek === weekStartYmd}
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
        <button
          type="button"
          onClick={() => void clearWeek()}
          disabled={weekLocked || clearing || unlockedDays.length === 0 || clearableShiftCount === 0}
          title={
            weekLocked
              ? "Past weeks are read-only"
              : clearableShiftCount === 0
                ? "No shifts on unlocked days"
                : lockedDays.length > 0
                  ? `Clears shifts on ${formatRosterDayList(unlockedDays, timeZone)} only`
                  : "Clear all shifts this week"
          }
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {clearing ? "Clearing…" : "Clear week"}
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            Jump to week:
            <input
              type="date"
              value={weekStartYmd}
              onChange={(e) => {
                if (e.target.value) goToWeek(e.target.value);
              }}
              className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
              title="Pick any day in the week; the roster snaps to that week's start date."
            />
          </label>
          {overtimeSettings.enabled &&
          (overtimeAlertCounts.approaching > 0 || overtimeAlertCounts.over > 0) ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium ${
                overtimeAlertCounts.over > 0
                  ? "border border-rose-200 bg-rose-50 text-rose-800"
                  : "border border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              OT:{" "}
              {[
                overtimeAlertCounts.approaching > 0
                  ? `${overtimeAlertCounts.approaching} approaching`
                  : null,
                overtimeAlertCounts.over > 0 ? `${overtimeAlertCounts.over} over` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : null}
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>You haven&apos;t created any shift presets yet.</span>
          <button
            type="button"
            onClick={() => setShowPresets(true)}
            className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-50"
          >
            Create one to start scheduling
          </button>
        </div>
      ) : null}

      {weekLocked ? (
        <div
          className="mb-3 rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-700"
          role="status"
        >
          This week has ended and is locked. Shifts are read-only; you can still review and use
          Requests.
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
                <div className="flex items-center justify-between gap-2">
                  <span>Staff</span>
                  <button
                    type="button"
                    onClick={() => setShowAddStaff(true)}
                    disabled={weekLocked}
                    title={weekLocked ? "Past weeks are read-only" : "Add staff"}
                    aria-label="Add staff"
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-sm font-bold leading-none text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </th>
              {days.map((d) => {
                const h = dayHeaderLabelCompact(d, timeZone);
                const isToday = d === todayYmd;
                const closed = holidays[d]?.stationClosed;
                const dayLocked = !weekLocked && isDayLocked(d, weekStartYmd, todayYmd);
                return (
                  <th
                    key={d}
                    aria-current={isToday ? "date" : undefined}
                    className={`min-w-[7rem] px-2 py-2 text-left ${
                      isToday
                        ? "bg-emerald-50"
                        : dayLocked
                          ? "bg-zinc-100"
                          : closed
                            ? "bg-zinc-100"
                            : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span
                        className={`text-xs font-semibold ${
                          isToday ? "text-emerald-700" : dayLocked ? "text-zinc-400" : "text-zinc-500"
                        }`}
                      >
                        {h.weekday}
                      </span>
                      <span
                        className={`text-sm font-medium normal-case ${
                          isToday ? "text-emerald-900" : dayLocked ? "text-zinc-500" : "text-zinc-800"
                        }`}
                      >
                        {h.date}
                      </span>
                      {dayLocked ? (
                        <span className="rounded bg-zinc-200 px-1 py-0.5 text-[10px] font-semibold normal-case text-zinc-600">
                          Locked
                        </span>
                      ) : null}
                    </div>
                    {holidays[d] ? (
                      <div
                        className="mt-0.5 truncate text-[11px] font-normal normal-case text-zinc-500"
                        title={holidays[d].name}
                      >
                        {holidays[d].name}
                      </div>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {staffRows.length === 0 ? (
              <tr>
                <td
                  colSpan={1 + days.length}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No staff yet.{" "}
                  {weekLocked ? null : (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowAddStaff(true)}
                        className="font-semibold text-emerald-700 underline hover:text-emerald-800"
                      >
                        Add staff
                      </button>{" "}
                    </>
                  )}
                  to start building the roster.
                </td>
              </tr>
            ) : (
              <>
                <tr className="bg-zinc-50">
                  <td className="sticky left-0 z-10 border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Count
                  </td>
                  {days.map((d) => {
                    const c = dayCounts[d];
                    if (c.isClosed) {
                      return (
                        <td
                          key={d}
                          className="bg-zinc-100 px-2 py-2 text-center text-xs text-zinc-400"
                        >
                          —
                        </td>
                      );
                    }
                    const items = Array.from(c.templateCounts.entries())
                      .map(([tplId, count]) => ({
                        template: templateById.get(tplId),
                        count,
                      }))
                      .filter((x): x is { template: Template; count: number } => !!x.template)
                      .sort((a, b) => a.template.name.localeCompare(b.template.name));
                    const isToday = d === todayYmd;
                    return (
                      <td
                        key={d}
                        className={`px-2 py-2 align-middle ${isToday ? "bg-emerald-50" : ""}`}
                      >
                        <div className="flex flex-wrap items-center gap-1">
                          {items.map(({ template, count }) => (
                            <span
                              key={template.id}
                              title={`${template.name}: ${count}`}
                              className="inline-flex size-5 items-center justify-center rounded text-[10px] font-bold text-white shadow-sm"
                              style={{ background: template.color || FALLBACK_COLOR }}
                            >
                              {count}
                            </span>
                          ))}
                          {c.offCount > 0 ? (
                            <span className="text-[11px] font-medium text-zinc-500">
                              Off: {c.offCount}
                            </span>
                          ) : null}
                          {items.length === 0 && c.offCount === 0 ? (
                            <span className="text-[11px] text-zinc-400">—</span>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                {staffRows.map((s) => {
                  const overtimeSummary = overtimeByStaff[s.id];
                  return (
                <tr key={s.id} className="hover:bg-zinc-50/40">
                  <td className="sticky left-0 z-10 border-r border-zinc-200 bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div
                          className="truncate font-medium text-zinc-900"
                          title={`${s.firstName} ${s.lastName}`}
                        >
                          {s.firstName} {s.lastName}
                        </div>
                        {s.role ? (
                          <div className="truncate text-xs text-zinc-500" title={s.role}>
                            {s.role}
                          </div>
                        ) : null}
                        {overtimeSettings.enabled && (overtimeSummary?.totalMinutes ?? 0) > 0 ? (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-zinc-500">
                              {formatOvertimeHours(overtimeSummary?.totalMinutes ?? 0)} scheduled
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
                      <button
                        type="button"
                        onClick={(e) => openRowPopover(e, s)}
                        disabled={weekLocked}
                        title={
                          weekLocked
                            ? "Past weeks are read-only"
                            : "Apply shift to all days this week"
                        }
                        aria-label={`Apply shift to all days for ${s.firstName} ${s.lastName}`}
                        className="shrink-0 rounded-md border border-zinc-300 bg-white p-1 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 12h14" />
                          <path d="M14 6l6 6-6 6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  {days.map((d) => {
                    const key = cellKey(s.id, d);
                    const templateId = entries[key];
                    const tpl = templateId ? templateById.get(templateId) : undefined;
                    const blocked = blockedReason(s, d);
                    const isPending = !!pending[key];
                    const dayLocked = weekLocked || isDayLocked(d, weekStartYmd, todayYmd);
                    return (
                      <td key={d} className="p-1 align-top">
                        <CellButton
                          tpl={tpl}
                          blocked={blocked}
                          holidayName={holidays[d]?.name ?? null}
                          pending={isPending}
                          readOnly={dayLocked}
                          lastWeekTitle={lastWeekHoverText(s.id, d)}
                          onClick={(e) => openCellPopover(e, s, d)}
                        />
                      </td>
                    );
                  })}
                </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>

      {anchor && !weekLocked ? (
        <ShiftPopover
          anchor={anchor}
          title={anchor.type === "row" ? "Apply to whole week" : "Assign shift"}
          clearLabel={anchor.type === "row" ? "Clear all (Off)" : "Clear (Off)"}
          templates={templates}
          currentTemplateId={
            anchor.type === "cell"
              ? (entries[cellKey(anchor.staffId, anchor.ymd)] ?? null)
              : null
          }
          onPick={async (templateId) => {
            const a = anchor;
            setAnchor(null);
            if (a.type === "cell") {
              await setCell(a.staffId, a.ymd, templateId);
            } else {
              await applyToRow(a.staffId, templateId);
            }
          }}
          onManagePresets={() => {
            setAnchor(null);
            setShowPresets(true);
          }}
          onClose={() => setAnchor(null)}
        />
      ) : null}

      {showWeekStartSettings ? (
        <WeekStartSettings
          initialWeekday={weekStartWeekday}
          onClose={() => setShowWeekStartSettings(false)}
        />
      ) : null}

      {showHolidaySettings ? (
        <HolidayCalendarSettings
          initialCountryCode={initialHolidayCalendar.countryCode}
          initialSubdivisionCode={initialHolidayCalendar.subdivisionCode}
          initialSyncYears={initialHolidayCalendar.syncYears}
          initialCountries={initialHolidayCalendar.countries}
          initialSubdivisions={initialHolidayCalendar.subdivisions}
          onClose={() => setShowHolidaySettings(false)}
          onSaved={(message) => {
            setShowHolidaySettings(false);
            setNotice(message);
          }}
        />
      ) : null}

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

      <Modal
        open={showPresets}
        onClose={() => setShowPresets(false)}
        title="Shift presets"
        size="xl"
      >
        <TemplatesManager initial={templates} onChange={setTemplates} />
      </Modal>

      <RequestsModal
        open={showRequests}
        onClose={() => setShowRequests(false)}
        staff={staffRows as RequestStaff[]}
        onPendingCountChange={setPendingRequests}
        onRequestChanged={(change) => {
          if (change.kind === "approved") {
            applyApprovedRequestChange(change.request, change.clearedDates);
          } else {
            removeApprovedRequestChange(change.request);
          }
        }}
      />

      <Modal
        open={showAddStaff}
        onClose={() => setShowAddStaff(false)}
        title="Add staff"
        size="md"
      >
        {showAddStaff ? (
          <AddStaffForm
            requiredOnly
            variant="modal"
            onCancel={() => setShowAddStaff(false)}
            onSuccess={(added) => {
              setShowAddStaff(false);
              setNotice("Staff member added.");
              setStaffRows((curr) => [
                ...curr,
                {
                  id: added.id,
                  firstName: added.firstName,
                  lastName: added.lastName,
                  role: added.role || null,
                },
              ]);
            }}
          />
        ) : null}
      </Modal>
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

function CellButton({
  tpl,
  blocked,
  holidayName,
  pending,
  readOnly,
  lastWeekTitle,
  onClick,
}: {
  tpl: Template | undefined;
  blocked: BlockReason | null;
  holidayName: string | null;
  pending: boolean;
  readOnly: boolean;
  lastWeekTitle: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  if (blocked) {
    const label =
      blocked === "holiday"
        ? "Closed"
        : blocked === "vacation"
          ? "Vacation"
          : "Day off";
    const ariaLabel =
      blocked === "holiday"
        ? "Closed (holiday)"
        : blocked === "vacation"
          ? "On vacation"
          : "Approved day off";
    return (
      <div
        className="flex h-14 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-[repeating-linear-gradient(45deg,_#f4f4f5_0,_#f4f4f5_6px,_#fafafa_6px,_#fafafa_12px)] px-1 text-center text-xs font-medium text-zinc-500"
        aria-label={ariaLabel}
        title={lastWeekTitle}
      >
        {holidayName ? (
          <span className="truncate text-[10px] font-medium leading-tight text-violet-700">
            {holidayName}
          </span>
        ) : null}
        {label}
      </div>
    );
  }

  if (!tpl) {
    if (readOnly) {
      return (
        <div
          className="flex h-14 w-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-1 text-center text-sm text-zinc-400"
          aria-label="Off"
          title={lastWeekTitle}
        >
          {holidayName ? (
            <span className="truncate text-[10px] font-medium leading-tight text-violet-700">
              {holidayName}
            </span>
          ) : null}
          Off
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-14 w-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white px-1 text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-50 hover:text-zinc-600"
        aria-label="Assign shift"
        title={lastWeekTitle}
      >
        {holidayName ? (
          <span className="truncate text-[10px] font-medium leading-tight text-violet-700">
            {holidayName}
          </span>
        ) : null}
        {pending ? <span className="text-xs text-zinc-500">…</span> : "+"}
      </button>
    );
  }

  const bg = tpl.color || FALLBACK_COLOR;
  const inner = (
    <>
      {holidayName ? (
        <span className="truncate text-[10px] font-medium leading-tight text-white/85">
          {holidayName}
        </span>
      ) : null}
      <span className="truncate text-xs font-semibold leading-tight">{tpl.name}</span>
      <span className="truncate text-[11px] leading-tight opacity-90">
        {tpl.startTime}–{tpl.endTime}
        {(tpl.unpaidBreakMinutes ?? 0) > 0
          ? ` · ${formatBreakMinutes(tpl.unpaidBreakMinutes)} break`
          : ""}
      </span>
      {pending ? (
        <span className="absolute right-1 top-1 text-[10px] opacity-80">…</span>
      ) : null}
    </>
  );

  if (readOnly) {
    return (
      <div
        className="relative flex h-14 w-full flex-col items-start justify-center rounded-lg px-2 text-left text-white shadow-sm"
        style={{ background: bg }}
        aria-label={`${tpl.name} ${tpl.startTime}–${tpl.endTime}`}
        title={lastWeekTitle}
      >
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-14 w-full flex-col items-start justify-center rounded-lg px-2 text-left text-white shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-1"
      style={{ background: bg }}
      aria-label={`${tpl.name} ${tpl.startTime}–${tpl.endTime}`}
      title={lastWeekTitle}
    >
      {inner}
    </button>
  );
}

function ShiftPopover({
  anchor,
  title,
  clearLabel,
  templates,
  currentTemplateId,
  onPick,
  onManagePresets,
  onClose,
}: {
  anchor: Anchor;
  title: string;
  clearLabel: string;
  templates: Template[];
  currentTemplateId: string | null;
  onPick: (templateId: string | null) => void;
  onManagePresets: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // clamp horizontally within viewport
  const maxLeft = typeof window !== "undefined" ? window.scrollX + window.innerWidth - 280 : 0;
  const left = Math.min(anchor.left, maxLeft);

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-30 cursor-default bg-transparent"
      />
      <div
        style={{ top: anchor.top, left, width: 260 }}
        className="absolute z-40 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg"
        role="dialog"
        aria-label="Choose shift"
      >
        <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {templates.length === 0 ? (
            <div className="px-2 py-2 text-xs text-zinc-600">
              No shift presets yet.{" "}
              <button
                type="button"
                onClick={onManagePresets}
                className="font-semibold underline"
              >
                Create one
              </button>
              .
            </div>
          ) : (
            <ul className="space-y-1">
              {templates.map((t) => {
                const bg = t.color || FALLBACK_COLOR;
                const active = currentTemplateId === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onPick(t.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-50 ${
                        active ? "ring-1 ring-zinc-900" : ""
                      }`}
                    >
                      <span
                        className="inline-block size-4 rounded-sm"
                        style={{ background: bg }}
                      />
                      <span className="flex-1 truncate font-medium text-zinc-900">
                        {t.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {t.startTime}–{t.endTime}
                        {(t.unpaidBreakMinutes ?? 0) > 0
                          ? ` · ${formatBreakMinutes(t.unpaidBreakMinutes)}`
                          : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-zinc-100 pt-1">
          <button
            type="button"
            onClick={() => onPick(null)}
            className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            {clearLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
