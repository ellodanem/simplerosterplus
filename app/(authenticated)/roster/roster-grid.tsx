"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/app/components/modal";
import { dayHeaderLabel } from "@/lib/roster-week";
import { TemplatesManager, type Template } from "./templates-manager";

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  vacationStart: string | null;
  vacationEnd: string | null;
};

type Holiday = { name: string; stationClosed: boolean };

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

export function RosterGrid({
  weekId,
  weekStartYmd,
  days,
  timeZone,
  prevWeek,
  nextWeek,
  thisWeek,
  todayYmd,
  staff,
  templates: initialTemplates,
  initialEntries,
  holidays,
}: {
  weekId: string;
  weekStartYmd: string;
  days: string[];
  timeZone: string;
  prevWeek: string;
  nextWeek: string;
  thisWeek: string;
  todayYmd: string;
  staff: Staff[];
  templates: Template[];
  initialEntries: Record<string, string>;
  holidays: Record<string, Holiday>;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Record<string, string>>(initialEntries);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [showPresets, setShowPresets] = useState(false);
  const [copying, setCopying] = useState(false);

  const templateById = useMemo(() => {
    const m = new Map<string, Template>();
    for (const t of templates) m.set(t.id, t);
    return m;
  }, [templates]);

  const staffById = useMemo(() => {
    const m = new Map<string, Staff>();
    for (const s of staff) m.set(s.id, s);
    return m;
  }, [staff]);

  function cellKey(staffId: string, ymd: string): string {
    return `${staffId}__${ymd}`;
  }

  function isVacationDay(s: Staff, ymd: string): boolean {
    if (!s.vacationStart || !s.vacationEnd) return false;
    return ymd >= s.vacationStart && ymd <= s.vacationEnd;
  }

  function blockedReason(s: Staff, ymd: string): "holiday" | "vacation" | null {
    const h = holidays[ymd];
    if (h && h.stationClosed) return "holiday";
    if (isVacationDay(s, ymd)) return "vacation";
    return null;
  }

  function openCellPopover(
    e: React.MouseEvent<HTMLButtonElement>,
    s: Staff,
    ymd: string,
  ) {
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

  async function setCell(staffId: string, ymd: string, templateId: string | null) {
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
    const s = staffById.get(staffId);
    if (!s) return;

    const targets: string[] = [];
    const previousByKey: Record<string, string | undefined> = {};
    for (const ymd of days) {
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

    const results = await Promise.allSettled(
      targets.map((ymd) => putEntry(staffId, ymd, templateId)),
    );

    const failures: { ymd: string; message: string }[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "rejected") {
        failures.push({ ymd: targets[i], message: (r.reason as Error).message });
      }
    }

    if (failures.length > 0) {
      setEntries((curr) => {
        const next = { ...curr };
        for (const f of failures) {
          const k = cellKey(staffId, f.ymd);
          const prev = previousByKey[k];
          if (prev) next[k] = prev;
          else delete next[k];
        }
        return next;
      });
      const word = failures.length === 1 ? "day" : "days";
      setError(`${failures.length} ${word} couldn't be updated: ${failures[0].message}`);
    }

    setPending((curr) => {
      const next = { ...curr };
      for (const ymd of targets) delete next[cellKey(staffId, ymd)];
      return next;
    });
  }

  function goToWeek(ymd: string) {
    router.push(`/roster?week=${ymd}`);
  }

  async function copyPreviousWeek() {
    if (Object.keys(entries).length > 0) {
      const ok = window.confirm(
        "Replace this week's roster with the previous week's shifts? Existing entries will be overwritten.",
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
          `Copied ${copied} ${word} from the previous week${skipped > 0 ? ` (${skipped} skipped due to holidays or vacation)` : ""}.`,
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCopying(false);
    }
  }

  return (
    <div>
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
          <button
            type="button"
            onClick={copyPreviousWeek}
            disabled={copying}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copying ? "Copying…" : "Copy previous week"}
          </button>
          <button
            type="button"
            onClick={() => setShowPresets(true)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Shift presets
          </button>
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
                const closed = holidays[d]?.stationClosed;
                return (
                  <th
                    key={d}
                    aria-current={isToday ? "date" : undefined}
                    className={`min-w-[7rem] px-2 py-2 text-left ${
                      isToday
                        ? "bg-emerald-50"
                        : closed
                          ? "bg-zinc-100"
                          : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span
                        className={`text-xs font-semibold ${isToday ? "text-emerald-700" : "text-zinc-500"}`}
                      >
                        {h.weekday}
                      </span>
                      <span
                        className={`text-sm font-medium normal-case ${isToday ? "text-emerald-900" : "text-zinc-800"}`}
                      >
                        {h.date}
                      </span>
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
            {staff.length === 0 ? (
              <tr>
                <td
                  colSpan={1 + days.length}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No staff yet.{" "}
                  <Link href="/staff" className="font-semibold text-emerald-700 underline">
                    Add staff
                  </Link>{" "}
                  to start building the roster.
                </td>
              </tr>
            ) : (
              staff.map((s) => (
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
                      </div>
                      <button
                        type="button"
                        onClick={(e) => openRowPopover(e, s)}
                        title="Apply shift to all days this week"
                        aria-label={`Apply shift to all days for ${s.firstName} ${s.lastName}`}
                        className="shrink-0 rounded-md border border-zinc-300 bg-white p-1 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
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
                    return (
                      <td key={d} className="p-1 align-top">
                        <CellButton
                          tpl={tpl}
                          blocked={blocked}
                          pending={isPending}
                          onClick={(e) => openCellPopover(e, s, d)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {anchor ? (
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

      <Modal
        open={showPresets}
        onClose={() => setShowPresets(false)}
        title="Shift presets"
        size="xl"
      >
        <TemplatesManager initial={templates} onChange={setTemplates} />
      </Modal>
    </div>
  );
}

function CellButton({
  tpl,
  blocked,
  pending,
  onClick,
}: {
  tpl: Template | undefined;
  blocked: "holiday" | "vacation" | null;
  pending: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  if (blocked) {
    return (
      <div
        className="flex h-14 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-[repeating-linear-gradient(45deg,_#f4f4f5_0,_#f4f4f5_6px,_#fafafa_6px,_#fafafa_12px)] text-xs font-medium text-zinc-500"
        aria-label={blocked === "holiday" ? "Closed (holiday)" : "On vacation"}
      >
        {blocked === "holiday" ? "Closed" : "Vacation"}
      </div>
    );
  }

  if (!tpl) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-14 w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white text-xl text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-50 hover:text-zinc-600"
        aria-label="Assign shift"
      >
        {pending ? <span className="text-xs text-zinc-500">…</span> : "+"}
      </button>
    );
  }

  const bg = tpl.color || FALLBACK_COLOR;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full flex-col items-start justify-center rounded-lg px-2 text-left text-white shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-1"
      style={{ background: bg }}
      aria-label={`${tpl.name} ${tpl.startTime}–${tpl.endTime}`}
    >
      <span className="truncate text-xs font-semibold leading-tight">{tpl.name}</span>
      <span className="truncate text-[11px] leading-tight opacity-90">
        {tpl.startTime}–{tpl.endTime}
      </span>
      {pending ? (
        <span className="absolute right-1 top-1 text-[10px] opacity-80">…</span>
      ) : null}
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
