"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnLayout } from "@/lib/payroll/columns";
import type { PayrollSettingsDto } from "@/lib/payroll/dto";
import type { CustomColumnKind } from "@/lib/payroll/compute-line";

const field =
  "mt-1 min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 disabled:bg-zinc-50";

const BUILT_IN: { id: ColumnLayout["hiddenBuiltIn"][number]; label: string; group: "hours" | "review" }[] = [
  { id: "basic", label: "Basic", group: "hours" },
  { id: "overtime", label: "Overtime", group: "hours" },
  { id: "vacation", label: "Vacation", group: "hours" },
  { id: "extra", label: "Extra", group: "hours" },
  { id: "sick", label: "Sick", group: "hours" },
  { id: "medical", label: "Medical", group: "review" },
  { id: "paye", label: "P.A.Y.E.", group: "review" },
  { id: "shortage", label: "Shortage", group: "review" },
];

const KIND_LABEL: Record<CustomColumnKind, string> = {
  hour: "Hours",
  money: "Added to gross",
  deduction: "Deduction",
};

const OVERTIME = [
  ["none", "No automatic split", "All clocked hours stay basic. Overtime hours are typed."],
  ["daily", "Daily", "Hours after 8 in a day are overtime."],
  ["weekly", "Weekly", "Hours after 40 in a week, inside this pay period, are overtime."],
] as const;

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

  const hours = BUILT_IN.filter((column) => column.group === "hours");
  const review = BUILT_IN.filter((column) => column.group === "review");

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Overtime</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Saved rules apply to the next pay run, and to Reload hours on an open draft.
        </p>
        <div className="mt-4 grid gap-2">
          {OVERTIME.map(([value, title, text]) => {
            const selected = form.overtimeRule === value;
            return (
              <label
                key={value}
                className={`flex min-h-11 cursor-pointer gap-3 rounded-lg border px-3 py-3 ${
                  selected ? "border-emerald-700 bg-emerald-50" : "border-zinc-200 hover:border-zinc-300"
                } ${readOnly ? "cursor-default" : ""}`}
              >
                <input
                  type="radio"
                  name="overtime"
                  className="mt-1 accent-emerald-700"
                  checked={selected}
                  disabled={readOnly}
                  onChange={() => setForm({ ...form, overtimeRule: value })}
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-900">{title}</span>
                  <span className="mt-0.5 block text-sm text-zinc-600">{text}</span>
                </span>
              </label>
            );
          })}
        </div>
        <label className="mt-4 block max-w-xs text-sm font-medium text-zinc-800">
          Overtime multiplier
          <input
            className={field}
            inputMode="decimal"
            value={form.overtimeMultiplier}
            disabled={readOnly}
            onChange={(event) => setForm({ ...form, overtimeMultiplier: Number(event.target.value) })}
          />
        </label>
        <p className="mt-2 text-sm text-zinc-600">1 is straight time, 1.5 is time and a half, 2 is double time.</p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Payslips and books</h2>
        <p className="mt-1 text-sm text-zinc-600">Name, address, and phone print on the payslip. The GL fields print on the analysis.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-800 sm:col-span-2">
            Name on payslips
            <input className={field} value={form.legalName} disabled={readOnly} onChange={(event) => setForm({ ...form, legalName: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-zinc-800 sm:col-span-2">
            Address
            <input className={field} value={form.addressLine} disabled={readOnly} onChange={(event) => setForm({ ...form, addressLine: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-zinc-800 sm:col-span-2">
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
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Columns</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <ColumnGroup
            title="Hours grid"
            hint="Basic, overtime, vacation, and extra show on the hours grid. Show all adds sick, and any of these you leave off."
            columns={hours}
            hidden={form.columnLayout.hiddenBuiltIn}
            readOnly={readOnly}
            onToggle={hidden}
          />
          <ColumnGroup
            title="Before you approve"
            hint="Medical, P.A.Y.E., and shortage are checked on the details step. P.A.Y.E. stays a typed amount."
            columns={review}
            hidden={form.columnLayout.hiddenBuiltIn}
            readOnly={readOnly}
            onToggle={hidden}
          />
        </div>

        <h3 className="mt-6 text-sm font-semibold text-zinc-900">Extra columns</h3>
        {form.columnLayout.custom.length > 0 ? (
          <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {form.columnLayout.custom.map((column) => (
              <li key={column.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-zinc-900">
                  {column.label}
                  <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    {KIND_LABEL[column.kind]}
                  </span>
                </span>
                {readOnly ? null : (
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-800"
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
        ) : null}
        {readOnly ? null : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              className="min-h-11 rounded-md border border-zinc-300 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              placeholder="Column name"
              aria-label="Column name"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
            <select
              className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              aria-label="Column type"
              value={kind}
              onChange={(event) => setKind(event.target.value as CustomColumnKind)}
            >
              <option value="hour">Hours</option>
              <option value="money">Money, added to gross</option>
              <option value="deduction">Deduction</option>
            </select>
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
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
      </section>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {readOnly ? null : (
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-fit items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
      )}
    </form>
  );
}

function ColumnGroup({
  title,
  hint,
  columns,
  hidden,
  readOnly,
  onToggle,
}: {
  title: string;
  hint: string;
  columns: { id: ColumnLayout["hiddenBuiltIn"][number]; label: string }[];
  hidden: ColumnLayout["hiddenBuiltIn"];
  readOnly: boolean;
  onToggle: (id: ColumnLayout["hiddenBuiltIn"][number], hide: boolean) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-zinc-900">{title}</legend>
      <p className="mt-1 text-sm text-zinc-600">{hint}</p>
      <div className="mt-3 grid gap-2">
        {columns.map((column) => {
          const checked = !hidden.includes(column.id);
          return (
            <label
              key={column.id}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${
                checked ? "border-emerald-200 bg-emerald-50/70 text-zinc-900" : "border-zinc-200 text-zinc-700"
              } ${readOnly ? "cursor-default" : ""}`}
            >
              <input
                type="checkbox"
                className="accent-emerald-700"
                checked={checked}
                disabled={readOnly}
                onChange={(event) => onToggle(column.id, !event.target.checked)}
              />
              {column.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
