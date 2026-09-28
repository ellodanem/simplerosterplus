import type { PayrollCountry } from "./countries/types";
import type { PayType } from "./countries/types";
import { roundMoney } from "./money";

export type CustomColumnKind = "hour" | "money" | "deduction";

export type CustomColumnAmount = {
  id: string;
  label: string;
  kind: CustomColumnKind;
  hours: number;
  amount: number;
};

export type LineMoneyInput = {
  payType: PayType;
  basicHours: number;
  overtimeHours: number;
  hourlyRate: number;
  salaryAmount: number;
  overtimeMultiplier: number;
  extraEarnings: number;
  customColumns: CustomColumnAmount[];
  /** When true, a custom column named sick is left out of the money. */
  sickColumnVisible: boolean;
  medical: number;
  shortage: number;
  loanDeduction: number;
  paye: number;
  otherDeductions: number;
  nicAlreadyEmployee: number;
  nicAlreadyEmployer: number;
  /** Cap the loan deduction at this remaining balance. Null means open-ended. */
  loanRemaining: number | null;
  country: PayrollCountry;
};

export type LineMoney = {
  basicPay: number;
  overtimePay: number;
  gross: number;
  employeeNic: number;
  employerNic: number;
  loanDeduction: number;
  totalDeductions: number;
  net: number;
};

const SICK_LABEL = /^(sick|sick day|sick days)$/i;

export function isIgnoredCustomColumn(label: string, sickColumnVisible: boolean): boolean {
  const name = label.trim();
  if (name === "__skipSalary") return true;
  if (sickColumnVisible && SICK_LABEL.test(name)) return true;
  return false;
}

function nicOnGross(gross: number, rate: number, already: number, cap: number): number {
  const remaining = roundMoney(Math.max(0, cap - already));
  const raw = roundMoney(gross * rate);
  return roundMoney(Math.min(Math.max(0, raw), remaining));
}

/** Gross, NIC, deductions, and net for one person. Rounded at each step. */
export function computeLineMoney(input: LineMoneyInput): LineMoney {
  const rate = roundMoney(Math.max(0, input.hourlyRate));
  const multiplier = input.overtimeMultiplier;
  let basicPay = 0;
  let overtimePay = 0;
  if (input.payType === "salaried") {
    basicPay = roundMoney(Math.max(0, input.salaryAmount));
    overtimePay = 0;
  } else {
    basicPay = roundMoney(Math.max(0, input.basicHours) * rate);
    overtimePay = roundMoney(Math.max(0, input.overtimeHours) * rate * multiplier);
  }

  let gross = roundMoney(basicPay + overtimePay + roundMoney(input.extraEarnings));
  let customDeductions = 0;
  for (const column of input.customColumns) {
    if (isIgnoredCustomColumn(column.label, input.sickColumnVisible)) continue;
    if (column.kind === "hour") {
      gross = roundMoney(gross + roundMoney(Math.max(0, column.hours) * rate));
    } else if (column.kind === "money") {
      gross = roundMoney(gross + roundMoney(column.amount));
    } else {
      customDeductions = roundMoney(customDeductions + roundMoney(column.amount));
    }
  }

  const employeeNic = nicOnGross(
    gross,
    input.country.employeeNicRate,
    input.nicAlreadyEmployee,
    input.country.nicMonthlyCap,
  );
  const employerNic = nicOnGross(
    gross,
    input.country.employerNicRate,
    input.nicAlreadyEmployer,
    input.country.nicMonthlyCap,
  );

  let loan = roundMoney(Math.max(0, input.loanDeduction));
  if (input.loanRemaining != null) {
    loan = roundMoney(Math.min(loan, Math.max(0, input.loanRemaining)));
  }

  const medical = roundMoney(Math.max(0, input.medical));
  const shortage = roundMoney(Math.max(0, input.shortage));
  const paye = roundMoney(Math.max(0, input.paye));
  const other = roundMoney(Math.max(0, input.otherDeductions));
  const totalDeductions = roundMoney(
    employeeNic + loan + medical + shortage + paye + other + customDeductions,
  );
  const net = roundMoney(gross - totalDeductions);

  return {
    basicPay,
    overtimePay,
    gross,
    employeeNic,
    employerNic,
    loanDeduction: loan,
    totalDeductions,
    net,
  };
}

export function clampMultiplier(value: number): number {
  if (!Number.isFinite(value)) return 1.5;
  const rounded = Math.round(value * 100) / 100;
  return Math.min(3, Math.max(1, rounded));
}
