import { utcDateFromYmd } from "./datetime-policy";

const REPORT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const PERIOD_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const RANGE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function formatReportDateLabel(ymd: string): string {
  return REPORT_DATE_FORMAT.format(utcDateFromYmd(ymd));
}

export function formatPeriodBound(ymd: string, time: string): string {
  return `${PERIOD_DATE_FORMAT.format(utcDateFromYmd(ymd))} ${time}`;
}

export function formatPayPeriodRangeLabel(startYmd: string, endYmd: string): string {
  const start = RANGE_DATE_FORMAT.format(utcDateFromYmd(startYmd));
  const end = RANGE_DATE_FORMAT.format(utcDateFromYmd(endYmd));
  return `${start} – ${end}`;
}

/** Trim trailing zeros while keeping up to 2 decimal places (e.g. 673.70 → 673.7). */
export function formatPayPeriodHours(value: number): string {
  return String(parseFloat(value.toFixed(2)));
}
