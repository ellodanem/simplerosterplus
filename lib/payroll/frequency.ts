import type { PayFrequency } from "./countries/types";

export function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const month = Number(m[2]);
  const d = Number(m[3]);
  if (month < 1 || month > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, month - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== d) return null;
  return { y, m: month, d };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function inclusiveDays(startYmd: string, endYmd: string): number | null {
  const a = parseYmd(startYmd);
  const b = parseYmd(endYmd);
  if (!a || !b) return null;
  const start = Date.UTC(a.y, a.m - 1, a.d);
  const end = Date.UTC(b.y, b.m - 1, b.d);
  if (end < start) return null;
  return Math.round((end - start) / 86_400_000) + 1;
}

/** Pay frequency implied by a calendar range. See the payroll spec §4. */
export function inferPayFrequency(startYmd: string, endYmd: string): PayFrequency | null {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  const span = inclusiveDays(startYmd, endYmd);
  if (!start || !end || span == null) return null;
  const sameMonth = start.y === end.y && start.m === end.m;
  const last = daysInMonth(end.y, end.m);
  if (sameMonth && start.d === 1 && end.d === 15) return "semimonthly";
  if (sameMonth && start.d === 16 && end.d === last) return "semimonthly";
  if (sameMonth && start.d === 1 && end.d === last) return "monthly";
  if (span <= 8) return "weekly";
  if (span >= 27) return "monthly";
  return "semimonthly";
}

/**
 * Semi-monthly Pay+ style number from the period end.
 * Period 1 is 1–15 January. Period 17 is 1–15 September.
 */
export function semiMonthlyCycleNumber(endYmd: string): number | null {
  const end = parseYmd(endYmd);
  if (!end) return null;
  return (end.m - 1) * 2 + (end.d <= 15 ? 1 : 2);
}

export function payDateMonthKey(payDateYmd: string): string | null {
  const p = parseYmd(payDateYmd);
  if (!p) return null;
  return `${p.y}-${String(p.m).padStart(2, "0")}`;
}

export function payDateYear(payDateYmd: string): number | null {
  return parseYmd(payDateYmd)?.y ?? null;
}

export const FREQUENCY_LABEL: Record<PayFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  semimonthly: "Semi-monthly",
  monthly: "Monthly",
};
