import type { PayPeriodDetail } from "./pay-period-db";
import { formatPayPeriodHours, formatPayPeriodRangeLabel, formatReportDateLabel } from "./pay-period-format";
import { payPeriodTotals } from "./pay-period-rows";

function csvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: Array<string | number>): string {
  return cells.map(csvCell).join(",");
}

export function buildPayPeriodCsv(period: PayPeriodDetail): string {
  const totals = payPeriodTotals(period.rows);
  const lines: string[] = [
    csvRow(["Summary Report"]),
    csvRow([period.entityName]),
    csvRow([`Report Date: ${formatReportDateLabel(period.reportDate)}`]),
    csvRow([
      `Period: ${formatPayPeriodRangeLabel(period.startDate, period.endDate)}`,
    ]),
    "",
    csvRow(["Staff", "Trans Ttl", "Vacation", "Sick Days", "Sick Leave", "Shortage"]),
  ];

  for (const row of period.rows) {
    lines.push(
      csvRow([
        row.staffName,
        formatPayPeriodHours(row.transTtl),
        row.vacation,
        row.sickLeaveDays,
        row.sickLeaveRanges,
        row.shortage > 0 ? formatPayPeriodHours(row.shortage) : "",
      ]),
    );
  }

  lines.push(
    csvRow([
      "Total",
      formatPayPeriodHours(totals.transTtl),
      "",
      totals.sickLeaveDays,
      "",
      totals.shortage > 0 ? formatPayPeriodHours(totals.shortage) : "",
    ]),
  );

  if (period.notes.trim()) {
    lines.push("", csvRow(["Notes"]), csvRow([period.notes.trim()]));
  }

  return `${lines.join("\r\n")}\r\n`;
}

export function payPeriodCsvFilename(period: PayPeriodDetail): string {
  return `pay-period-${period.startDate}-to-${period.endDate}.csv`;
}

export function downloadPayPeriodCsv(period: PayPeriodDetail): void {
  const blob = new Blob([buildPayPeriodCsv(period)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = payPeriodCsvFilename(period);
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildPayPeriodWhatsAppMessage(period: PayPeriodDetail): string {
  const totals = payPeriodTotals(period.rows);
  const lines = [
    "Summary Report",
    period.entityName,
    formatPayPeriodRangeLabel(period.startDate, period.endDate),
    `${period.rows.length} staff · ${formatPayPeriodHours(totals.transTtl)} total hours`,
  ];
  if (period.notes.trim()) {
    lines.push("", period.notes.trim());
  }
  return lines.join("\n");
}
