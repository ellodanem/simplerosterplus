"use client";

import { useState } from "react";
import { Modal } from "@/app/components/modal";
import {
  DEFAULT_SUPERVISOR_ROLE_NAMES,
  formatRoleNamesCsv,
  formatWeekdayList,
  weekdayLabel,
  type SchedulingRulesSettings,
} from "@/lib/roster-scheduling-rules";

export function SchedulingRulesSettingsModal({
  initialSettings,
  onClose,
  onSaved,
}: {
  initialSettings: SchedulingRulesSettings;
  onClose: () => void;
  onSaved: (settings: SchedulingRulesSettings, message: string) => void;
}) {
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [supervisorEnabled, setSupervisorEnabled] = useState(
    initialSettings.supervisorNoWeekendOff.enabled,
  );
  const [supervisorRoles, setSupervisorRoles] = useState(
    formatRoleNamesCsv(
      initialSettings.supervisorNoWeekendOff.roleNames.length > 0
        ? initialSettings.supervisorNoWeekendOff.roleNames
        : [...DEFAULT_SUPERVISOR_ROLE_NAMES],
    ),
  );
  const [sundayPatternEnabled, setSundayPatternEnabled] = useState(
    initialSettings.sundayOrWeekdayOff.enabled,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anchorLabel = weekdayLabel(initialSettings.sundayOrWeekdayOff.anchorWeekday);

  async function save() {
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/roster/scheduling-rules/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          supervisorNoWeekendOff: {
            enabled: supervisorEnabled,
            roleNames: supervisorRoles,
            weekdays: formatWeekdayList(initialSettings.supervisorNoWeekendOff.weekdays),
          },
          sundayOrWeekdayOff: {
            enabled: sundayPatternEnabled,
            anchorWeekday: initialSettings.sundayOrWeekdayOff.anchorWeekday,
          },
        }),
      });
      const body = (await res.json().catch(() => ({}))) as SchedulingRulesSettings & {
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Could not save scheduling rules.");
        setPending(false);
        return;
      }

      onSaved(
        body,
        enabled
          ? "Scheduling rules enabled. Violations are highlighted on the roster and respected by Auto Scheduler."
          : "Scheduling rules disabled.",
      );
    } catch {
      setError("Network error while saving.");
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Scheduling rules" size="md">
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          Optional roster patterns for your site. Rules highlight issues on the grid and filter
          Auto Scheduler suggestions. Manual edits are still allowed.
        </p>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Enable scheduling rules</h3>
              <p className="mt-1 text-xs text-zinc-500">Master switch for the rules below.</p>
            </div>
            <Toggle checked={enabled} onChange={setEnabled} label="Enable scheduling rules" />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-200 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Supervisor weekend coverage</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Supervisors should work Friday and Saturday unless an approved day off exists.
              </p>
            </div>
            <Toggle
              checked={supervisorEnabled}
              onChange={setSupervisorEnabled}
              disabled={!enabled}
              label="Supervisor weekend coverage"
            />
          </div>
          <div>
            <label
              htmlFor="supervisor-roles"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
            >
              Role names (comma-separated)
            </label>
            <input
              id="supervisor-roles"
              type="text"
              value={supervisorRoles}
              onChange={(e) => setSupervisorRoles(e.target.value)}
              disabled={!enabled || !supervisorEnabled}
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-zinc-100 disabled:text-zinc-400"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-zinc-200 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{anchorLabel} or weekday off</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Each person either has {anchorLabel} off or works {anchorLabel} with one weekday off
                in the same week.
              </p>
            </div>
            <Toggle
              checked={sundayPatternEnabled}
              onChange={setSundayPatternEnabled}
              disabled={!enabled}
              label={`${anchorLabel} or weekday off`}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      aria-label={label}
      disabled={disabled}
      className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition disabled:opacity-50 ${
        checked ? "border-emerald-700 bg-emerald-600" : "border-zinc-300 bg-zinc-200"
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow-sm transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
