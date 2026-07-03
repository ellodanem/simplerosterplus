"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/app/components/modal";
import type { AutoSchedulerMode } from "@/lib/auto-scheduler";

export type AutoSchedulerProposalRow = {
  staffId: string;
  staffName: string;
  date: string;
  dayLabel: string;
  shiftTemplateId: string;
  shiftName: string;
  reason: string;
  position: string | null;
  notes: string | null;
};

type PreviewResponse = {
  mode: AutoSchedulerMode;
  proposals: AutoSchedulerProposalRow[];
  skipped: Array<{ staffId: string; staffName: string; date: string; dayLabel: string; reason: string }>;
  warnings: string[];
  error?: string;
};

type ApplyResponse = {
  applied?: number;
  entries?: { staffId: string; date: string; shiftTemplateId: string | null }[];
  error?: string;
};

const MODE_LABELS: Record<AutoSchedulerMode, { title: string; description: string }> = {
  copy_previous: {
    title: "Start from last week",
    description:
      "Replace unlocked days with the previous week's shifts. Locked days, holidays, and approved leave are preserved.",
  },
  fill_open: {
    title: "Fill open slots",
    description:
      "Add shifts only to empty cells from today through week end, using recent patterns for each person.",
  },
};

export function AutoSchedulerModal({
  weekId,
  initialMode,
  weekLocked,
  onClose,
  onApplied,
}: {
  weekId: string;
  initialMode: AutoSchedulerMode;
  weekLocked: boolean;
  onClose: () => void;
  onApplied: (entries: Record<string, string>, message: string) => void;
}) {
  const [mode, setMode] = useState<AutoSchedulerMode>(initialMode);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [proposals, setProposals] = useState<AutoSchedulerProposalRow[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const proposalKey = (p: AutoSchedulerProposalRow) =>
    `${p.staffId}__${p.date}__${p.shiftTemplateId}`;

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/roster/weeks/${encodeURIComponent(weekId)}/auto-scheduler/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as PreviewResponse;
      if (!res.ok) throw new Error(data.error || "Could not load preview");

      setProposals(data.proposals ?? []);
      setWarnings(data.warnings ?? []);
      setSkippedCount(data.skipped?.length ?? 0);
      setSelected(new Set((data.proposals ?? []).map(proposalKey)));
    } catch (e) {
      setError((e as Error).message);
      setProposals([]);
      setWarnings([]);
      setSkippedCount(0);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [weekId, mode]);

  useEffect(() => {
    if (!weekLocked) void loadPreview();
  }, [weekLocked, loadPreview]);

  const selectedProposals = useMemo(
    () => proposals.filter((p) => selected.has(proposalKey(p))),
    [proposals, selected],
  );

  function toggleRow(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(proposals.map(proposalKey)));
    else setSelected(new Set());
  }

  async function handleApply() {
    if (selectedProposals.length === 0) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/roster/weeks/${encodeURIComponent(weekId)}/auto-scheduler/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            proposals: selectedProposals.map((p) => ({
              staffId: p.staffId,
              date: p.date,
              shiftTemplateId: p.shiftTemplateId,
              reason: p.reason,
              position: p.position,
              notes: p.notes,
            })),
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as ApplyResponse;
      if (!res.ok) throw new Error(data.error || "Could not apply");

      const next: Record<string, string> = {};
      for (const e of data.entries ?? []) {
        if (e.shiftTemplateId) {
          next[`${e.staffId}__${e.date}`] = e.shiftTemplateId;
        }
      }

      const applied = data.applied ?? selectedProposals.length;
      const word = applied === 1 ? "shift" : "shifts";
      const message =
        mode === "copy_previous"
          ? `Applied ${applied} ${word} from last week${skippedCount > 0 ? ` (${skippedCount} skipped)` : ""}.`
          : `Filled ${applied} open ${word}${skippedCount > 0 ? ` (${skippedCount} skipped)` : ""}.`;

      onApplied(next, message);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Auto scheduler" size="xl">
      {weekLocked ? (
        <p className="text-sm text-zinc-600">This roster week is locked and cannot be edited.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MODE_LABELS) as AutoSchedulerMode[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  mode === key
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {MODE_LABELS[key].title}
              </button>
            ))}
          </div>

          <p className="text-sm text-zinc-600">{MODE_LABELS[mode].description}</p>

          {warnings.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="text-sm text-zinc-500">Loading preview…</p>
          ) : proposals.length === 0 ? (
            <p className="text-sm text-zinc-500">No shifts to apply for this action.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200">
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3 py-2">
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={selected.size === proposals.length && proposals.length > 0}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="rounded border-zinc-300"
                  />
                  {selectedProposals.length} of {proposals.length} selected
                </label>
                <button
                  type="button"
                  onClick={() => void loadPreview()}
                  className="text-xs font-medium text-emerald-800 hover:underline"
                >
                  Refresh preview
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white text-xs text-zinc-500">
                    <tr>
                      <th className="w-10 px-3 py-2" />
                      <th className="px-3 py-2">Staff</th>
                      <th className="px-3 py-2">Day</th>
                      <th className="px-3 py-2">Shift</th>
                      <th className="px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {proposals.map((p) => {
                      const key = proposalKey(p);
                      return (
                        <tr key={key} className="hover:bg-zinc-50">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selected.has(key)}
                              onChange={() => toggleRow(key)}
                              className="rounded border-zinc-300"
                              aria-label={`Include ${p.staffName} ${p.dayLabel}`}
                            />
                          </td>
                          <td className="px-3 py-2 font-medium text-zinc-900">{p.staffName}</td>
                          <td className="px-3 py-2 text-zinc-700">{p.dayLabel}</td>
                          <td className="px-3 py-2 text-zinc-700">{p.shiftName}</td>
                          <td className="px-3 py-2 text-xs text-zinc-500">{p.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={applying || loading || selectedProposals.length === 0}
              onClick={() => void handleApply()}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {applying ? "Applying…" : `Apply ${selectedProposals.length} shift${selectedProposals.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
