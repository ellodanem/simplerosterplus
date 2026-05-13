"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { dayHeaderLabel } from "@/lib/roster-week";

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  vacationStart: string | null;
  vacationEnd: string | null;
};

type Template = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string | null;
};

type Holiday = { name: string; stationClosed: boolean };

type Anchor = { staffId: string; ymd: string; top: number; left: number; width: number };

const FALLBACK_COLOR = "#475569";

export function RosterGrid({
  weekId,
  weekStartYmd,
  days,
  timeZone,
  prevWeek,
  nextWeek,
  thisWeek,
  staff,
  templates,
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
  staff: Staff[];
  templates: Template[];
  initialEntries: Record<string, string>;
  holidays: Record<string, Holiday>;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Record<string, string>>(initialEntries);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const templateById = useMemo(() => {
    const m = new Map<string, Template>();
    for (const t of templates) m.set(t.id, t);
    return m;
  }, [templates]);

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

  function openPopover(e: React.MouseEvent<HTMLButtonElement>, s: Staff, ymd: string) {
    if (blockedReason(s, ymd)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({
      staffId: s.id,
      ymd,
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
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
      const res = await fetch(`/api/roster/weeks/${encodeURIComponent(weekId)}/entries`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, date: ymd, shiftTemplateId: templateId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not save");
      }
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

  function goToWeek(ymd: string) {
    router.push(`/roster?week=${ymd}`);
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
      </div>

      {templates.length === 0 ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You haven&apos;t created any shift presets yet.{" "}
          <Link href="/roster/templates" className="font-semibold underline">
            Create one to start scheduling.
          </Link>
        </div>
      ) : null}

      {error ? (
        <div
          className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="status"
        >
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="sticky left-0 z-10 w-48 min-w-[12rem] border-r border-zinc-200 bg-zinc-50 px-4 py-3 text-left">
                Staff
              </th>
              {days.map((d) => {
                const h = dayHeaderLabel(d, timeZone);
                const isToday = d === thisWeek;
                const closed = holidays[d]?.stationClosed;
                return (
                  <th
                    key={d}
                    className={`min-w-[8rem] px-3 py-2 text-left ${closed ? "bg-zinc-100" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-500">{h.weekday}</span>
                      <span className="text-sm font-medium normal-case text-zinc-800">
                        {h.date}
                      </span>
                      {isToday ? (
                        <span className="rounded bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-800">
                          Today
                        </span>
                      ) : null}
                    </div>
                    {holidays[d] ? (
                      <div className="mt-0.5 text-[11px] font-normal normal-case text-zinc-500">
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
                  <td className="sticky left-0 z-10 border-r border-zinc-200 bg-white px-4 py-2">
                    <div className="font-medium text-zinc-900">
                      {s.firstName} {s.lastName}
                    </div>
                    {s.role ? (
                      <div className="text-xs text-zinc-500">{s.role}</div>
                    ) : null}
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
                          onClick={(e) => openPopover(e, s, d)}
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
          templates={templates}
          currentTemplateId={entries[cellKey(anchor.staffId, anchor.ymd)] ?? null}
          onPick={async (templateId) => {
            const a = anchor;
            setAnchor(null);
            await setCell(a.staffId, a.ymd, templateId);
          }}
          onClose={() => setAnchor(null)}
        />
      ) : null}
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
  templates,
  currentTemplateId,
  onPick,
  onClose,
}: {
  anchor: Anchor;
  templates: Template[];
  currentTemplateId: string | null;
  onPick: (templateId: string | null) => void;
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
          Assign shift
        </div>
        <div className="max-h-64 overflow-y-auto">
          {templates.length === 0 ? (
            <div className="px-2 py-2 text-xs text-zinc-600">
              No shift presets yet.{" "}
              <Link href="/roster/templates" className="font-semibold underline">
                Create one
              </Link>
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
            Clear (Off)
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
