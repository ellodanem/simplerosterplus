"use client";

import type { PayPeriodListItem } from "@/lib/pay-period-types";
import type { PayPeriodDetail } from "@/lib/pay-period-db";
import { formatPayPeriodRangeLabel } from "@/lib/pay-period-format";
import { PayPeriodPrintHeader, PayPeriodTable } from "./pay-period-table";

const actionBtnBase =
  "rounded-md border px-2.5 py-1 text-sm font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-50";

const actionStyles = {
  view: `${actionBtnBase} border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200`,
  edit: `${actionBtnBase} border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100`,
  print: `${actionBtnBase} border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100`,
  excel: `${actionBtnBase} border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100`,
  email: `${actionBtnBase} border-violet-200 bg-violet-50 text-violet-400`,
  whatsapp: `${actionBtnBase} border-green-400 bg-green-50 text-green-900 hover:bg-green-100`,
} as const;

type Props = {
  periods: PayPeriodListItem[];
  expandedId: string | null;
  expandedDetail: PayPeriodDetail | null;
  locationId: string;
  actionBusyId: string | null;
  onToggleView: (id: string) => void;
  onEdit: (id: string) => void;
  onPrint: (id: string) => void;
  onExcel: (id: string) => void;
  onWhatsApp: (id: string) => void;
};

export function PayPeriodSavedList({
  periods,
  expandedId,
  expandedDetail,
  locationId,
  actionBusyId,
  onToggleView,
  onEdit,
  onPrint,
  onExcel,
  onWhatsApp,
}: Props) {
  if (periods.length === 0) {
    return (
      <p className="mt-2 text-sm text-zinc-500">No saved Extract Pay Period reports yet.</p>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {periods.map((period) => {
        const expanded = expandedId === period.id;
        const busy = actionBusyId === period.id;

        return (
          <li
            key={period.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="font-semibold text-zinc-900">
                  {formatPayPeriodRangeLabel(period.startDate, period.endDate)}
                </p>
                {period.emailSentAt ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    Emailed
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onToggleView(period.id)}
                  className={actionStyles.view}
                >
                  {expanded ? "Hide" : "View"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onEdit(period.id)}
                  className={actionStyles.edit}
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onPrint(period.id)}
                  className={actionStyles.print}
                >
                  Print
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onExcel(period.id)}
                  className={actionStyles.excel}
                >
                  Excel
                </button>
                <button
                  type="button"
                  disabled
                  title="Email with attachment — coming soon"
                  className={actionStyles.email}
                >
                  Email
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onWhatsApp(period.id)}
                  className={actionStyles.whatsapp}
                >
                  WhatsApp
                </button>
              </div>
            </div>

            <p className="mt-1.5 text-xs text-zinc-500">
              Saved {new Date(period.createdAt).toLocaleString()} · {period.rowCount} staff
            </p>

            {expanded && expandedDetail ? (
              <div className="pay-period-print-root mt-4 border-t border-zinc-100 pt-4">
                <PayPeriodPrintHeader
                  reportDate={expandedDetail.reportDate}
                  startYmd={expandedDetail.startDate}
                  endYmd={expandedDetail.endDate}
                  entityName={expandedDetail.entityName}
                  notes={expandedDetail.notes}
                />
                <PayPeriodTable
                  rows={expandedDetail.rows}
                  previousRows={expandedDetail.rowsBeforeLastEdit}
                  startYmd={expandedDetail.startDate}
                  endYmd={expandedDetail.endDate}
                  locationId={locationId}
                  editable={false}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
