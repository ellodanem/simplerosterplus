import type { OvertimeRule } from "./countries/types";
import { parseYmd } from "./frequency";
import { roundHours } from "./money";

export type DayHours = { ymd: string; hours: number };

/** Monday of the week containing `ymd`, as YYYY-MM-DD. */
export function weekStartMonday(ymd: string): string | null {
  const p = parseYmd(ymd);
  if (!p) return null;
  const dt = new Date(Date.UTC(p.y, p.m - 1, p.d));
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Split clocked hours into basic and overtime.
 * Day buckets describe the shape. The extracted total is the amount that gets paid,
 * so the split is scaled to that total when the buckets do not add up to it.
 * With no buckets, daily and weekly cannot see the shape, so every hour stays basic
 * except a weekly period of 7 days or fewer, which uses the 40-hour cap on the total.
 */
export function splitOvertimeHours(args: {
  rule: OvertimeRule;
  extractedHours: number;
  days: DayHours[];
  periodDays: number | null;
}): { basicHours: number; overtimeHours: number } {
  const total = roundHours(Math.max(0, args.extractedHours));
  if (args.rule === "none" || total === 0) {
    return { basicHours: total, overtimeHours: 0 };
  }

  const days = args.days.filter((d) => d.hours > 0 && parseYmd(d.ymd));
  if (days.length === 0) {
    if (args.rule === "weekly" && args.periodDays != null && args.periodDays <= 7) {
      const basic = roundHours(Math.min(total, 40));
      return { basicHours: basic, overtimeHours: roundHours(total - basic) };
    }
    return { basicHours: total, overtimeHours: 0 };
  }

  let basic = 0;
  let overtime = 0;
  if (args.rule === "daily") {
    for (const day of days) {
      const hours = roundHours(day.hours);
      const dayBasic = Math.min(hours, 8);
      basic += dayBasic;
      overtime += Math.max(0, hours - 8);
    }
  } else {
    const weeks = new Map<string, number>();
    for (const day of days) {
      const key = weekStartMonday(day.ymd);
      if (!key) continue;
      weeks.set(key, (weeks.get(key) ?? 0) + day.hours);
    }
    for (const hours of weeks.values()) {
      const rounded = roundHours(hours);
      const weekBasic = Math.min(rounded, 40);
      basic += weekBasic;
      overtime += Math.max(0, rounded - 40);
    }
  }

  basic = roundHours(basic);
  overtime = roundHours(overtime);
  const shaped = roundHours(basic + overtime);
  if (shaped <= 0) return { basicHours: total, overtimeHours: 0 };
  if (shaped === total) return { basicHours: basic, overtimeHours: overtime };
  const scaledBasic = roundHours((total * basic) / shaped);
  return { basicHours: scaledBasic, overtimeHours: roundHours(total - scaledBasic) };
}
