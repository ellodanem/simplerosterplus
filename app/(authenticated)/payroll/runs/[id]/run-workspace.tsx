"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/app/components/modal";
import type { ColumnLayout } from "@/lib/payroll/columns";
import { columnVisible } from "@/lib/payroll/columns";
import type { CustomColumnKind } from "@/lib/payroll/compute-line";
import type { PayRunDto, PayRunLineDto, ThirdPartyDto } from "@/lib/payroll/dto";
import { formatHours, formatMoney } from "@/lib/payroll/format";
import { FREQUENCY_LABEL } from "@/lib/payroll/frequency";

const SHOW_ALL_KEY = "srp-payroll-show-all";
const cell =
  "min-h-11 w-24 rounded-md border border-zinc-300 bg-white px-2 text-right text-sm tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:border-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-400";

const ENTRY = ["basic", "overtime", "vacation", "sick", "extra"] as const;
type EntryColumn = (typeof ENTRY)[number];

const ENTRY_LABEL: Record<EntryColumn, string> = {
  basic: "Basic",
  overtime: "Overtime",
  vacation: "Vacation",
  sick: "Sick",
  extra: "Extra",
};

type GridColumn =
  | { key: string; label: string; group: "hours" | "money"; source: "builtin"; id: EntryColumn }
  | { key: string; label: string; group: "hours" | "money"; source: "custom"; id: string; customKind: "hour" | "money" };

const SICK_LABEL = /^(sick|sick day|sick days)$/i;

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
  const [showAll, setShowAll] = useState(false);
  const [details, setDetails] = useState(false);
  const generation = useRef(0);
  const saveTimer = useRef(0);

  useEffect(() => {
    setShowAll(window.sessionStorage.getItem(SHOW_ALL_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!dirty || locked) return;
    const timer = window.setTimeout(() => {
      void persist(run, false);
    }, 800);
    saveTimer.current = timer;
    return () => window.clearTimeout(timer);
    // persist is stable enough for this draft editor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, dirty, locked]);

  async function persist(snapshot: PayRunDto, manual: boolean): Promise<boolean> {
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
      if (token !== generation.current) return false;
      if (!res.ok || !body.run) {
        setError(body.error || "Could not save");
        return false;
      }
      setDirty(false);
      setSaveFuture(false);
      setRun(body.run);
      return true;
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

  function openPay(line: PayRunLineDto) {
    setSaveFuture(false);
    setEditing(line);
  }

  function toggleShowAll(next: boolean) {
    setShowAll(next);
    window.sessionStorage.setItem(SHOW_ALL_KEY, next ? "1" : "0");
  }

  const draft = run.status === "draft";
  const hourly = run.lines.filter((line) => line.payType !== "salaried");
  const salaried = run.lines.filter((line) => line.payType === "salaried");
  const hourlyColumns = gridColumns(layout, showAll, "hourly");
  const salariedColumns = gridColumns(layout, showAll, "salaried");
  const deductionColumns = layout.custom.filter((column) => column.kind === "deduction");

  return (
    <div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pay schedule</dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {FREQUENCY_LABEL[run.frequency]}
            <span className="mt-0.5 block text-zinc-500">
              {orgName} · {run.locationName} · cycle {run.cycleNumber}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pay period</dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {run.rangeStart} – {run.rangeEnd}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            <label htmlFor="pay-date">Pay date</label>
          </dt>
          <dd className="mt-1">
            {draft && !readOnly ? (
              <input
                id="pay-date"
                type="date"
                className="min-h-11 rounded-md border border-zinc-300 px-3 text-sm"
                value={run.payDate}
                onChange={(event) => {
                  const payDate = event.target.value;
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(payDate)) return;
                  setDirty(true);
                  setRun((current) => ({ ...current, payDate }));
                }}
              />
            ) : (
              <span className="text-sm text-zinc-900">{run.payDate}</span>
            )}
            <span className="mt-0.5 block text-xs text-zinc-500">N.I.C. for the month uses this date.</span>
          </dd>
        </div>
      </dl>

      <nav aria-label="Pay run progress" className="mt-6 border-b border-zinc-200">
        <ol className="flex gap-1 overflow-x-auto">
          {(
            [
              { label: "Enter payroll", disabled: false },
              { label: "Approve payroll", disabled: false },
              { label: "Print", disabled: draft },
            ] as { label: string; disabled: boolean }[]
          ).map(({ label, disabled }, index) => {
            const number = index + 1;
            const active = step === number;
            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-current={active ? "step" : undefined}
                  onClick={() => setStep(number)}
                  className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm ${
                    active
                      ? "border-emerald-700 font-semibold text-zinc-900"
                      : "border-transparent text-zinc-500 hover:text-zinc-800"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  <span className={active ? "text-emerald-700" : "text-zinc-400"}>{number}</span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

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

      {step === 1 ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">Enter hours and money</h2>
            <label className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                className="size-4 accent-emerald-700"
                checked={showAll}
                onChange={(event) => toggleShowAll(event.target.checked)}
              />
              Show all hours and money types
            </label>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Click a name or a rate to change it for this run. Show all adds sick and any hour or money column turned off in payroll settings.
          </p>
          {run.lines.length === 0 ? (
            <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Nobody is on this run.
            </p>
          ) : (
            <div className="mt-4 space-y-8">
              <PeopleGrid
                title="Hourly"
                lines={hourly}
                columns={hourlyColumns}
                locked={locked}
                onOpen={openPay}
                onChange={updateLine}
                layout={layout}
              />
              <PeopleGrid
                title="Salaried"
                lines={salaried}
                columns={salariedColumns}
                locked={locked}
                onOpen={openPay}
                onChange={updateLine}
                layout={layout}
              />
            </div>
          )}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">{details ? "Payroll details" : "Payroll summary"}</h2>
            <button
              type="button"
              className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-800"
              aria-pressed={details}
              onClick={() => setDetails((current) => !current)}
            >
              {details ? "View summary" : "View details"}
            </button>
          </div>
          {details ? (
            <div className="mt-4 space-y-4">
              {[...hourly, ...salaried].map((line) => (
                <DetailCard
                  key={line.id}
                  line={line}
                  multiplier={run.overtimeMultiplier}
                  locked={locked}
                  showMedical={columnVisible(layout, "medical")}
                  showPaye={columnVisible(layout, "paye")}
                  showShortage={columnVisible(layout, "shortage")}
                  deductions={deductionColumns}
                  onChange={(patch) => updateLine(line.id, patch)}
                  layout={layout}
                />
              ))}
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-zinc-600">
                Open details to check N.I.C., medical, P.A.Y.E., shortage, and the loan before you approve.
              </p>
              <div className="mt-4 space-y-6">
                <SummaryTable title="Hourly" lines={hourly} hours />
                <SummaryTable title="Salaried" lines={salaried} hours={false} />
                <dl className="grid gap-3 rounded-xl bg-zinc-100 px-4 py-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-zinc-500">Hourly hours</dt>
                    <dd className="font-semibold tabular-nums text-zinc-900">{formatHours(sum(hourly, totalHours))}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Gross</dt>
                    <dd className="font-semibold tabular-nums text-zinc-900">{formatMoney(run.totals.gross)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Net</dt>
                    <dd className="font-semibold tabular-nums text-zinc-900">{formatMoney(run.totals.net)}</dd>
                  </div>
                </dl>
              </div>
            </>
          )}
          <OtherPayments run={run} locked={locked} onChange={replaceThird} onAdd={addThird} />
        </section>
      ) : null}

      {step === 3 ? <PrintPack run={run} readOnly={readOnly} voidReason={voidReason} setVoidReason={setVoidReason} onVoid={() => void post(`/api/payroll/runs/${run.id}/void`, { reason: voidReason })} /> : null}

      {step < 3 ? (
        <div className="sticky bottom-0 z-20 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white/95 py-3">
          <p className="text-sm text-zinc-800">
            <span className="font-medium">{saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}</span>
            <span className="mx-2 text-zinc-300" aria-hidden="true">
              ·
            </span>
            Gross {formatMoney(run.totals.gross)} · net {formatMoney(run.totals.net)}
            <span className="mt-0.5 block text-xs text-zinc-500">
              Employer N.I.C. {formatMoney(run.totals.employerNic)} is a memo and is not taken from net.
            </span>
            {draft && !readOnly ? (
              <button
                type="button"
                className="mt-1 inline-flex min-h-11 items-center text-sm text-red-800"
                onClick={async () => {
                  if (!window.confirm("Delete this draft?")) return;
                  const res = await fetch(`/api/payroll/runs/${run.id}`, { method: "DELETE" });
                  if (res.ok) router.push("/payroll");
                  else setError("Could not delete the draft");
                }}
              >
                Delete draft
              </button>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {step === 1 && draft && !readOnly ? (
              <>
                <button type="button" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-zinc-700 hover:bg-zinc-100" onClick={() => void post(`/api/payroll/runs/${run.id}/reload-hours`)}>
                  Reload hours
                </button>
                <button type="button" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-zinc-700 hover:bg-zinc-100" onClick={() => void post(`/api/payroll/runs/${run.id}/clear-entries`)}>
                  Clear entries
                </button>
              </>
            ) : null}
            {step === 2 ? (
              <button type="button" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-zinc-700 hover:bg-zinc-100" onClick={() => setStep(1)}>
                Back to hours
              </button>
            ) : null}
            {step === 1 ? (
              <button type="button" className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800" onClick={() => setStep(2)}>
                Continue
              </button>
            ) : null}
            {step === 2 && draft && !readOnly ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
                onClick={() => {
                  window.clearTimeout(saveTimer.current);
                  void (async () => {
                    if (dirty) {
                      const saved = await persist(run, true);
                      if (!saved) return;
                    }
                    await post(`/api/payroll/runs/${run.id}/approve`);
                  })();
                }}
              >
                Approve payroll
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Modal open={editing != null} onClose={() => setEditing(null)} title={editing ? `Pay for ${editing.displayName}` : "Pay"}>
        {editing ? (
          <div className="grid gap-3">
            <label className="text-sm font-medium text-zinc-800">
              {editing.payType === "salaried" ? "Salary this cycle" : "Hourly rate"}
              <NumberField
                label={editing.payType === "salaried" ? "Salary this cycle" : "Hourly rate"}
                className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 text-left"
                value={editing.payType === "salaried" ? editing.salaryAmount : editing.hourlyRate}
                disabled={locked}
                onChange={(value) => {
                  const patch = editing.payType === "salaried" ? { salaryAmount: value } : { hourlyRate: value };
                  updateLine(editing.id, patch);
                  setEditing({ ...editing, ...patch });
                }}
              />
            </label>
            <label className="text-sm font-medium text-zinc-800">
              Tax code
              <input
                className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3"
                value={editing.taxCode}
                disabled={locked}
                onChange={(event) => {
                  updateLine(editing.id, { taxCode: event.target.value });
                  setEditing({ ...editing, taxCode: event.target.value });
                }}
              />
            </label>
            <fieldset className="grid gap-2" disabled={locked || !editing.staffId}>
              <legend className="text-sm font-medium text-zinc-800">Apply to</legend>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="radio" name="pay-apply" checked={!saveFuture} onChange={() => setSaveFuture(false)} />
                Only this pay run
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="radio" name="pay-apply" checked={saveFuture} onChange={() => setSaveFuture(true)} />
                This run and future runs
              </label>
            </fieldset>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
              onClick={() => {
                if (!editing) return;
                const snapshot = {
                  ...run,
                  lines: run.lines.map((line) =>
                    line.id === editing.id
                      ? {
                          ...line,
                          hourlyRate: editing.hourlyRate,
                          salaryAmount: editing.salaryAmount,
                          taxCode: editing.taxCode,
                          medical: editing.medical,
                        }
                      : line,
                  ),
                };
                void persist(snapshot, true);
                setEditing(null);
              }}
            >
              Save pay
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

  function addThird() {
    const row: ThirdPartyDto = { id: `tp_${Date.now()}`, label: "", amount: 0 };
    setDirty(true);
    setRun((current) => ({ ...current, thirdParty: [...current.thirdParty, row] }));
  }
}

function onEntryGrid(layout: ColumnLayout, column: EntryColumn, showAll: boolean): boolean {
  if (column === "sick") return showAll && columnVisible(layout, column);
  if (columnVisible(layout, column)) return true;
  return showAll;
}

function gridColumns(layout: ColumnLayout, showAll: boolean, payType: "hourly" | "salaried"): GridColumn[] {
  const sickOn = onEntryGrid(layout, "sick", showAll);
  const columns: GridColumn[] = [];
  for (const id of ENTRY) {
    if (payType === "salaried" && (id === "basic" || id === "overtime")) continue;
    if (!onEntryGrid(layout, id, showAll)) continue;
    columns.push({
      key: id,
      id,
      label: ENTRY_LABEL[id],
      group: id === "extra" ? "money" : "hours",
      source: "builtin",
    });
  }
  for (const column of layout.custom) {
    if (column.kind === "deduction") continue;
    if (sickOn && SICK_LABEL.test(column.label.trim())) continue;
    if (column.kind !== "hour" && column.kind !== "money") continue;
    columns.push({
      key: column.id,
      id: column.id,
      label: column.label,
      group: column.kind === "hour" ? "hours" : "money",
      source: "custom",
      customKind: column.kind,
    });
  }
  return [
    ...columns.filter((column) => column.group === "hours"),
    ...columns.filter((column) => column.group === "money"),
  ];
}

function PeopleGrid({
  title,
  lines,
  columns,
  locked,
  onOpen,
  onChange,
  layout,
}: {
  title: string;
  lines: PayRunLineDto[];
  columns: GridColumn[];
  locked: boolean;
  onOpen: (line: PayRunLineDto) => void;
  onChange: (id: string, patch: Partial<PayRunLineDto>) => void;
  layout: ColumnLayout;
}) {
  if (lines.length === 0) return null;
  const hourColumns = columns.filter((column) => column.group === "hours");
  const moneyColumns = columns.filter((column) => column.group === "money");
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <div className="mt-2 overflow-x-auto rounded-xl border border-zinc-200">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">{title} hours and money</caption>
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th rowSpan={2} className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-left font-medium">
                Name
              </th>
              <th rowSpan={2} className="px-3 py-2 text-right font-medium">
                {title === "Salaried" ? "Salary" : "Rate"}
              </th>
              {hourColumns.length > 0 ? (
                <th colSpan={hourColumns.length} className="border-b border-zinc-200 px-3 py-2 text-center text-xs font-medium uppercase tracking-wide">
                  Hours
                </th>
              ) : null}
              {moneyColumns.length > 0 ? (
                <th colSpan={moneyColumns.length} className="border-b border-zinc-200 px-3 py-2 text-center text-xs font-medium uppercase tracking-wide">
                  Money
                </th>
              ) : null}
              <th rowSpan={2} className="px-3 py-2 text-right font-medium">
                Gross
              </th>
            </tr>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-2 text-right text-xs font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t border-zinc-100">
                <th scope="row" className="sticky left-0 z-10 border-t border-zinc-100 bg-white px-3 py-2 text-left font-medium">
                  <button type="button" className="text-emerald-800 hover:underline" onClick={() => onOpen(line)}>
                    {line.displayName}
                  </button>
                </th>
                <td className="border-t border-zinc-100 px-3 py-2 text-right">
                  <button
                    type="button"
                    className="min-h-11 tabular-nums text-zinc-800 hover:text-emerald-800 hover:underline"
                    aria-label={`Edit pay for ${line.displayName}`}
                    onClick={() => onOpen(line)}
                  >
                    {formatMoney(line.payType === "salaried" ? line.salaryAmount : line.hourlyRate)}
                  </button>
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="border-t border-zinc-100 px-3 py-2 text-right">
                    <GridCell column={column} line={line} locked={locked} onChange={onChange} layout={layout} />
                  </td>
                ))}
                <td className="border-t border-zinc-100 px-3 py-2 text-right font-medium tabular-nums">{formatMoney(line.gross)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50 font-medium text-zinc-900">
              <th scope="row" colSpan={2} className="px-3 py-2 text-left">
                {title} total
              </th>
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 text-right tabular-nums">
                  {columnTotal(lines, column)}
                </td>
              ))}
              <td className="px-3 py-2 text-right tabular-nums">{formatMoney(sum(lines, (line) => line.gross))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function GridCell({
  column,
  line,
  locked,
  onChange,
  layout,
}: {
  column: GridColumn;
  line: PayRunLineDto;
  locked: boolean;
  onChange: (id: string, patch: Partial<PayRunLineDto>) => void;
  layout: ColumnLayout;
}) {
  if (column.source === "builtin" && column.id === "vacation") {
    return <span className="text-zinc-600">{line.vacationNote || "—"}</span>;
  }
  if (column.source === "builtin" && column.id === "sick") {
    return <span className="tabular-nums text-zinc-600">{line.sickDays === 0 ? "—" : line.sickDays}</span>;
  }
  if (column.source === "builtin" && column.id === "basic") {
    return (
      <NumberField
        label={`${line.displayName} basic hours`}
        value={line.basicHours}
        disabled={locked}
        onChange={(basicHours) => onChange(line.id, { basicHours })}
      />
    );
  }
  if (column.source === "builtin" && column.id === "overtime") {
    return (
      <NumberField
        label={`${line.displayName} overtime hours`}
        value={line.overtimeHours}
        disabled={locked || line.payType === "salaried"}
        onChange={(overtimeHours) => onChange(line.id, { overtimeHours })}
      />
    );
  }
  if (column.source === "builtin" && column.id === "extra") {
    return (
      <NumberField
        label={`${line.displayName} extra`}
        value={line.extraEarnings}
        disabled={locked}
        onChange={(extraEarnings) => onChange(line.id, { extraEarnings })}
      />
    );
  }
  if (column.source !== "custom") return null;
  const amount = line.customColumns.find((item) => item.id === column.id);
  const value = column.customKind === "hour" ? (amount?.hours ?? 0) : (amount?.amount ?? 0);
  return (
    <NumberField
      label={`${line.displayName} ${column.label}`}
      value={value}
      disabled={locked}
      onChange={(next) =>
        onChange(line.id, {
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
  );
}

function columnTotal(lines: PayRunLineDto[], column: GridColumn): string {
  if (column.source === "builtin" && column.id === "vacation") return "";
  if (column.source === "builtin" && column.id === "sick") return formatHours(sum(lines, (line) => line.sickDays));
  if (column.source === "builtin" && column.id === "basic") return formatHours(sum(lines, (line) => line.basicHours));
  if (column.source === "builtin" && column.id === "overtime") return formatHours(sum(lines, (line) => line.overtimeHours));
  if (column.source === "builtin" && column.id === "extra") return formatMoney(sum(lines, (line) => line.extraEarnings));
  if (column.source !== "custom") return "";
  const total = sum(lines, (line) => {
    const amount = line.customColumns.find((item) => item.id === column.id);
    return column.customKind === "hour" ? (amount?.hours ?? 0) : (amount?.amount ?? 0);
  });
  return column.customKind === "hour" ? formatHours(total) : formatMoney(total);
}

function SummaryTable({ title, lines, hours }: { title: string; lines: PayRunLineDto[]; hours: boolean }) {
  if (lines.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="min-w-full text-sm">
        <caption className="border-b border-zinc-100 px-3 py-2 text-left text-sm font-semibold text-zinc-900">
          {title}
        </caption>
        <thead className="text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-right font-medium">Hours</th>
            <th className="px-3 py-2 text-right font-medium">Gross</th>
            <th className="px-3 py-2 text-right font-medium">Net</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-t border-zinc-100">
              <th scope="row" className="px-3 py-2 text-left font-medium text-zinc-900">
                {line.displayName}
              </th>
              <td className="px-3 py-2 text-right tabular-nums">{hours ? formatHours(totalHours(line)) : "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.gross)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.net)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-200 bg-zinc-50 font-medium">
            <th scope="row" className="px-3 py-2 text-left">
              {title} total
            </th>
            <td className="px-3 py-2 text-right tabular-nums">{hours ? formatHours(sum(lines, totalHours)) : "—"}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatMoney(sum(lines, (line) => line.gross))}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatMoney(sum(lines, (line) => line.net))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function DetailCard({
  line,
  multiplier,
  locked,
  showMedical,
  showPaye,
  showShortage,
  deductions,
  onChange,
  layout,
}: {
  line: PayRunLineDto;
  multiplier: number;
  locked: boolean;
  showMedical: boolean;
  showPaye: boolean;
  showShortage: boolean;
  deductions: { id: string; label: string; kind: CustomColumnKind }[];
  onChange: (patch: Partial<PayRunLineDto>) => void;
  layout: ColumnLayout;
}) {
  const earnings = line.customColumns.filter((column) => column.kind !== "deduction" && (column.hours !== 0 || column.amount !== 0));
  return (
    <article className="rounded-xl border border-zinc-200 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-zinc-900">{line.displayName}</h3>
        <p className="text-xs uppercase tracking-wide text-zinc-500">{line.payType === "salaried" ? "Salaried" : "Hourly"}</p>
      </header>
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <section>
          <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Hours and earnings</h4>
          <table className="mt-2 w-full text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-1 text-left font-medium"> </th>
                <th className="py-1 text-right font-medium">Hours</th>
                <th className="py-1 text-right font-medium">Rate</th>
                <th className="py-1 text-right font-medium">Pay</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className="py-1 text-left font-medium">
                  {line.payType === "salaried" ? "Salary" : "Basic"}
                </th>
                <td className="py-1 text-right tabular-nums">{line.payType === "salaried" ? "—" : formatHours(line.basicHours)}</td>
                <td className="py-1 text-right tabular-nums">{line.payType === "salaried" ? "—" : formatMoney(line.hourlyRate)}</td>
                <td className="py-1 text-right tabular-nums">{formatMoney(line.payType === "salaried" ? line.salaryAmount : line.basicPay)}</td>
              </tr>
              {line.payType === "hourly" ? (
                <tr>
                  <th scope="row" className="py-1 text-left font-medium">
                    Overtime
                  </th>
                  <td className="py-1 text-right tabular-nums">{formatHours(line.overtimeHours)}</td>
                  <td className="py-1 text-right tabular-nums">{formatMoney(line.hourlyRate * multiplier)}</td>
                  <td className="py-1 text-right tabular-nums">{formatMoney(line.overtimePay)}</td>
                </tr>
              ) : null}
              <tr>
                <th scope="row" className="py-1 text-left font-medium">
                  Extra
                </th>
                <td className="py-1 text-right">—</td>
                <td className="py-1 text-right">—</td>
                <td className="py-1 text-right tabular-nums">{formatMoney(line.extraEarnings)}</td>
              </tr>
              {earnings.map((column) => (
                <tr key={column.id}>
                  <th scope="row" className="py-1 text-left font-medium">
                    {column.label}
                  </th>
                  <td className="py-1 text-right tabular-nums">{column.kind === "hour" ? formatHours(column.hours) : "—"}</td>
                  <td className="py-1 text-right tabular-nums">{column.kind === "hour" ? formatMoney(line.hourlyRate) : "—"}</td>
                  <td className="py-1 text-right tabular-nums">
                    {formatMoney(column.kind === "hour" ? column.hours * line.hourlyRate : column.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Deductions</h4>
          <dl className="mt-2 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt>N.I.C.</dt>
              <dd className="tabular-nums">{formatMoney(line.employeeNic)}</dd>
            </div>
            {showMedical ? (
              <DeductionField label="Medical" value={line.medical} disabled={locked} onChange={(medical) => onChange({ medical })} />
            ) : null}
            {showPaye ? <DeductionField label="P.A.Y.E." value={line.paye} disabled={locked} onChange={(paye) => onChange({ paye })} /> : null}
            <DeductionField
              label="Loan"
              value={line.loanDeduction}
              disabled={locked}
              hint={line.loanRemaining == null ? undefined : `Up to ${formatMoney(line.loanRemaining)}`}
              onChange={(loanDeduction) => onChange({ loanDeduction })}
            />
            {showShortage ? (
              <DeductionField label="Shortage" value={line.shortage} disabled={locked} onChange={(shortage) => onChange({ shortage })} />
            ) : null}
            {deductions.map((column) => {
              const amount = line.customColumns.find((item) => item.id === column.id);
              return (
                <DeductionField
                  key={column.id}
                  label={column.label}
                  value={amount?.amount ?? 0}
                  disabled={locked}
                  onChange={(next) =>
                    onChange({
                      customColumns: layout.custom.map((item) => {
                        const current = line.customColumns.find((entry) => entry.id === item.id);
                        const base = {
                          id: item.id,
                          label: item.label,
                          kind: item.kind,
                          hours: current?.hours ?? 0,
                          amount: current?.amount ?? 0,
                        };
                        return item.id === column.id ? { ...base, amount: next } : base;
                      }),
                    })
                  }
                />
              );
            })}
            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-2 font-medium">
              <dt>Total deductions</dt>
              <dd className="tabular-nums">{formatMoney(line.totalDeductions)}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Net</h4>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-800">{formatMoney(line.net)}</p>
          <p className="mt-2 text-sm text-zinc-600">{payDestination(line)}</p>
        </section>
      </div>
    </article>
  );
}

function DeductionField({
  label,
  value,
  disabled,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  hint?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>
        {label}
        {hint ? <span className="mt-0.5 block text-xs font-normal text-zinc-500">{hint}</span> : null}
      </dt>
      <dd>
        <NumberField label={label} value={value} disabled={disabled} onChange={onChange} />
      </dd>
    </div>
  );
}

function OtherPayments({
  run,
  locked,
  onChange,
  onAdd,
}: {
  run: PayRunDto;
  locked: boolean;
  onChange: (id: string, patch: Partial<ThirdPartyDto>) => void;
  onAdd: () => void;
}) {
  return (
    <section className="mt-8 max-w-xl">
      <h3 className="font-semibold text-zinc-900">Other payments</h3>
      <p className="mt-1 text-sm text-zinc-600">Amounts that are not someone’s net pay. They are added when you print the banking list.</p>
      <ul className="mt-2 space-y-2">
        {run.thirdParty.map((item) => (
          <li key={item.id} className="flex gap-2">
            <input
              aria-label="Payment name"
              className="min-h-11 flex-1 rounded-md border border-zinc-300 px-3 text-sm"
              value={item.label}
              disabled={locked}
              onChange={(event) => onChange(item.id, { label: event.target.value })}
            />
            <NumberField label={`${item.label || "Payment"} amount`} value={item.amount} disabled={locked} onChange={(amount) => onChange(item.id, { amount })} />
          </li>
        ))}
      </ul>
      {locked ? null : (
        <button type="button" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-emerald-800" onClick={onAdd}>
          Add a payment
        </button>
      )}
    </section>
  );
}

function PrintPack({
  run,
  readOnly,
  voidReason,
  setVoidReason,
  onVoid,
}: {
  run: PayRunDto;
  readOnly: boolean;
  voidReason: string;
  setVoidReason: (value: string) => void;
  onVoid: () => void;
}) {
  const docs = [
    ["summary", "Payroll summary", "Hours, gross, and net"],
    ["payslips", "Payslips", "One slip for each person with pay"],
    ["nic", "NIC report", "Employee and employer N.I.C. for the pay month"],
    ["gl", "GL analysis", "Earnings and deductions for the books"],
    ["banking", "Banking list", "Net pay grouped by bank"],
    ["credit-union", "Credit-union letters", "A letter you can send for each union"],
  ] as const;
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-zinc-900">Print</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {docs.map(([doc, label, hint]) => (
          <li key={doc}>
            <Link href={`/payroll/runs/${run.id}/print/${doc}`} className="flex min-h-11 flex-col justify-center rounded-lg border border-zinc-200 px-3 py-2 hover:border-emerald-700">
              <span className="text-sm font-medium text-emerald-800">{label}</span>
              <span className="text-xs text-zinc-500">{hint}</span>
            </Link>
          </li>
        ))}
        <li>
          <a href={`/api/payroll/runs/${run.id}/banking`} className="flex min-h-11 flex-col justify-center rounded-lg border border-zinc-200 px-3 py-2 hover:border-emerald-700">
            <span className="text-sm font-medium text-emerald-800">Download banking list</span>
            <span className="text-xs text-zinc-500">CSV of net pay by bank</span>
          </a>
        </li>
      </ul>
      <p className="mt-3 text-sm text-zinc-500">Print PAYE is not available. P.A.Y.E. on the run is the amount that was typed.</p>
      {run.status === "processed" && !readOnly ? (
        <form
          className="mt-6 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onVoid();
          }}
        >
          <label className="text-sm font-medium text-zinc-800">
            Void reason
            <input className="mt-1 min-h-11 rounded-md border border-zinc-300 px-3" value={voidReason} onChange={(event) => setVoidReason(event.target.value)} required minLength={3} />
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center rounded-lg border border-red-200 px-3 text-sm text-red-800">
            Void this run
          </button>
        </form>
      ) : null}
    </div>
  );
}

function NumberField({
  value,
  disabled,
  onChange,
  label,
  className,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  label: string;
  className?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value === 0 ? "" : String(value));
  return (
    <input
      aria-label={label}
      className={className ?? cell}
      inputMode="decimal"
      disabled={disabled}
      placeholder="0"
      value={shown}
      onFocus={() => setText(value === 0 ? "" : String(value))}
      onBlur={() => setText(null)}
      onChange={(event) => {
        const next = event.target.value;
        if (next !== "" && !/^-?\d*\.?\d*$/.test(next)) return;
        setText(next);
        if (next.trim() === "" || next === "-" || next === "." || next === "-.") {
          onChange(0);
          return;
        }
        const parsed = Number(next);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
    />
  );
}

function payDestination(line: PayRunLineDto): string {
  const name = line.bankName.trim();
  const account = line.bankAccount.trim();
  if (/cheque|check/i.test(name) || (!name && !account)) return "Cheque";
  return [name, account].filter(Boolean).join(" · ");
}

function totalHours(line: PayRunLineDto): number {
  return line.basicHours + line.overtimeHours;
}

function sum(lines: PayRunLineDto[], pick: (line: PayRunLineDto) => number): number {
  return lines.reduce((total, line) => total + pick(line), 0);
}
