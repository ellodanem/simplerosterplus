"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isListedBank, OTHER_BANK, SAINT_LUCIA_BANKS } from "@/lib/payroll/bank-picker";
import type { StaffPayDto } from "@/lib/payroll/dto";
import { formatMoney } from "@/lib/payroll/format";
import { FREQUENCY_LABEL } from "@/lib/payroll/frequency";

const field = "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm";

export function PeopleEditor({ people, readOnly }: { people: StaffPayDto[]; readOnly: boolean }) {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);
  const visible = people.filter((person) => showInactive || person.isActive);
  const [staffId, setStaffId] = useState(visible[0]?.staffId ?? "");
  const selected = people.find((person) => person.staffId === staffId) ?? null;
  const [form, setForm] = useState<StaffPayDto | null>(selected);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loan, setLoan] = useState({ principal: "", termCount: "10", termUnit: "months", startDate: "" });
  const [otherOpen, setOtherOpen] = useState(false);
  const otherBankRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(people.find((person) => person.staffId === staffId) ?? null);
    setOtherOpen(false);
  }, [people, staffId]);

  function choose(id: string) {
    setStaffId(id);
    setForm(people.find((person) => person.staffId === id) ?? null);
    setError(null);
  }

  async function saveProfile() {
    if (!form) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/payroll/people/${form.staffId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error || "Could not save");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function addLoan() {
    if (!form) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/payroll/people/${form.staffId}/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principal: Number(loan.principal),
          termCount: Number(loan.termCount),
          termUnit: loan.termUnit,
          startDate: loan.startDate,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error || "Could not add the loan");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
          Show people who have left
        </label>
        <ul className="mt-3 max-h-[32rem] overflow-auto rounded-xl border border-zinc-200">
          {visible.map((person) => (
            <li key={person.staffId}>
              <button
                type="button"
                onClick={() => choose(person.staffId)}
                className={`flex min-h-11 w-full items-center px-3 text-left text-sm ${
                  person.staffId === staffId ? "bg-emerald-50 font-medium text-emerald-900" : "hover:bg-zinc-50"
                }`}
              >
                {person.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {form ? (
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void saveProfile();
          }}
        >
          <p className="text-sm text-zinc-600 sm:col-span-2">
            {form.locationName}
            {form.role ? ` · ${form.role}` : ""}
            {form.isManager ? " · Manager" : ""}
          </p>
          <label className="text-sm font-medium text-zinc-800">
            NIC number
            <input className={field} value={form.nicNumber} disabled={readOnly} onChange={(event) => setForm({ ...form, nicNumber: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Tax code
            <input className={field} value={form.taxCode} disabled={readOnly} onChange={(event) => setForm({ ...form, taxCode: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Pay frequency
            <select
              className={field}
              value={form.payFrequency}
              disabled={readOnly}
              onChange={(event) => setForm({ ...form, payFrequency: event.target.value as StaffPayDto["payFrequency"] })}
            >
              {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Pay type
            <select
              className={field}
              value={form.payType}
              disabled={readOnly}
              onChange={(event) => setForm({ ...form, payType: event.target.value as StaffPayDto["payType"] })}
            >
              <option value="hourly">Hourly</option>
              <option value="salaried">Salaried</option>
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Hourly rate
            <MoneyField
              key={`${form.staffId}-hourly`}
              value={form.hourlyRate}
              disabled={readOnly}
              onChange={(hourlyRate) => setForm({ ...form, hourlyRate })}
            />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Salary for one cycle
            <MoneyField
              key={`${form.staffId}-salary`}
              value={form.salaryAmount}
              disabled={readOnly}
              onChange={(salaryAmount) => setForm({ ...form, salaryAmount })}
            />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Medical each run
            <MoneyField
              key={`${form.staffId}-medical`}
              value={form.medicalAmount}
              disabled={readOnly}
              onChange={(medicalAmount) => setForm({ ...form, medicalAmount })}
            />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Open-ended staff loan
            <MoneyField
              key={`${form.staffId}-loan`}
              value={form.openLoanAmount}
              disabled={readOnly}
              onChange={(openLoanAmount) => setForm({ ...form, openLoanAmount })}
            />
          </label>
          <div className="text-sm font-medium text-zinc-800">
            <label htmlFor={`pay-bank-${form.staffId}`}>Bank</label>
            <select
              id={`pay-bank-${form.staffId}`}
              className={field}
              value={bankSelectValue(form.bankName, otherOpen)}
              disabled={readOnly}
              onChange={(event) => {
                const value = event.target.value;
                if (value === OTHER_BANK) {
                  setOtherOpen(true);
                  if (isListedBank(form.bankName)) setForm({ ...form, bankName: "" });
                  requestAnimationFrame(() => otherBankRef.current?.focus());
                  return;
                }
                setOtherOpen(false);
                setForm({ ...form, bankName: value });
              }}
            >
              <option value="">No bank yet</option>
              {SAINT_LUCIA_BANKS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.banks.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={OTHER_BANK}>Other…</option>
            </select>
            {showOtherBank(form.bankName, otherOpen) ? (
              <>
                <label htmlFor={`pay-bank-other-${form.staffId}`} className="mt-3 block">
                  Other bank name
                </label>
                <input
                  ref={otherBankRef}
                  id={`pay-bank-other-${form.staffId}`}
                  className={field}
                  value={form.bankName}
                  disabled={readOnly}
                  onChange={(event) => setForm({ ...form, bankName: event.target.value })}
                />
              </>
            ) : null}
          </div>
          <label className="text-sm font-medium text-zinc-800">
            Account
            <input className={field} value={form.bankAccount} disabled={readOnly} onChange={(event) => setForm({ ...form, bankAccount: event.target.value })} />
          </label>
          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-2" role="alert">
              {error}
            </p>
          ) : null}
          {readOnly ? null : (
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                {pending ? "Saving…" : "Save pay details"}
              </button>
            </div>
          )}

          <div className="rounded-xl border border-zinc-200 p-4 sm:col-span-2">
            <h2 className="font-semibold text-zinc-900">Staff loan</h2>
            {form.loan ? (
              <p className="mt-2 text-sm text-zinc-700">
                {form.loan.status === "paid" ? "Paid" : "Active"} · principal {formatMoney(form.loan.principal)} · remaining{" "}
                {formatMoney(form.loan.remaining)} · installment {formatMoney(form.loan.installment)} · starts {form.loan.startDate}
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">No loan on file. The open-ended amount is used when this is empty.</p>
            )}
            {readOnly || form.loan?.status === "active" ? null : (
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <input className={field} placeholder="Principal" inputMode="decimal" value={loan.principal} onChange={(event) => setLoan({ ...loan, principal: event.target.value })} />
                <input className={field} placeholder="Term" inputMode="numeric" value={loan.termCount} onChange={(event) => setLoan({ ...loan, termCount: event.target.value })} />
                <select className={field} value={loan.termUnit} onChange={(event) => setLoan({ ...loan, termUnit: event.target.value })}>
                  <option value="months">Months</option>
                  <option value="pays">Pays</option>
                </select>
                <input className={field} type="date" value={loan.startDate} onChange={(event) => setLoan({ ...loan, startDate: event.target.value })} />
                <button type="button" onClick={() => void addLoan()} disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60">
                  Add loan
                </button>
              </div>
            )}
          </div>
        </form>
      ) : (
        <p className="text-sm text-zinc-600">No one to show.</p>
      )}
    </div>
  );
}

function MoneyField({ value, disabled, onChange }: { value: number; disabled: boolean; onChange: (value: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? String(value);
  return (
    <input
      className={field}
      inputMode="decimal"
      disabled={disabled}
      value={shown}
      onFocus={() => setText(String(value))}
      onBlur={() => setText(null)}
      onChange={(event) => {
        const next = event.target.value;
        if (next !== "" && !/^\d*\.?\d*$/.test(next)) return;
        setText(next);
        if (next === "" || next === ".") {
          onChange(0);
          return;
        }
        const parsed = Number(next);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
    />
  );
}

function showOtherBank(name: string, otherOpen: boolean): boolean {
  if (isListedBank(name)) return false;
  return otherOpen || name.trim() !== "";
}

function bankSelectValue(name: string, otherOpen: boolean): string {
  if (isListedBank(name)) return name;
  if (showOtherBank(name, otherOpen)) return OTHER_BANK;
  return "";
}
