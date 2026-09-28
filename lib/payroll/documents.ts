import type { PayrollCountry } from "./countries/types";
import type { PayRunDto, PayRunLineDto } from "./dto";
import { placeBank } from "./banks";
import { addGlAmount, foldDeductionLabel, foldEarningLabel, type GlSide } from "./gl";
import { roundMoney } from "./money";
import { isIgnoredCustomColumn } from "./compute-line";

function counted(run: PayRunDto): PayRunLineDto[] {
  return run.lines.filter((line) => line.displayName !== "__skipSalary");
}

export function payslipLines(run: PayRunDto): PayRunLineDto[] {
  return counted(run).filter(
    (line) =>
      line.gross !== 0 ||
      line.net !== 0 ||
      line.totalDeductions !== 0 ||
      line.basicPay !== 0 ||
      line.overtimePay !== 0 ||
      line.extraEarnings !== 0,
  );
}

export type BankRow = {
  name: string;
  code: string;
  bucket: string;
  account: string;
  net: number;
  unionCode: string | null;
};

export function bankingList(run: PayRunDto, country: PayrollCountry): { rows: BankRow[]; buckets: { bucket: string; total: number }[]; total: number } {
  const rows = counted(run)
    .map((line) => {
      const place = placeBank(country, line.bankName, line.bankAccount);
      const cheque = place.code === "CHQ";
      return {
        name: line.displayName,
        code: place.code,
        bucket: place.bucket,
        account: cheque ? "" : line.bankAccount,
        net: line.net,
        unionCode: place.creditUnion?.code ?? (place.bucket === place.code ? place.code : null),
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));

  const bucketMap = new Map<string, number>();
  for (const row of rows) bucketMap.set(row.bucket, roundMoney((bucketMap.get(row.bucket) ?? 0) + row.net));
  const buckets = [...bucketMap.entries()].map(([bucket, total]) => ({ bucket, total }));
  const total = roundMoney(rows.reduce((sum, row) => sum + row.net, 0));
  return { rows, buckets, total };
}

export function bankingCsv(rows: BankRow[]): string {
  const header = ["Code", "Name", "Account", "Net"];
  const body = rows.map((row) => [row.code, row.name, row.account, row.net.toFixed(2)]);
  return [header, ...body]
    .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
}

export function glStatement(run: PayRunDto): { earnings: GlSide[]; deductions: GlSide[]; employerNic: number } {
  const earnings: GlSide[] = [];
  const deductions: GlSide[] = [];
  let employerNic = 0;
  for (const line of counted(run)) {
    addGlAmount(earnings, "Basic", line.basicPay);
    addGlAmount(earnings, "Overtime", line.overtimePay);
    addGlAmount(earnings, foldEarningLabel("Extra"), line.extraEarnings);
    for (const column of line.customColumns) {
      if (isIgnoredCustomColumn(column.label, true)) continue;
      if (column.kind === "hour") addGlAmount(earnings, foldEarningLabel(column.label), roundMoney(column.hours * line.hourlyRate));
      if (column.kind === "money") addGlAmount(earnings, foldEarningLabel(column.label), column.amount);
      if (column.kind === "deduction") addGlAmount(deductions, foldDeductionLabel(column.label), column.amount);
    }
    addGlAmount(deductions, "P.A.Y.E.", line.paye);
    addGlAmount(deductions, "N.I.S.", line.employeeNic);
    addGlAmount(deductions, "Staff Loan", line.loanDeduction);
    addGlAmount(deductions, "Medical Insurance", line.medical);
    addGlAmount(deductions, "Shortage", line.shortage);
    addGlAmount(deductions, "Other", line.otherDeductions);
    employerNic = roundMoney(employerNic + line.employerNic);
  }
  return { earnings, deductions, employerNic };
}

export type CreditUnionLetter = {
  code: string;
  address: string;
  settlementBank: string;
  settlementAccount: string;
  members: { name: string; net: number }[];
  total: number;
};

export function creditUnionLetters(run: PayRunDto, country: PayrollCountry): CreditUnionLetter[] {
  const groups = new Map<string, CreditUnionLetter>();
  for (const line of counted(run)) {
    const place = placeBank(country, line.bankName, line.bankAccount);
    if (!place.creditUnion && place.bucket !== place.code) continue;
    if (place.code === "CHQ" || place.bucket.endsWith("S/Station")) continue;
    const code = place.creditUnion?.code ?? place.code;
    const letter = groups.get(code) ?? {
      code,
      address: place.creditUnion?.address ?? "",
      settlementBank: place.creditUnion?.settlementBank ?? "",
      settlementAccount: place.creditUnion?.settlementAccount ?? "",
      members: [],
      total: 0,
    };
    letter.members.push({ name: line.displayName, net: line.net });
    letter.total = roundMoney(letter.total + line.net);
    groups.set(code, letter);
  }
  return [...groups.values()];
}
