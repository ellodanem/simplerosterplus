"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/payroll/format";
import { FREQUENCY_LABEL } from "@/lib/payroll/frequency";
import type { PayRunListItemDto } from "@/lib/payroll/dto";
import { PayrollLinks } from "./payroll-links";
import { StartRunForm, type ExtractOption } from "./start-run-form";

type Filter = "all" | PayRunListItemDto["status"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function PayRunsScreen({
  orgName,
  locationName,
  countryName,
  locations,
  currentLocationId,
  runs,
  extracts,
  attendanceHref,
}: {
  orgName: string;
  locationName: string;
  countryName: string;
  locations: { id: string; name: string }[];
  currentLocationId: string;
  runs: PayRunListItemDto[];
  extracts: ExtractOption[];
  attendanceHref: string;
}) {
  const [starting, setStarting] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const visible = runs.filter((run) => filter === "all" || run.status === filter);
  const drafts = runs.filter((run) => run.status === "draft").length;
  const approved = runs.filter((run) => run.status === "processed").length;
  const voided = runs.filter((run) => run.status === "void").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Payroll</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {orgName} · {locationName} · {countryName}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
          aria-expanded={starting}
          onClick={() => setStarting((open) => !open)}
        >
          {starting ? "Close" : "Start pay run"}
        </button>
      </div>

      {locations.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {locations.map((item) => (
            <Link
              key={item.id}
              href={`/payroll?location=${encodeURIComponent(item.id)}`}
              className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm ${
                item.id === currentLocationId ? "bg-emerald-50 font-medium text-emerald-900" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-4">
        <PayrollLinks current="runs" />
      </div>

      {starting ? (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">Start a pay run</h2>
          <StartRunForm extracts={extracts} />
          <p className="mt-2 text-sm">
            <Link href={attendanceHref} className="font-medium text-emerald-800 hover:text-emerald-950">
              Open attendance extracts
            </Link>
          </p>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter pay runs">
        <CountChip label="All" count={runs.length} dot="bg-zinc-400" countClass="text-zinc-500" active={filter === "all"} activeClass="border-zinc-400 bg-zinc-50" onClick={() => setFilter("all")} />
        <CountChip label="Drafts" count={drafts} dot="bg-amber-600" countClass="text-amber-700" active={filter === "draft"} activeClass="border-amber-600 bg-amber-50" onClick={() => setFilter("draft")} />
        <CountChip label="Approved" count={approved} dot="bg-emerald-700" countClass="text-emerald-700" active={filter === "processed"} activeClass="border-emerald-700 bg-emerald-50" onClick={() => setFilter("processed")} />
        <CountChip label="Voided" count={voided} dot="bg-red-600" countClass="text-red-600" active={filter === "void"} activeClass="border-red-600 bg-red-50" onClick={() => setFilter("void")} />
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">
          {runs.length === 0 ? "No pay runs for this location yet." : "No pay runs in this filter."}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="px-3 py-2 font-medium">Period</th>
                <th className="px-3 py-2 font-medium">Pay date</th>
                <th className="px-3 py-2 text-right font-medium">People</th>
                <th className="px-3 py-2 text-right font-medium">Net</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((run) => (
                <tr key={run.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">
                    <Link href={`/payroll/runs/${run.id}`} className="font-semibold text-emerald-800 hover:text-emerald-950">
                      {formatYmd(run.rangeStart)} – {formatYmd(run.rangeEnd)}
                    </Link>
                    <div className="text-xs text-zinc-500">
                      {FREQUENCY_LABEL[run.frequency]} · cycle {run.cycleNumber}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-zinc-800">{formatYmd(run.payDate)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{run.headcount}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-900">{formatMoney(run.net)}</td>
                  <td className="px-3 py-2">
                    {run.status === "draft" ? (
                      <Link
                        href={`/payroll/runs/${run.id}`}
                        className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
                      >
                        Continue
                      </Link>
                    ) : run.status === "processed" ? (
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <span className="size-2 rounded-full bg-emerald-700" aria-hidden="true" />
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-600">
                        <span className="size-2 rounded-full bg-red-600" aria-hidden="true" />
                        Voided
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CountChip({
  label,
  count,
  dot,
  countClass,
  active,
  activeClass,
  onClick,
}: {
  label: string;
  count: number;
  dot: string;
  countClass: string;
  active: boolean;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm text-zinc-900 ${
        active ? activeClass : "border-zinc-200 bg-white hover:bg-zinc-50"
      }`}
    >
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
      <span className={`font-semibold ${countClass}`}>{count}</span>
    </button>
  );
}

function formatYmd(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return ymd;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return ymd;
  return `${Number(match[3])} ${month} ${match[1]}`;
}
