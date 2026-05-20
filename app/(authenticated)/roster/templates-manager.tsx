"use client";

import { useState } from "react";
import {
  DEFAULT_SHIFT_COLOR,
  PRIMARY_SWATCHES,
  SECONDARY_SWATCHES,
} from "@/lib/shift-colors";
import { formatBreakMinutes } from "@/lib/shift-duration";

export type Template = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  unpaidBreakMinutes: number;
  color: string | null;
};

const BREAK_PRESETS = [0, 15, 30, 45, 60] as const;

function sortByName(items: Template[]): Template[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export function TemplatesManager({
  initial,
  onChange,
}: {
  initial: Template[];
  onChange?: (templates: Template[]) => void;
}) {
  const [items, setItems] = useState<Template[]>(initial);

  function applyUpdate(next: Template[]) {
    const sorted = sortByName(next);
    setItems(sorted);
    onChange?.(sorted);
  }

  async function onCreate(values: Omit<Template, "id">) {
    const res = await fetch("/api/roster/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; template?: Template };
    if (!res.ok || !data.template) {
      throw new Error(data.error || "Could not create");
    }
    applyUpdate([...items, data.template]);
  }

  async function onUpdate(id: string, values: Partial<Omit<Template, "id">>) {
    const res = await fetch(`/api/roster/templates/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; template?: Template };
    if (!res.ok || !data.template) {
      throw new Error(data.error || "Could not save");
    }
    applyUpdate(items.map((t) => (t.id === id ? data.template! : t)));
  }

  async function onDelete(id: string) {
    if (
      !confirm("Delete this shift preset? Existing roster entries that used it will be cleared.")
    ) {
      return;
    }
    const res = await fetch(`/api/roster/templates/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      alert(data.error || "Could not delete");
      return;
    }
    applyUpdate(items.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-4">
      <NewTemplateForm onCreate={onCreate} />

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="w-12 px-3 py-2">Color</th>
              <th className="px-3 py-2">Name</th>
              <th className="w-20 px-3 py-2">Start</th>
              <th className="w-20 px-3 py-2">End</th>
              <th className="w-24 px-3 py-2">Break</th>
              <th className="w-28 px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                  No shift presets yet. Create one above.
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <TemplateRow
                  key={t.id}
                  template={t}
                  onUpdate={(values) => onUpdate(t.id, values)}
                  onDelete={() => onDelete(t.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewTemplateForm({
  onCreate,
}: {
  onCreate: (values: Omit<Template, "id">) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [unpaidBreakMinutes, setUnpaidBreakMinutes] = useState(0);
  const [color, setColor] = useState<string>(DEFAULT_SHIFT_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await onCreate({ name, startTime, endTime, unpaidBreakMinutes, color });
      setName("");
      setStartTime("09:00");
      setEndTime("17:00");
      setUnpaidBreakMinutes(0);
      setColor(DEFAULT_SHIFT_COLOR);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4"
    >
      <h3 className="text-sm font-semibold text-zinc-800">New shift preset</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="tn">
            Name <span className="text-red-600">*</span>
          </label>
          <input
            id="tn"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="ts">
            Start <span className="text-red-600">*</span>
          </label>
          <input
            id="ts"
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="te">
            End <span className="text-red-600">*</span>
          </label>
          <input
            id="te"
            type="time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div className="mt-3">
        <UnpaidBreakField value={unpaidBreakMinutes} onChange={setUnpaidBreakMinutes} />
      </div>
      <div className="mt-3">
        <SwatchPicker value={color} onChange={setColor} />
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add preset"}
      </button>
    </form>
  );
}

function UnpaidBreakField({
  value,
  onChange,
  idPrefix = "break",
}: {
  value: number;
  onChange: (minutes: number) => void;
  idPrefix?: string;
}) {
  const presetSet = new Set<number>(BREAK_PRESETS);
  const [custom, setCustom] = useState(!presetSet.has(value));
  const presetValue = custom ? "custom" : String(value);

  return (
    <div>
      <label className="text-xs font-medium text-zinc-600" htmlFor={`${idPrefix}-select`}>
        Unpaid break
      </label>
      <p className="mt-0.5 text-[11px] text-zinc-500">
        Deducted from scheduled hours (not paid).
      </p>
      <select
        id={`${idPrefix}-select`}
        value={presetValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "custom") {
            setCustom(true);
            return;
          }
          setCustom(false);
          onChange(Number(v));
        }}
        className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 px-2 py-1.5 text-sm sm:w-auto"
      >
        <option value="0">None</option>
        <option value="15">15 minutes</option>
        <option value="30">30 minutes</option>
        <option value="45">45 minutes</option>
        <option value="60">1 hour</option>
        <option value="custom">Custom…</option>
      </select>
      {custom ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            id={`${idPrefix}-custom`}
            type="number"
            min={0}
            max={480}
            step={5}
            value={value}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
            className="w-24 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <span className="text-xs text-zinc-600">minutes</span>
        </div>
      ) : null}
    </div>
  );
}

function TemplateRow({
  template,
  onUpdate,
  onDelete,
}: {
  template: Template;
  onUpdate: (values: Partial<Omit<Template, "id">>) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const [startTime, setStartTime] = useState(template.startTime);
  const [endTime, setEndTime] = useState(template.endTime);
  const [unpaidBreakMinutes, setUnpaidBreakMinutes] = useState(
    template.unpaidBreakMinutes ?? 0,
  );
  const [color, setColor] = useState<string>(template.color ?? DEFAULT_SHIFT_COLOR);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      await onUpdate({ name, startTime, endTime, unpaidBreakMinutes, color });
      setEditing(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <tr className="bg-zinc-50">
        <td className="px-3 py-3" colSpan={6}>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              placeholder="Name"
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(template.name);
                  setStartTime(template.startTime);
                  setEndTime(template.endTime);
                  setUnpaidBreakMinutes(template.unpaidBreakMinutes ?? 0);
                  setColor(template.color ?? DEFAULT_SHIFT_COLOR);
                }}
                className="text-xs text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="mt-3 max-w-sm">
            <UnpaidBreakField
              idPrefix={`edit-${template.id}`}
              value={unpaidBreakMinutes}
              onChange={setUnpaidBreakMinutes}
            />
          </div>
          <div className="mt-3">
            <SwatchPicker value={color} onChange={setColor} />
          </div>
        </td>
      </tr>
    );
  }

  const breakMins = template.unpaidBreakMinutes ?? 0;

  return (
    <tr className="hover:bg-zinc-50/80">
      <td className="px-3 py-3">
        <span
          className="inline-block size-5 rounded"
          style={{ background: template.color ?? DEFAULT_SHIFT_COLOR }}
          aria-label={`Color ${template.color ?? DEFAULT_SHIFT_COLOR}`}
        />
      </td>
      <td className="px-3 py-3 font-medium text-zinc-900">{template.name}</td>
      <td className="px-3 py-3 text-zinc-600">{template.startTime}</td>
      <td className="px-3 py-3 text-zinc-600">{template.endTime}</td>
      <td className="px-3 py-3 text-zinc-600">
        {breakMins > 0 ? formatBreakMinutes(breakMins) : "—"}
      </td>
      <td className="px-3 py-3 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-3 text-sm font-medium text-red-700 hover:text-red-900"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

export function SwatchPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [showMore, setShowMore] = useState(false);
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600">Color</label>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {PRIMARY_SWATCHES.map((c) => (
          <Swatch key={c} color={c} active={value === c} onClick={() => onChange(c)} />
        ))}
        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          className="ml-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {showMore ? "Fewer" : "More"}
        </button>
      </div>
      {showMore ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SECONDARY_SWATCHES.map((c) => (
            <Swatch key={c} color={c} active={value === c} onClick={() => onChange(c)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Swatch({
  color,
  active,
  onClick,
}: {
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={color}
      className={`size-7 rounded-md transition ${active ? "ring-2 ring-offset-2 ring-zinc-900" : "ring-1 ring-zinc-300 hover:ring-zinc-500"}`}
      style={{ background: color }}
      aria-label={`Choose color ${color}${active ? " (selected)" : ""}`}
    />
  );
}
