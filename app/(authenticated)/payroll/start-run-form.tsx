"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { inferPayFrequency, semiMonthlyCycleNumber } from "@/lib/payroll/frequency";
import { FREQUENCY_LABEL } from "@/lib/payroll/frequency";

export type ExtractOption = {
  id: string;
  startDate: string;
  endDate: string;
  rowCount: number;
  latest: boolean;
};

export function StartRunForm({ extracts }: { extracts: ExtractOption[] }) {
  const router = useRouter();
  const [payPeriodId, setPayPeriodId] = useState(extracts[0]?.id ?? "");
  const selected = extracts.find((item) => item.id === payPeriodId) ?? extracts[0];
  const [rangeStart, setRangeStart] = useState(selected?.startDate ?? "");
  const [rangeEnd, setRangeEnd] = useState(selected?.endDate ?? "");
  const [payDate, setPayDate] = useState(selected?.endDate ?? "");
  const [cycleNumber, setCycleNumber] = useState(String(semiMonthlyCycleNumber(selected?.endDate ?? "") ?? ""));
  const [cycleManual, setCycleManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const frequency = useMemo(() => inferPayFrequency(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  function chooseExtract(id: string) {
    const next = extracts.find((item) => item.id === id);
    setPayPeriodId(id);
    if (!next) return;
    setRangeStart(next.startDate);
    setRangeEnd(next.endDate);
    setPayDate(next.endDate);
    setCycleManual(false);
    setCycleNumber(String(semiMonthlyCycleNumber(next.endDate) ?? ""));
  }

  function changeEnd(value: string) {
    setRangeEnd(value);
    if (!cycleManual) setCycleNumber(String(semiMonthlyCycleNumber(value) ?? ""));
  }

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payPeriodId,
          rangeStart,
          rangeEnd,
          payDate,
          cycleNumber: Number(cycleNumber),
          cycleManual,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; run?: { id: string } };
      if (!res.ok || !body.run) {
        setError(body.error || "Could not start the pay run");
        return;
      }
      router.push(`/payroll/runs/${body.run.id}`);
    } finally {
      setPending(false);
    }
  }

  if (extracts.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        Save an attendance extract first. Payroll starts from that extract.
      </p>
    );
  }

  return (
    <form
      className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        void start();
      }}
    >
      <label className="block text-sm font-medium text-zinc-800 sm:col-span-2">
        Hours from attendance
        <select
          className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3"
          value={payPeriodId}
          onChange={(event) => chooseExtract(event.target.value)}
        >
          {extracts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.startDate} – {item.endDate}
              {item.latest ? " (latest)" : ""} · {item.rowCount} people
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-zinc-800">
        Pay range start
        <input
          type="date"
          required
          className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3"
          value={rangeStart}
          onChange={(event) => setRangeStart(event.target.value)}
        />
      </label>
      <label className="block text-sm font-medium text-zinc-800">
        Pay range end
        <input
          type="date"
          required
          className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3"
          value={rangeEnd}
          onChange={(event) => changeEnd(event.target.value)}
        />
      </label>
      <label className="block text-sm font-medium text-zinc-800">
        Pay cycle number
        <input
          inputMode="numeric"
          required
          className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3"
          value={cycleNumber}
          onChange={(event) => {
            setCycleManual(true);
            setCycleNumber(event.target.value);
          }}
        />
      </label>
      <label className="block text-sm font-medium text-zinc-800">
        Pay date
        <input
          type="date"
          required
          className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3"
          value={payDate}
          onChange={(event) => setPayDate(event.target.value)}
        />
      </label>
      <p className="text-sm text-zinc-600 sm:col-span-2">
        This range is {frequency ? FREQUENCY_LABEL[frequency].toLowerCase() : "not a valid range"}. NIC’s monthly cap
        uses the pay date.
      </p>
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-2" role="alert">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending || !frequency}
          className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? "Starting…" : "Start pay run"}
        </button>
      </div>
    </form>
  );
}
