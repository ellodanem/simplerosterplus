"use client";

import Link from "next/link";
import type { PayPeriodRow } from "@/lib/pay-period-types";
import { payPeriodTotals } from "@/lib/pay-period-rows";

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
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <th className="px-3 py-2">Staff</th>
            <th className="px-3 py-2 text-right">Trans Ttl</th>
            <th className="px-3 py-2">Vacation</th>
            <th className="px-3 py-2 text-right">Sick days</th>
            <th className="px-3 py-2">Sick leave</th>
            <th className="px-3 py-2 text-right">Shortage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const prev = prevByStaff.get(row.staffId);
            const reportHref = `/attendance/report?staff=${encodeURIComponent(row.staffId)}&start=${startYmd}&end=${endYmd}&location=${encodeURIComponent(locationId)}`;
            return (
              <tr key={row.staffId} className="border-b border-zinc-100 hover:bg-zinc-50/80">
                <td className="px-3 py-2 font-medium text-zinc-900">
                  <Link href={reportHref} className="text-emerald-800 hover:underline">
                    {row.staffName}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <CellWithPrevious value={row.transTtl} previous={prev?.transTtl}>
                    {editable ? (
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="w-20 rounded border border-zinc-300 px-2 py-1 text-right text-sm"
                        value={row.transTtl}
                        onChange={(e) =>
                          onRowChange?.(index, { transTtl: Number(e.target.value) || 0 })
                        }
                      />
                    ) : (
                      row.transTtl.toFixed(2)
                    )}
                  </CellWithPrevious>
                </td>
                <td className="px-3 py-2">
                  <CellWithPrevious value={row.vacation} previous={prev?.vacation}>
                    {editable ? (
                      <input
                        type="text"
                        className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm"
                        value={row.vacation}
                        onChange={(e) => onRowChange?.(index, { vacation: e.target.value })}
                      />
                    ) : (
                      row.vacation || "—"
                    )}
                  </CellWithPrevious>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <CellWithPrevious value={row.sickLeaveDays} previous={prev?.sickLeaveDays}>
                    {editable ? (
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="w-16 rounded border border-zinc-300 px-2 py-1 text-right text-sm"
                        value={row.sickLeaveDays}
                        onChange={(e) =>
                          onRowChange?.(index, {
                            sickLeaveDays: Math.max(0, Math.round(Number(e.target.value) || 0)),
                          })
                        }
                      />
                    ) : (
                      row.sickLeaveDays || "—"
                    )}
                  </CellWithPrevious>
                </td>
                <td className="px-3 py-2 text-zinc-700">
                  <CellWithPrevious
                    value={row.sickLeaveRanges}
                    previous={prev?.sickLeaveRanges}
                  >
                    {editable ? (
                      <input
                        type="text"
                        className="min-w-[10rem] w-full max-w-md rounded border border-zinc-300 px-2 py-1 text-sm"
                        value={row.sickLeaveRanges}
                        onChange={(e) =>
                          onRowChange?.(index, { sickLeaveRanges: e.target.value })
                        }
                      />
                    ) : (
                      row.sickLeaveRanges || "—"
                    )}
                  </CellWithPrevious>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <CellWithPrevious value={row.shortage} previous={prev?.shortage}>
                    {editable ? (
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="w-20 rounded border border-zinc-300 px-2 py-1 text-right text-sm"
                        value={row.shortage}
                        onChange={(e) =>
                          onRowChange?.(index, { shortage: Number(e.target.value) || 0 })
                        }
                      />
                    ) : (
                      row.shortage > 0 ? row.shortage.toFixed(2) : "—"
                    )}
                  </CellWithPrevious>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold">
            <td className="px-3 py-2">Totals</td>
            <td className="px-3 py-2 text-right tabular-nums">
              <CellWithPrevious value={totals.transTtl} previous={prevTotals?.transTtl}>
                {totals.transTtl.toFixed(2)}
              </CellWithPrevious>
            </td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right tabular-nums">
              <CellWithPrevious
                value={totals.sickLeaveDays}
                previous={prevTotals?.sickLeaveDays}
              >
                {totals.sickLeaveDays}
              </CellWithPrevious>
            </td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right tabular-nums">
              {totals.shortage > 0 ? (
                <CellWithPrevious value={totals.shortage} previous={prevTotals?.shortage}>
                  {totals.shortage.toFixed(2)}
                </CellWithPrevious>
              ) : (
                "—"
              )}
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
    <div className="mb-4">
      <h2 className="text-lg font-semibold">Summary Report</h2>
      <p className="text-sm text-zinc-700">Report date: {reportDate}</p>
      <p className="text-sm text-zinc-700">
        Period: {startYmd} 0:00 – {endYmd} 23:59
      </p>
      <p className="text-sm text-zinc-700">{entityName}</p>
      {notes.trim() ? (
        <pre className="mt-3 whitespace-pre-wrap rounded border border-zinc-200 bg-zinc-50 p-3 text-sm">
          {notes}
        </pre>
      ) : null}
    </div>
  );
}
