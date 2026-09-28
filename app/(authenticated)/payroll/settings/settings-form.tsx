"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnLayout } from "@/lib/payroll/columns";
import type { PayrollSettingsDto } from "@/lib/payroll/dto";
import type { CustomColumnKind } from "@/lib/payroll/compute-line";

const field = "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm";

const BUILT_IN: { id: ColumnLayout["hiddenBuiltIn"][number]; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "overtime", label: "Overtime" },
  { id: "vacation", label: "Vacation" },
  { id: "sick", label: "Sick" },
  { id: "extra", label: "Extra" },
  { id: "medical", label: "Medical" },
  { id: "paye", label: "P.A.Y.E." },
  { id: "shortage", label: "Shortage" },
];

export function SettingsForm({ initial, readOnly }: { initial: PayrollSettingsDto; readOnly: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<CustomColumnKind>("money");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function hidden(id: (typeof BUILT_IN)[number]["id"], hide: boolean) {
    const next = new Set(form.columnLayout.hiddenBuiltIn);
    if (hide) next.add(id);
    else next.delete(id);
    setForm({ ...form, columnLayout: { ...form.columnLayout, hiddenBuiltIn: [...next] } });
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/payroll/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error || "Could not save settings");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-zinc-800">Overtime</legend>
        {(
          [
            ["none", "No automatic split. All clocked hours stay basic. Overtime hours are typed."],
            ["daily", "Daily. Hours after 8 in a day are overtime."],
            ["weekly", "Weekly. Hours after 40 in a week, inside this pay period, are overtime."],
          ] as const
        ).map(([value, text]) => (
          <label key={value} className="flex min-h-11 items-center gap-2 text-sm text-zinc-800">
            <input
              type="radio"
              name="overtime"
              checked={form.overtimeRule === value}
              disabled={readOnly}
              onChange={() => setForm({ ...form, overtimeRule: value })}
            />
            {text}
          </label>
        ))}
      </fieldset>
      <label className="text-sm font-medium text-zinc-800">
        Overtime multiplier (1 to 3)
        <input
          className={field}
          inputMode="decimal"
          value={form.overtimeMultiplier}
          disabled={readOnly}
          onChange={(event) => setForm({ ...form, overtimeMultiplier: Number(event.target.value) })}
        />
      </label>
      <p className="text-sm text-zinc-600">
        1 is straight time, 1.5 is time and a half, 2 is double time. Saved rules apply to the next pay run, and to
        Reload hours on an open draft. P.A.Y.E. stays a typed amount.
      </p>
      <label className="text-sm font-medium text-zinc-800">
        Name on payslips
        <input className={field} value={form.legalName} disabled={readOnly} onChange={(event) => setForm({ ...form, legalName: event.target.value })} />
      </label>
      <label className="text-sm font-medium text-zinc-800">
        Address
        <input className={field} value={form.addressLine} disabled={readOnly} onChange={(event) => setForm({ ...form, addressLine: event.target.value })} />
      </label>
      <label className="text-sm font-medium text-zinc-800">
        Phone
        <input className={field} value={form.phone} disabled={readOnly} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      </label>
      <label className="text-sm font-medium text-zinc-800">
        GL centre
        <input className={field} value={form.glCentre} disabled={readOnly} onChange={(event) => setForm({ ...form, glCentre: event.target.value })} />
      </label>
      <label className="text-sm font-medium text-zinc-800">
        GL department
        <input className={field} value={form.glDepartment} disabled={readOnly} onChange={(event) => setForm({ ...form, glDepartment: event.target.value })} />
      </label>
      <fieldset>
        <legend className="text-sm font-medium text-zinc-800">Columns</legend>
        <p className="mt-1 text-sm text-zinc-600">
          Basic, overtime, vacation, and extra show on the hours grid. Show all on a pay run adds sick, and any of those you leave unchecked. Medical, P.A.Y.E., and shortage are checked before you approve.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {BUILT_IN.map((column) => (
            <label key={column.id} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!form.columnLayout.hiddenBuiltIn.includes(column.id)}
                disabled={readOnly}
                onChange={(event) => hidden(column.id, !event.target.checked)}
              />
              {column.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <h2 className="text-sm font-medium text-zinc-800">Extra columns</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {form.columnLayout.custom.map((column) => (
            <li key={column.id} className="flex items-center justify-between gap-3">
              <span>
                {column.label} · {column.kind}
              </span>
              {readOnly ? null : (
                <button
                  type="button"
                  className="text-emerald-800"
                  onClick={() =>
                    setForm({
                      ...form,
                      columnLayout: {
                        ...form.columnLayout,
                        custom: form.columnLayout.custom.filter((item) => item.id !== column.id),
                      },
                    })
                  }
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        {readOnly ? null : (
          <div className="mt-2 flex flex-wrap gap-2">
            <input className="min-h-11 rounded-md border border-zinc-300 px-3 text-sm" placeholder="Column name" value={label} onChange={(event) => setLabel(event.target.value)} />
            <select className="min-h-11 rounded-md border border-zinc-300 px-3 text-sm" value={kind} onChange={(event) => setKind(event.target.value as CustomColumnKind)}>
              <option value="hour">Hours</option>
              <option value="money">Money, added to gross</option>
              <option value="deduction">Deduction</option>
            </select>
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-3 text-sm"
              onClick={() => {
                const name = label.trim();
                if (!name) return;
                setForm({
                  ...form,
                  columnLayout: {
                    ...form.columnLayout,
                    custom: [...form.columnLayout.custom, { id: `col_${Date.now()}`, label: name, kind }],
                  },
                });
                setLabel("");
              }}
            >
              Add column
            </button>
          </div>
        )}
      </div>
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {readOnly ? null : (
        <button type="submit" disabled={pending} className="inline-flex min-h-11 w-fit items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
          {pending ? "Saving…" : "Save settings"}
        </button>
      )}
    </form>
  );
}
