"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/app/components/modal";
import type { ColumnLayout } from "@/lib/payroll/columns";
import { columnVisible } from "@/lib/payroll/columns";
import type { PayRunDto, PayRunLineDto, ThirdPartyDto } from "@/lib/payroll/dto";
import { formatMoney } from "@/lib/payroll/format";
import { FREQUENCY_LABEL } from "@/lib/payroll/frequency";

const cell = "min-h-11 w-24 rounded-md border border-zinc-300 px-2 text-right text-sm tabular-nums";

export function RunWorkspace({
  initial,
  layout,
  readOnly,
  orgName,
}: {
  initial: PayRunDto;
  layout: ColumnLayout;
  readOnly: boolean;
  orgName: string;
}) {
  const router = useRouter();
  const locked = initial.status !== "draft" || readOnly;
  const [run, setRun] = useState(initial);
  const [step, setStep] = useState(initial.status === "draft" ? 1 : 3);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PayRunLineDto | null>(null);
  const [saveFuture, setSaveFuture] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const generation = useRef(0);

  useEffect(() => {
    if (!dirty || locked) return;
    const timer = window.setTimeout(() => {
      void persist(run, false);
    }, 800);
    return () => window.clearTimeout(timer);
    // persist is stable enough for this draft editor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, dirty, locked]);

  async function persist(snapshot: PayRunDto, manual: boolean) {
    const token = ++generation.current;
    setSaving(true);
    if (manual) setError(null);
    try {
      const res = await fetch(`/api/payroll/runs/${snapshot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rangeStart: snapshot.rangeStart,
          rangeEnd: snapshot.rangeEnd,
          payDate: snapshot.payDate,
          cycleNumber: snapshot.cycleNumber,
          cycleManual: snapshot.cycleManual,
          thirdParty: snapshot.thirdParty,
          lines: snapshot.lines.map((line) => ({
            ...line,
            saveToProfile: editing?.id === line.id && saveFuture,
          })),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; run?: PayRunDto };
      if (token !== generation.current) return;
      if (!res.ok || !body.run) {
        setError(body.error || "Could not save");
        return;
      }
      setDirty(false);
      setSaveFuture(false);
      setRun(body.run);
    } finally {
      if (token === generation.current) setSaving(false);
    }
  }

  function updateLine(id: string, patch: Partial<PayRunLineDto>) {
    setDirty(true);
    setRun((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    }));
  }

  async function post(path: string, payload?: unknown) {
    const token = ++generation.current;
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : "{}",
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; run?: PayRunDto };
    if (token !== generation.current) return;
    if (!res.ok || !body.run) {
      setError(body.error || "That action did not complete");
      return;
    }
    setRun(body.run);
    setDirty(false);
    if (body.run.status !== "draft") setStep(3);
    router.refresh();
  }

  const show = (column: Parameters<typeof columnVisible>[1]) => columnVisible(layout, column);
  const customColumns = layout.custom.filter(
    (column) => !(show("sick") && /^(sick|sick day|sick days)$/i.test(column.label.trim())),
  );
  const draft = run.status === "draft";

  return (
    <div>
      <p className="text-sm text-zinc-600">
        {orgName} · {run.locationName} · {FREQUENCY_LABEL[run.frequency]} · cycle {run.cycleNumber} · pay date {run.payDate}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}</p>

      <ol className="mt-4 flex flex-wrap gap-2 text-sm">
        {["Enter payroll", "Approve payroll", "Print"].map((label, index) => {
          const number = index + 1;
          const disabled = number === 3 && draft;
          const active = step === number;
          return (
            <li key={label}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setStep(number)}
                className={`inline-flex min-h-11 items-center rounded-md px-3 ${
                  active ? "bg-emerald-700 text-white" : "bg-zinc-100 text-zinc-800"
                } disabled:opacity-40`}
              >
                {number}. {label}
              </button>
            </li>
          );
        })}
      </ol>

      {run.status === "void" ? (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
          Voided {run.voidedAt ? `on ${run.voidedAt.slice(0, 10)}` : ""} by {run.voidedByName || "an admin"}.{" "}
          {run.voidReason} This report is a record only and is not filed.
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {step < 3 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                {show("basic") ? <th className="px-3 py-2 text-right font-medium">Basic hours</th> : null}
                {show("overtime") ? <th className="px-3 py-2 text-right font-medium">Overtime hours</th> : null}
                {show("vacation") ? <th className="px-3 py-2 font-medium">Vacation</th> : null}
                {show("sick") ? <th className="px-3 py-2 text-right font-medium">Sick</th> : null}
                {show("extra") ? <th className="px-3 py-2 text-right font-medium">Extra</th> : null}
                {customColumns.map((column) => (
                  <th key={column.id} className="px-3 py-2 text-right font-medium">
                    {column.label}
                  </th>
                ))}
                {show("medical") ? <th className="px-3 py-2 text-right font-medium">Medical</th> : null}
                {show("paye") ? <th className="px-3 py-2 text-right font-medium">P.A.Y.E.</th> : null}
                {step === 2 && show("shortage") ? <th className="px-3 py-2 text-right font-medium">Shortage</th> : null}
                {step === 2 ? <th className="px-3 py-2 text-right font-medium">Loan</th> : null}
                <th className="px-3 py-2 text-right font-medium">Gross</th>
                <th className="px-3 py-2 text-right font-medium">N.I.C.</th>
                <th className="px-3 py-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {run.lines.map((line) => (
                <tr key={line.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">
                    <button type="button" className="font-medium text-emerald-800" onClick={() => setEditing(line)}>
                      {line.displayName}
                    </button>
                    <div className="text-xs text-zinc-500">{line.payType === "salaried" ? "Salaried" : "Hourly"}</div>
                  </td>
                  {show("basic") ? (
                    <td className="px-3 py-2 text-right">
                      <Hours value={line.basicHours} disabled={locked || step === 2} onChange={(value) => updateLine(line.id, { basicHours: value })} />
                    </td>
                  ) : null}
                  {show("overtime") ? (
                    <td className="px-3 py-2 text-right">
                      <Hours
                        value={line.overtimeHours}
                        disabled={locked || step === 2 || line.payType === "salaried"}
                        onChange={(value) => updateLine(line.id, { overtimeHours: value })}
                      />
                    </td>
                  ) : null}
                  {show("vacation") ? <td className="px-3 py-2 text-zinc-500">{line.vacationNote || "—"}</td> : null}
                  {show("sick") ? <td className="px-3 py-2 text-right text-zinc-500">{line.sickDays}</td> : null}
                  {show("extra") ? (
                    <td className="px-3 py-2 text-right">
                      <Hours value={line.extraEarnings} disabled={locked || step === 2} onChange={(value) => updateLine(line.id, { extraEarnings: value })} />
                    </td>
                  ) : null}
                  {customColumns.map((column) => {
                    const amount = line.customColumns.find((item) => item.id === column.id);
                    const value = column.kind === "hour" ? (amount?.hours ?? 0) : (amount?.amount ?? 0);
                    return (
                      <td key={column.id} className="px-3 py-2 text-right">
                        <Hours
                          value={value}
                          disabled={locked || step === 2}
                          onChange={(next) =>
                            updateLine(line.id, {
                            customColumns: layout.custom.map((item) => {
                                const current = line.customColumns.find((entry) => entry.id === item.id);
                                const base = {
                                  id: item.id,
                                  label: item.label,
                                  kind: item.kind,
                                  hours: current?.hours ?? 0,
                                  amount: current?.amount ?? 0,
                                };
                                if (item.id !== column.id) return base;
                                return item.kind === "hour" ? { ...base, hours: next } : { ...base, amount: next };
                              }),
                            })
                          }
                        />
                      </td>
                    );
                  })}
                  {show("medical") ? (
                    <td className="px-3 py-2 text-right">
                      <Hours value={line.medical} disabled={locked || step === 2} onChange={(value) => updateLine(line.id, { medical: value })} />
                    </td>
                  ) : null}
                  {show("paye") ? (
                    <td className="px-3 py-2 text-right">
                      <Hours value={line.paye} disabled={locked || step === 2} onChange={(value) => updateLine(line.id, { paye: value })} />
                    </td>
                  ) : null}
                  {step === 2 && show("shortage") ? (
                    <td className="px-3 py-2 text-right">
                      <Hours value={line.shortage} disabled={locked} onChange={(value) => updateLine(line.id, { shortage: value })} />
                    </td>
                  ) : null}
                  {step === 2 ? (
                    <td className="px-3 py-2 text-right">
                      <Hours value={line.loanDeduction} disabled={locked} onChange={(value) => updateLine(line.id, { loanDeduction: value })} />
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.gross)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.employeeNic)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {step === 2 ? (
        <section className="mt-6 max-w-xl">
          <h2 className="font-semibold text-zinc-900">Other payments</h2>
          <p className="mt-1 text-sm text-zinc-600">Amounts that are not someone’s net pay. They are added when you print the banking list.</p>
          <ul className="mt-2 space-y-2">
            {run.thirdParty.map((item) => (
              <li key={item.id} className="flex gap-2">
                <input
                  className="min-h-11 flex-1 rounded-md border border-zinc-300 px-3 text-sm"
                  value={item.label}
                  disabled={locked}
                  onChange={(event) => replaceThird(item.id, { label: event.target.value })}
                />
                <Hours value={item.amount} disabled={locked} onChange={(amount) => replaceThird(item.id, { amount })} />
              </li>
            ))}
          </ul>
          {locked ? null : (
            <button
              type="button"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-emerald-800"
              onClick={() => {
                const row: ThirdPartyDto = { id: `tp_${Date.now()}`, label: "", amount: 0 };
                setDirty(true);
                setRun((current) => ({ ...current, thirdParty: [...current.thirdParty, row] }));
              }}
            >
              Add a payment
            </button>
          )}
        </section>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <p className="text-sm text-zinc-800">
          Gross {formatMoney(run.totals.gross)} · deductions {formatMoney(run.totals.deductions)} · net {formatMoney(run.totals.net)}
          <span className="block text-zinc-500">Employer N.I.C. {formatMoney(run.totals.employerNic)} is a memo and is not taken from net.</span>
        </p>
      </div>

      {draft && !readOnly ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-3 text-sm" onClick={() => void post(`/api/payroll/runs/${run.id}/reload-hours`)}>
            Reload hours
          </button>
          <button type="button" className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-3 text-sm" onClick={() => void post(`/api/payroll/runs/${run.id}/clear-entries`)}>
            Clear entries
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-lg border border-red-200 px-3 text-sm text-red-800"
            onClick={async () => {
              if (!window.confirm("Delete this draft?")) return;
              const res = await fetch(`/api/payroll/runs/${run.id}`, { method: "DELETE" });
              if (res.ok) router.push("/payroll");
              else setError("Could not delete the draft");
            }}
          >
            Delete draft
          </button>
        </div>
      ) : null}

      {step === 2 && draft && !readOnly ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/payroll/runs/${run.id}/print/summary`} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-3 text-sm">
            Preview summary
          </Link>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white"
            onClick={() => void post(`/api/payroll/runs/${run.id}/approve`)}
          >
            Approve and lock
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["summary", "Payroll summary"],
              ["payslips", "Payslips"],
              ["nic", "NIC report"],
              ["gl", "GL analysis"],
              ["banking", "Banking list"],
              ["credit-union", "Credit-union letters"],
            ] as const
          ).map(([doc, label]) => (
            <Link key={doc} href={`/payroll/runs/${run.id}/print/${doc}`} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-200 px-3 text-sm font-medium text-emerald-800">
              {label}
            </Link>
          ))}
          <a href={`/api/payroll/runs/${run.id}/banking`} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-200 px-3 text-sm font-medium text-emerald-800">
            Download banking list
          </a>
          <p className="text-sm text-zinc-500 sm:col-span-2">Print PAYE is not available. PAYE on the run is the amount that was typed.</p>
          {run.status === "processed" && !readOnly ? (
            <form
              className="flex flex-wrap items-end gap-2 sm:col-span-2"
              onSubmit={(event) => {
                event.preventDefault();
                void post(`/api/payroll/runs/${run.id}/void`, { reason: voidReason });
              }}
            >
              <label className="text-sm font-medium text-zinc-800">
                Void reason
                <input className="mt-1 min-h-11 rounded-md border border-zinc-300 px-3" value={voidReason} onChange={(event) => setVoidReason(event.target.value)} />
              </label>
              <button type="submit" className="inline-flex min-h-11 items-center rounded-lg border border-red-200 px-3 text-sm text-red-800">
                Void this run
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <Modal open={editing != null} onClose={() => setEditing(null)} title={editing?.displayName ?? "Pay details"}>
        {editing ? (
          <div className="grid gap-3">
            <label className="text-sm font-medium">
              {editing.payType === "salaried" ? "Salary this cycle" : "Hourly rate"}
              <input
                className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3"
                inputMode="decimal"
                defaultValue={editing.payType === "salaried" ? editing.salaryAmount : editing.hourlyRate}
                disabled={locked}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  updateLine(editing.id, editing.payType === "salaried" ? { salaryAmount: value } : { hourlyRate: value });
                  setEditing({ ...editing, ...(editing.payType === "salaried" ? { salaryAmount: value } : { hourlyRate: value }) });
                }}
              />
            </label>
            <label className="text-sm font-medium">
              Tax code
              <input
                className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3"
                defaultValue={editing.taxCode}
                disabled={locked}
                onChange={(event) => {
                  updateLine(editing.id, { taxCode: event.target.value });
                  setEditing({ ...editing, taxCode: event.target.value });
                }}
              />
            </label>
            <label className="text-sm font-medium">
              Medical
              <input
                className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3"
                inputMode="decimal"
                defaultValue={editing.medical}
                disabled={locked}
                onChange={(event) => {
                  const medical = Number(event.target.value);
                  updateLine(editing.id, { medical });
                  setEditing({ ...editing, medical });
                }}
              />
            </label>
            {locked || !editing.staffId ? null : (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={saveFuture} onChange={(event) => setSaveFuture(event.target.checked)} />
                Save rate, tax code, and medical for future runs
              </label>
            )}
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white"
              onClick={() => {
                if (!editing) return;
                const snapshot = {
                  ...run,
                  lines: run.lines.map((line) => (line.id === editing.id ? { ...line, hourlyRate: editing.hourlyRate, salaryAmount: editing.salaryAmount, taxCode: editing.taxCode, medical: editing.medical } : line)),
                };
                void persist(snapshot, true);
                setEditing(null);
              }}
            >
              Done
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  );

  function replaceThird(id: string, patch: Partial<ThirdPartyDto>) {
    setDirty(true);
    setRun((current) => ({
      ...current,
      thirdParty: current.thirdParty.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }
}

function Hours({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <input
      className={cell}
      inputMode="decimal"
      disabled={disabled}
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
