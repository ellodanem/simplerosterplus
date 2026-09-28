"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

  useEffect(() => {
    setForm(people.find((person) => person.staffId === staffId) ?? null);
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
            <input className={field} inputMode="decimal" value={form.hourlyRate} disabled={readOnly} onChange={(event) => setForm({ ...form, hourlyRate: Number(event.target.value) })} />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Salary for one cycle
            <input className={field} inputMode="decimal" value={form.salaryAmount} disabled={readOnly} onChange={(event) => setForm({ ...form, salaryAmount: Number(event.target.value) })} />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Medical each run
            <input className={field} inputMode="decimal" value={form.medicalAmount} disabled={readOnly} onChange={(event) => setForm({ ...form, medicalAmount: Number(event.target.value) })} />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Open-ended staff loan
            <input className={field} inputMode="decimal" value={form.openLoanAmount} disabled={readOnly} onChange={(event) => setForm({ ...form, openLoanAmount: Number(event.target.value) })} />
          </label>
          <label className="text-sm font-medium text-zinc-800">
            Bank
            <input className={field} value={form.bankName} disabled={readOnly} onChange={(event) => setForm({ ...form, bankName: event.target.value })} />
          </label>
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
