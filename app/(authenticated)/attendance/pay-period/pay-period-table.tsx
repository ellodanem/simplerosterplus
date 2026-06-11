"use client";

import Link from "next/link";
import {
  formatPayPeriodHours,
  formatPeriodBound,
  formatReportDateLabel,
} from "@/lib/pay-period-format";
import type { PayPeriodRow } from "@/lib/pay-period-types";
import { payPeriodTotals } from "@/lib/pay-period-rows";

function formatHours(value: number): string {
  return formatPayPeriodHours(value);
}

function formatPrev(value: string | number): string {
  return String(value);
}

function CellWithPrevious({
  value,
  previous,
  children,
}: {
  value: string | number;
  previous: string | number | undefined;
  children: React.ReactNode;
}) {
  if (previous === undefined || previous === value) {
    return <>{children}</>;
  }
  return (
    <span
      className="border-b border-dotted border-amber-600"
      title={`Previously: ${formatPrev(previous)}`}
    >
      {children}
    </span>
  );
}

export function PayPeriodTable({
  rows,
  previousRows,
  startYmd,
  endYmd,
  locationId,
  editable,
  onRowChange,
}: {
  rows: PayPeriodRow[];
  previousRows?: PayPeriodRow[] | null;
  startYmd: string;
  endYmd: string;
  locationId: string;
  editable: boolean;
  onRowChange?: (index: number, patch: Partial<PayPeriodRow>) => void;
}) {
  const prevByStaff = new Map(
    (previousRows ?? []).map((r) => [r.staffId, r] as const),
  );
  const totals = payPeriodTotals(rows);
  const prevTotals = previousRows ? payPeriodTotals(previousRows) : null;

  return (
    <div className="pay-period-table-wrap overflow-x-auto print:overflow-visible">
      <table className="pay-period-table w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[11%]" />
          <col className="w-[13%]" />
          <col className="w-[9%]" />
          <col className="w-[26%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead>
          <tr className="border-y-2 border-black text-left text-sm font-semibold text-zinc-900 print:border-black">
            <th className="px-2 py-2">Staff</th>
            <th className="whitespace-nowrap px-2 py-2 text-right">Trans Ttl</th>
            <th className="whitespace-nowrap px-2 py-2">Vacation</th>
            <th className="whitespace-nowrap px-2 py-2 text-right">Sick Days</th>
            <th className="whitespace-nowrap px-2 py-2">Sick Leave</th>
            <th className="whitespace-nowrap px-2 py-2 text-right">Shortage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const prev = prevByStaff.get(row.staffId);
            const reportHref = `/attendance/report?staff=${encodeURIComponent(row.staffId)}&start=${startYmd}&end=${endYmd}&location=${encodeURIComponent(locationId)}`;
            return (
              <tr
                key={row.staffId}
                className="border-b border-zinc-200 hover:bg-zinc-50/80 print:border-zinc-300 print:hover:bg-transparent"
              >
                <td className="px-2 py-2 font-medium text-zinc-900">
                  <Link
                    href={reportHref}
                    className="text-emerald-800 hover:underline print:text-inherit print:no-underline"
                  >
                    {row.staffName}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  <CellWithPrevious value={row.transTtl} previous={prev?.transTtl}>
                    {editable ? (
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="pay-period-cell-input w-20 rounded border border-zinc-300 px-2 py-1 text-right text-sm"
                        value={row.transTtl}
                        onChange={(e) =>
                          onRowChange?.(index, { transTtl: Number(e.target.value) || 0 })
                        }
                      />
                    ) : (
                      formatHours(row.transTtl)
                    )}
                  </CellWithPrevious>
                </td>
                <td className="whitespace-nowrap px-2 py-2">
                  <CellWithPrevious value={row.vacation} previous={prev?.vacation}>
                    {editable ? (
                      <input
                        type="text"
                        className="pay-period-cell-input w-24 rounded border border-zinc-300 px-2 py-1 text-sm"
                        value={row.vacation}
                        onChange={(e) => onRowChange?.(index, { vacation: e.target.value })}
                      />
                    ) : (
                      row.vacation
                    )}
                  </CellWithPrevious>
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  <CellWithPrevious value={row.sickLeaveDays} previous={prev?.sickLeaveDays}>
                    {editable ? (
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="pay-period-cell-input w-16 rounded border border-zinc-300 px-2 py-1 text-right text-sm"
                        value={row.sickLeaveDays}
                        onChange={(e) =>
                          onRowChange?.(index, {
                            sickLeaveDays: Math.max(0, Math.round(Number(e.target.value) || 0)),
                          })
                        }
                      />
                    ) : (
                      row.sickLeaveDays
                    )}
                  </CellWithPrevious>
                </td>
                <td className="px-2 py-2 text-zinc-700">
                  <CellWithPrevious
                    value={row.sickLeaveRanges}
                    previous={prev?.sickLeaveRanges}
                  >
                    {editable ? (
                      <input
                        type="text"
                        className="pay-period-cell-input min-w-[10rem] w-full max-w-md rounded border border-zinc-300 px-2 py-1 text-sm"
                        value={row.sickLeaveRanges}
                        onChange={(e) =>
                          onRowChange?.(index, { sickLeaveRanges: e.target.value })
                        }
                      />
                    ) : (
                      row.sickLeaveRanges
                    )}
                  </CellWithPrevious>
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  <CellWithPrevious value={row.shortage} previous={prev?.shortage}>
                    {editable ? (
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="pay-period-cell-input w-20 rounded border border-zinc-300 px-2 py-1 text-right text-sm"
                        value={row.shortage}
                        onChange={(e) =>
                          onRowChange?.(index, { shortage: Number(e.target.value) || 0 })
                        }
                      />
                    ) : (
                      row.shortage > 0 ? formatHours(row.shortage) : ""
                    )}
                  </CellWithPrevious>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-y-2 border-black font-bold text-zinc-900 print:border-black">
            <td className="px-2 py-2">Total</td>
            <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
              <CellWithPrevious value={totals.transTtl} previous={prevTotals?.transTtl}>
                {formatHours(totals.transTtl)}
              </CellWithPrevious>
            </td>
            <td className="px-2 py-2" />
            <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
              <CellWithPrevious
                value={totals.sickLeaveDays}
                previous={prevTotals?.sickLeaveDays}
              >
                {totals.sickLeaveDays}
              </CellWithPrevious>
            </td>
            <td className="px-2 py-2" />
            <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
              {totals.shortage > 0 ? (
                <CellWithPrevious value={totals.shortage} previous={prevTotals?.shortage}>
                  {formatHours(totals.shortage)}
                </CellWithPrevious>
              ) : null}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function PayPeriodPrintHeader({
  reportDate,
  startYmd,
  endYmd,
  entityName,
  notes,
}: {
  reportDate: string;
  startYmd: string;
  endYmd: string;
  entityName: string;
  notes: string;
}) {
  return (
    <header className="pay-period-print-header mb-6 print:mb-8">
      <h2 className="text-center text-xl font-bold tracking-tight text-zinc-900 print:text-2xl">
        Summary Report
      </h2>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-zinc-700 print:text-black">
        <p>Report Date: {formatReportDateLabel(reportDate)}</p>
        <p className="text-right">
          {formatPeriodBound(startYmd, "0:00")} To {formatPeriodBound(endYmd, "23:59")}
        </p>
      </div>
      <p className="mt-3 text-sm font-bold text-zinc-900 print:text-base">{entityName}</p>
      {notes.trim() ? (
        <pre className="mt-4 whitespace-pre-wrap rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 print:mt-6 print:border-0 print:bg-transparent print:p-0 print:text-black">
          {notes}
        </pre>
      ) : null}
    </header>
  );
}
