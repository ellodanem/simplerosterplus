import type { PayFrequency, PayType } from "./countries/types";
import type { OvertimeRule } from "./countries/types";
import type { CustomColumnAmount } from "./compute-line";
import type { ColumnLayout } from "./columns";
import type { DayHours } from "./overtime";

export type PayrollSettingsDto = {
  enabled: boolean;
  countryCode: string;
  countryName: string;
  overtimeRule: OvertimeRule;
  overtimeMultiplier: number;
  legalName: string;
  addressLine: string;
  phone: string;
  glCentre: string;
  glDepartment: string;
  columnLayout: ColumnLayout;
};

export type PayRunLineDto = {
  id: string;
  staffId: string | null;
  displayName: string;
  nicNumber: string;
  payType: PayType;
  payFrequency: PayFrequency;
  reportOnly: boolean;
  sourceHours: number;
  basicHours: number;
  overtimeHours: number;
  dayBuckets: DayHours[];
  hourlyRate: number;
  salaryAmount: number;
  extraEarnings: number;
  customColumns: CustomColumnAmount[];
  vacationNote: string;
  sickDays: number;
  employeeNic: number;
  employerNic: number;
  loanDeduction: number;
  loanRemaining: number | null;
  medical: number;
  shortage: number;
  paye: number;
  otherDeductions: number;
  basicPay: number;
  overtimePay: number;
  gross: number;
  totalDeductions: number;
  net: number;
  taxCode: string;
  bankName: string;
  bankAccount: string;
  ytdGross: number;
  ytdDeductions: number;
  ytdNet: number;
};

export type ThirdPartyDto = { id: string; label: string; amount: number };

export type PayRunDto = {
  id: string;
  locationId: string;
  locationName: string;
  payPeriodId: string;
  status: "draft" | "processed" | "void";
  frequency: PayFrequency;
  rangeStart: string;
  rangeEnd: string;
  cycleNumber: number;
  cycleManual: boolean;
  payDate: string;
  overtimeRule: OvertimeRule;
  overtimeMultiplier: number;
  approvedAt: string | null;
  voidedAt: string | null;
  voidedByName: string | null;
  voidReason: string | null;
  thirdParty: ThirdPartyDto[];
  lines: PayRunLineDto[];
  totals: {
    gross: number;
    employeeNic: number;
    employerNic: number;
    deductions: number;
    net: number;
  };
};

export type PayRunListItemDto = {
  id: string;
  locationId: string;
  status: PayRunDto["status"];
  frequency: PayFrequency;
  rangeStart: string;
  rangeEnd: string;
  payDate: string;
  cycleNumber: number;
  headcount: number;
  net: number;
  updatedAt: string;
};

export type StaffPayDto = {
  staffId: string;
  name: string;
  locationName: string;
  role: string;
  isActive: boolean;
  isManager: boolean;
  nicNumber: string;
  payFrequency: PayFrequency;
  payType: PayType;
  hourlyRate: number;
  salaryAmount: number;
  taxCode: string;
  medicalAmount: number;
  bankName: string;
  bankAccount: string;
  openLoanAmount: number;
  loan: null | {
    id: string;
    principal: number;
    termCount: number;
    termUnit: "months" | "pays";
    startDate: string;
    status: "active" | "paid";
    remaining: number;
    installment: number;
  };
};
