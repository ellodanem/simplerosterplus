import type { PayPeriodRow } from "./pay-period-types";

export function parsePayPeriodRows(raw: unknown): PayPeriodRow[] {
  if (!Array.isArray(raw)) throw new Error("rows must be an array");
  const out: PayPeriodRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") throw new Error("Invalid row");
    const r = item as Record<string, unknown>;
    const staffId = typeof r.staffId === "string" ? r.staffId : "";
    if (!staffId) throw new Error("Each row needs staffId");
    out.push({
      staffId,
      staffName: typeof r.staffName === "string" ? r.staffName : "",
      transTtl: roundTransTtl(r.transTtl),
      vacation: typeof r.vacation === "string" ? r.vacation : "",
      shortage: roundMoney(r.shortage),
      sickLeaveDays: Math.max(0, Math.round(Number(r.sickLeaveDays) || 0)),
      sickLeaveRanges: typeof r.sickLeaveRanges === "string" ? r.sickLeaveRanges : "",
    });
  }
  return out;
}

export function roundTransTtl(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function roundMoney(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function payPeriodTotals(rows: PayPeriodRow[]): {
  transTtl: number;
  sickLeaveDays: number;
  shortage: number;
} {
  let transTtl = 0;
  let sickLeaveDays = 0;
  let shortage = 0;
  for (const r of rows) {
    transTtl += r.transTtl;
    sickLeaveDays += r.sickLeaveDays;
    shortage += r.shortage;
  }
  return {
    transTtl: roundTransTtl(transTtl),
    sickLeaveDays,
    shortage: roundMoney(shortage),
  };
}

export function rowsEqual(a: PayPeriodRow[], b: PayPeriodRow[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
