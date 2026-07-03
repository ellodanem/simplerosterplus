"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/app/components/modal";
import {
  RULE_TEMPLATES,
  weekdayLabel,
  WEEKDAY_NAMES,
  type SchedulingRuleRecord,
} from "@/lib/scheduling-rule-registry";
import { type SchedulingRulesSettings } from "@/lib/roster-scheduling-rules";

type View = "list" | "add" | "edit";

export function SchedulingRulesSettingsModal({
  initialSettings,
  initialRules,
  onClose,
  onSaved,
}: {
  initialSettings: SchedulingRulesSettings;
  initialRules?: SchedulingRuleRecord[];
  onClose: () => void;
  onSaved: (settings: SchedulingRulesSettings, rules: SchedulingRuleRecord[], message: string) => void;
}) {
  const [rules, setRules] = useState<SchedulingRuleRecord[]>(initialRules ?? []);
  const [view, setView] = useState<View>("list");
  const [editingRule, setEditingRule] = useState<SchedulingRuleRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRules && initialRules.length > 0) return;
    let cancelled = false;
    fetch("/api/roster/scheduling-rules")
      .then((r) => r.json())
      .then((data: { rules: SchedulingRuleRecord[] }) => {
        if (!cancelled) setRules(data.rules ?? []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [initialRules]);

  const notifySaved = useCallback(
    (nextRules: SchedulingRuleRecord[], message: string) => {
      const hasEnabled = nextRules.some((r) => r.enabled);
      const supervisorRule = nextRules.find((r) => r.type === "role_must_work_on_weekdays");
      const anchorRule = nextRules.find((r) => r.type === "anchor_xor_weekday_off");
      const rotateRule = nextRules.find((r) => r.type === "rotate_anchor_week");
      const sp = supervisorRule?.params ?? {};
      const ap = anchorRule?.params ?? {};
      const rp = rotateRule?.params ?? {};
      const settings: SchedulingRulesSettings = {
        enabled: hasEnabled,
        supervisorNoWeekendOff: {
          enabled: supervisorRule?.enabled ?? false,
          roleNames: Array.isArray(sp.roleNames) ? (sp.roleNames as string[]) : ["Supervisor"],
          weekdays: Array.isArray(sp.weekdays) ? (sp.weekdays as number[]) : [5, 6],
        },
        sundayOrWeekdayOff: {
          enabled: anchorRule?.enabled ?? false,
          anchorWeekday: typeof ap.anchorWeekday === "number" ? ap.anchorWeekday : typeof rp.anchorWeekday === "number" ? rp.anchorWeekday : 0,
          rotateAnchorWeek: rotateRule?.enabled ?? false,
        },
      };
      onSaved(settings, nextRules, message);
    },
    [onSaved],
  );

  async function toggleRule(rule: SchedulingRuleRecord) {
    const next = !rule.enabled;
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: next } : r)));
    try {
      const res = await fetch(`/api/roster/scheduling-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as SchedulingRuleRecord;
      setRules((prev) => {
        const nextRules = prev.map((r) => (r.id === updated.id ? updated : r));
        notifySaved(nextRules, next ? "Rule enabled." : "Rule disabled.");
        return nextRules;
      });
    } catch {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: rule.enabled } : r)));
    }
  }

  async function deleteRule(rule: SchedulingRuleRecord) {
    setRules((prev) => prev.filter((r) => r.id !== rule.id));
    try {
      await fetch(`/api/roster/scheduling-rules/${rule.id}`, { method: "DELETE" });
      setRules((prev) => {
        notifySaved(prev, `Removed "${rule.name || templateLabel(rule.type)}".`);
        return prev;
      });
    } catch {
      setRules((prev) => [...prev, rule].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }

  async function addRule(type: string, name: string, params: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/roster/scheduling-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name, params, enabled: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setError(err.error ?? "Could not add rule.");
        setPending(false);
        return;
      }
      const created = (await res.json()) as SchedulingRuleRecord;
      setRules((prev) => {
        const nextRules = [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder);
        notifySaved(nextRules, `Added "${created.name || templateLabel(created.type)}".`);
        return nextRules;
      });
      setView("list");
    } catch {
      setError("Network error.");
    }
    setPending(false);
  }

  async function updateRule(id: string, name: string, params: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/roster/scheduling-rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, params }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setError(err.error ?? "Could not update rule.");
        setPending(false);
        return;
      }
      const updated = (await res.json()) as SchedulingRuleRecord;
      setRules((prev) => {
        const nextRules = prev.map((r) => (r.id === updated.id ? updated : r));
        notifySaved(nextRules, `Updated "${updated.name || templateLabel(updated.type)}".`);
        return nextRules;
      });
      setView("list");
      setEditingRule(null);
    } catch {
      setError("Network error.");
    }
    setPending(false);
  }

  const title =
    view === "add"
      ? "Add scheduling rule"
      : view === "edit"
        ? "Edit rule"
        : "Scheduling rules";

  return (
    <Modal open onClose={onClose} title={title} size="md">
      {view === "list" ? (
        <RuleListView
          rules={rules}
          onToggle={toggleRule}
          onEdit={(r) => {
            setEditingRule(r);
            setError(null);
            setView("edit");
          }}
          onDelete={deleteRule}
          onAdd={() => {
            setError(null);
            setView("add");
          }}
          onClose={onClose}
        />
      ) : view === "add" ? (
        <AddRuleView
          existingTypes={rules.map((r) => r.type)}
          onSubmit={addRule}
          onBack={() => setView("list")}
          pending={pending}
          error={error}
        />
      ) : view === "edit" && editingRule ? (
        <EditRuleView
          rule={editingRule}
          onSubmit={(name, params) => updateRule(editingRule.id, name, params)}
          onBack={() => {
            setEditingRule(null);
            setView("list");
          }}
          pending={pending}
          error={error}
        />
      ) : null}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// List view — rule cards
// ---------------------------------------------------------------------------

function templateLabel(type: string): string {
  return RULE_TEMPLATES[type]?.label ?? type;
}

function ruleSummary(rule: SchedulingRuleRecord): string {
  const p = rule.params;
  if (rule.type === "role_must_work_on_weekdays") {
    const roles = Array.isArray(p.roleNames) ? (p.roleNames as string[]).join(", ") : "Supervisor";
    const days = Array.isArray(p.weekdays)
      ? (p.weekdays as number[]).map((d) => weekdayLabel(d)).join(", ")
      : "Fri, Sat";
    return `${roles} must work ${days}`;
  }
  if (rule.type === "anchor_xor_weekday_off") {
    const day = weekdayLabel(typeof p.anchorWeekday === "number" ? p.anchorWeekday : 0);
    return `${day} off or work ${day} with a weekday off`;
  }
  if (rule.type === "rotate_anchor_week") {
    const day = weekdayLabel(typeof p.anchorWeekday === "number" ? p.anchorWeekday : 0);
    return `Rotate ${day} — worked last week means off this week`;
  }
  return RULE_TEMPLATES[rule.type]?.description ?? "";
}

function RuleListView({
  rules,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  onClose,
}: {
  rules: SchedulingRuleRecord[];
  onToggle: (r: SchedulingRuleRecord) => void;
  onEdit: (r: SchedulingRuleRecord) => void;
  onDelete: (r: SchedulingRuleRecord) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Add rules that fit your organization. Rules highlight issues on the roster and filter Auto
        Scheduler suggestions. Manual edits are still allowed.
      </p>

      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center">
          <p className="text-sm text-zinc-500">No scheduling rules yet.</p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            Add your first rule
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-xl border p-3 transition ${
                rule.enabled
                  ? "border-zinc-200 bg-white"
                  : "border-zinc-100 bg-zinc-50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-zinc-900">
                    {rule.name || templateLabel(rule.type)}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500">{ruleSummary(rule)}</p>
                </div>
                <Toggle
                  checked={rule.enabled}
                  onChange={() => onToggle(rule)}
                  label={`Toggle ${rule.name || templateLabel(rule.type)}`}
                />
              </div>
              <div className="mt-2 flex items-center gap-2 border-t border-zinc-100 pt-2">
                <button
                  type="button"
                  onClick={() => onEdit(rule)}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                >
                  Edit
                </button>
                <span className="text-zinc-300">|</span>
                <button
                  type="button"
                  onClick={() => onDelete(rule)}
                  className="text-xs font-medium text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
        >
          <PlusIcon />
          Add rule
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add rule — template picker + params
// ---------------------------------------------------------------------------

function AddRuleView({
  existingTypes,
  onSubmit,
  onBack,
  pending,
  error,
}: {
  existingTypes: string[];
  onSubmit: (type: string, name: string, params: Record<string, unknown>) => void;
  onBack: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  if (!selectedType) {
    const templates = Object.values(RULE_TEMPLATES);
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">Choose a rule type to add.</p>
        <div className="space-y-2">
          {templates.map((tpl) => {
            const alreadyHas = existingTypes.includes(tpl.type);
            return (
              <button
                key={tpl.type}
                type="button"
                onClick={() => setSelectedType(tpl.type)}
                className="w-full rounded-xl border border-zinc-200 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">{tpl.label}</h3>
                  {alreadyHas ? (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                      already added
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-zinc-500">{tpl.description}</p>
              </button>
            );
          })}
        </div>
        <div className="border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const template = RULE_TEMPLATES[selectedType]!;
  return (
    <RuleParamsForm
      type={selectedType}
      initialName={template.label}
      initialParams={{ ...template.defaultParams }}
      submitLabel="Add rule"
      onSubmit={(name, params) => onSubmit(selectedType, name, params)}
      onBack={() => setSelectedType(null)}
      pending={pending}
      error={error}
    />
  );
}

// ---------------------------------------------------------------------------
// Edit rule — same params form pre-filled
// ---------------------------------------------------------------------------

function EditRuleView({
  rule,
  onSubmit,
  onBack,
  pending,
  error,
}: {
  rule: SchedulingRuleRecord;
  onSubmit: (name: string, params: Record<string, unknown>) => void;
  onBack: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <RuleParamsForm
      type={rule.type}
      initialName={rule.name}
      initialParams={{ ...(RULE_TEMPLATES[rule.type]?.defaultParams ?? {}), ...rule.params }}
      submitLabel="Save changes"
      onSubmit={onSubmit}
      onBack={onBack}
      pending={pending}
      error={error}
    />
  );
}

// ---------------------------------------------------------------------------
// Params form — renders fields per rule type
// ---------------------------------------------------------------------------

function RuleParamsForm({
  type,
  initialName,
  initialParams,
  submitLabel,
  onSubmit,
  onBack,
  pending,
  error,
}: {
  type: string;
  initialName: string;
  initialParams: Record<string, unknown>;
  submitLabel: string;
  onSubmit: (name: string, params: Record<string, unknown>) => void;
  onBack: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [params, setParams] = useState(initialParams);

  const template = RULE_TEMPLATES[type];
  if (!template) return null;

  function update(key: string, value: unknown) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    onSubmit(name.trim() || template!.label, params);
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="rule-name"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
        >
          Rule name
        </label>
        <input
          id="rule-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={template.label}
          className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>

      {type === "role_must_work_on_weekdays" ? (
        <RoleMustWorkFields params={params} onChange={update} />
      ) : type === "anchor_xor_weekday_off" ? (
        <AnchorXorFields params={params} onChange={update} />
      ) : type === "rotate_anchor_week" ? (
        <RotateAnchorFields params={params} onChange={update} />
      ) : (
        <p className="text-xs text-zinc-500">No additional settings for this rule type.</p>
      )}

      {/* preview sentence */}
      <div className="rounded-lg bg-zinc-50 px-3 py-2">
        <p className="text-xs font-medium text-zinc-500">Preview</p>
        <p className="mt-1 text-sm text-zinc-800">
          {previewSentence(type, params)}
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-type param fields
// ---------------------------------------------------------------------------

function RoleMustWorkFields({
  params,
  onChange,
}: {
  params: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const roleNames = Array.isArray(params.roleNames) ? (params.roleNames as string[]).join(", ") : "Supervisor";
  const weekdays = Array.isArray(params.weekdays) ? (params.weekdays as number[]) : [5, 6];
  const exceptApproved = params.exceptApprovedDayOff !== false;

  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Role names (comma-separated)
        </label>
        <input
          type="text"
          value={roleNames}
          onChange={(e) =>
            onChange(
              "roleNames",
              e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            )
          }
          className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Must work on
        </label>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_NAMES.map((dayName, i) => {
            const active = weekdays.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const next = active ? weekdays.filter((d) => d !== i) : [...weekdays, i].sort();
                  onChange("weekdays", next);
                }}
                className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                  active
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
                }`}
              >
                {dayName.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={exceptApproved}
          onChange={(e) => onChange("exceptApprovedDayOff", e.target.checked)}
          className="rounded border-zinc-300"
        />
        Except when they have an approved day off
      </label>
    </>
  );
}

function AnchorXorFields({
  params,
  onChange,
}: {
  params: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const anchor = typeof params.anchorWeekday === "number" ? params.anchorWeekday : 0;

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
        Anchor day
      </label>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_NAMES.map((dayName, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange("anchorWeekday", i)}
            className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
              i === anchor
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
            }`}
          >
            {dayName.slice(0, 3)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Each person either has {weekdayLabel(anchor)} off, or works {weekdayLabel(anchor)} with at
        least one weekday off.
      </p>
    </div>
  );
}

function RotateAnchorFields({
  params,
  onChange,
}: {
  params: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const anchor = typeof params.anchorWeekday === "number" ? params.anchorWeekday : 0;

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
        Anchor day to rotate
      </label>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_NAMES.map((dayName, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange("anchorWeekday", i)}
            className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
              i === anchor
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
            }`}
          >
            {dayName.slice(0, 3)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Staff who worked {weekdayLabel(anchor)} last week should be off {weekdayLabel(anchor)} this
        week.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview sentence
// ---------------------------------------------------------------------------

function previewSentence(type: string, params: Record<string, unknown>): string {
  if (type === "role_must_work_on_weekdays") {
    const roles = Array.isArray(params.roleNames) ? (params.roleNames as string[]).join(", ") : "Supervisors";
    const days = Array.isArray(params.weekdays)
      ? (params.weekdays as number[]).map((d) => weekdayLabel(d)).join(" and ")
      : "Friday and Saturday";
    const except = params.exceptApprovedDayOff !== false ? " unless they have an approved day off" : "";
    return `${roles} must be scheduled on ${days}${except}.`;
  }
  if (type === "anchor_xor_weekday_off") {
    const day = weekdayLabel(typeof params.anchorWeekday === "number" ? params.anchorWeekday : 0);
    return `Each person either has ${day} off, or works ${day} with at least one weekday off.`;
  }
  if (type === "rotate_anchor_week") {
    const day = weekdayLabel(typeof params.anchorWeekday === "number" ? params.anchorWeekday : 0);
    return `Staff who worked ${day} last week should be off ${day} this week.`;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

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

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
