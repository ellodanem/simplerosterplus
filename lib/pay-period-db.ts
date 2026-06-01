import type { PayPeriod } from "@prisma/client";
import { ymdForDbDate } from "./roster-week";
import type { PayPeriodListItem } from "./pay-period-types";
import { parsePayPeriodRows } from "./pay-period-rows";
import type { PayPeriodRow } from "./pay-period-types";

export function payPeriodToYmd(d: Date): string {
  return ymdForDbDate(d);
}

export function serializePayPeriodListItem(p: PayPeriod): PayPeriodListItem {
  const rows = Array.isArray(p.rows) ? p.rows : [];
  return {
    id: p.id,
    startDate: payPeriodToYmd(p.startDate),
    endDate: payPeriodToYmd(p.endDate),
    reportDate: payPeriodToYmd(p.reportDate),
    entityName: p.entityName,
    notes: p.notes,
    emailSentAt: p.emailSentAt ? p.emailSentAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    rowCount: rows.length,
  };
}

export function serializePayPeriodDetail(p: PayPeriod) {
  return {
    ...serializePayPeriodListItem(p),
    rows: parsePayPeriodRows(p.rows),
    rowsBeforeLastEdit: p.rowsBeforeLastEdit
      ? parsePayPeriodRows(p.rowsBeforeLastEdit)
      : null,
  };
}

export type PayPeriodDetail = ReturnType<typeof serializePayPeriodDetail>;

export function rowsFromJson(raw: unknown): PayPeriodRow[] {
  return parsePayPeriodRows(raw);
}
