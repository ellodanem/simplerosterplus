import { describe, expect, it } from "vitest";
import { placeBank } from "./banks";
import { parseColumnLayout } from "./columns";
import { computeLineMoney } from "./compute-line";
import { SAINT_LUCIA } from "./countries/lc";
import { inferPayFrequency, semiMonthlyCycleNumber } from "./frequency";
import { foldDeductionLabel, foldEarningLabel } from "./gl";
import { loanDeductionThisPay, loanInstallment } from "./loan";
import { roundMoney } from "./money";
import { splitOvertimeHours } from "./overtime";
import { selectPeopleForRun } from "./select-people";

const country = SAINT_LUCIA;

describe("roundMoney", () => {
  it("rounds half away from zero", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(roundMoney(45.8325)).toBe(45.83);
  });
});

describe("pay frequency and cycle", () => {
  it("reads the range the way the spec describes", () => {
    expect(inferPayFrequency("2026-09-01", "2026-09-15")).toBe("semimonthly");
    expect(inferPayFrequency("2026-09-16", "2026-09-30")).toBe("semimonthly");
    expect(inferPayFrequency("2026-09-01", "2026-09-30")).toBe("monthly");
    expect(inferPayFrequency("2026-09-01", "2026-09-07")).toBe("weekly");
    expect(inferPayFrequency("2026-09-01", "2026-09-27")).toBe("monthly");
    expect(inferPayFrequency("2026-09-01", "2026-09-20")).toBe("semimonthly");
  });

  it("numbers semi-monthly cycles from January", () => {
    expect(semiMonthlyCycleNumber("2026-01-15")).toBe(1);
    expect(semiMonthlyCycleNumber("2026-01-31")).toBe(2);
    expect(semiMonthlyCycleNumber("2026-09-15")).toBe(17);
  });
});

describe("overtime split", () => {
  it("keeps every hour basic when the rule is none", () => {
    expect(
      splitOvertimeHours({
        rule: "none",
        extractedHours: 90,
        days: [
          { ymd: "2026-09-01", hours: 10 },
          { ymd: "2026-09-02", hours: 10 },
        ],
        periodDays: 15,
      }),
    ).toEqual({ basicHours: 90, overtimeHours: 0 });
  });

  it("treats hours after 8 in a day as overtime", () => {
    expect(
      splitOvertimeHours({
        rule: "daily",
        extractedHours: 24,
        days: [
          { ymd: "2026-09-01", hours: 9 },
          { ymd: "2026-09-02", hours: 8 },
          { ymd: "2026-09-03", hours: 7 },
        ],
        periodDays: 15,
      }),
    ).toEqual({ basicHours: 23, overtimeHours: 1 });
  });

  it("treats hours after 40 in a week as overtime", () => {
    expect(
      splitOvertimeHours({
        rule: "weekly",
        extractedHours: 50,
        days: [
          { ymd: "2026-09-07", hours: 30 },
          { ymd: "2026-09-08", hours: 20 },
        ],
        periodDays: 7,
      }),
    ).toEqual({ basicHours: 40, overtimeHours: 10 });
  });
});

describe("St. Lucia line money", () => {
  it("matches the spec's NIC example once hours are already split", () => {
    const line = computeLineMoney({
      payType: "hourly",
      basicHours: 86.67,
      overtimeHours: 3.33,
      hourlyRate: 10,
      salaryAmount: 0,
      overtimeMultiplier: 1.5,
      extraEarnings: 0,
      customColumns: [],
      sickColumnVisible: true,
      medical: 20,
      shortage: 0,
      loanDeduction: 0,
      paye: 0,
      otherDeductions: 0,
      nicAlreadyEmployee: 0,
      nicAlreadyEmployer: 0,
      loanRemaining: null,
      country,
    });
    expect(line.basicPay).toBe(866.7);
    expect(line.overtimePay).toBe(49.95);
    expect(line.gross).toBe(916.65);
    expect(line.employeeNic).toBe(45.83);
    expect(line.employerNic).toBe(45.83);
    expect(line.net).toBe(850.82);
  });

  it("keeps charging NIC until the monthly cap is used, then stops", () => {
    const again = computeLineMoney({
      payType: "hourly",
      basicHours: 86.67,
      overtimeHours: 3.33,
      hourlyRate: 10,
      salaryAmount: 0,
      overtimeMultiplier: 1.5,
      extraEarnings: 0,
      customColumns: [],
      sickColumnVisible: true,
      medical: 0,
      shortage: 0,
      loanDeduction: 0,
      paye: 0,
      otherDeductions: 0,
      nicAlreadyEmployee: 45.83,
      nicAlreadyEmployer: 45.83,
      loanRemaining: null,
      country,
    });
    expect(again.employeeNic).toBe(45.83);

    const capped = computeLineMoney({
      ...{
        payType: "hourly" as const,
        basicHours: 86.67,
        overtimeHours: 3.33,
        hourlyRate: 10,
        salaryAmount: 0,
        overtimeMultiplier: 1.5,
        extraEarnings: 0,
        customColumns: [],
        sickColumnVisible: true,
        medical: 0,
        shortage: 0,
        loanDeduction: 0,
        paye: 0,
        otherDeductions: 0,
        loanRemaining: null,
        country,
      },
      nicAlreadyEmployee: 250,
      nicAlreadyEmployer: 250,
    });
    expect(capped.employeeNic).toBe(0);
    expect(capped.employerNic).toBe(0);
  });

  it("pays salaried staff the cycle salary and ignores clock hours", () => {
    const line = computeLineMoney({
      payType: "salaried",
      basicHours: 90,
      overtimeHours: 10,
      hourlyRate: 10,
      salaryAmount: 2000,
      overtimeMultiplier: 1.5,
      extraEarnings: 100,
      customColumns: [],
      sickColumnVisible: true,
      medical: 0,
      shortage: 0,
      loanDeduction: 0,
      paye: 50,
      otherDeductions: 0,
      nicAlreadyEmployee: 0,
      nicAlreadyEmployer: 0,
      loanRemaining: null,
      country,
    });
    expect(line.basicPay).toBe(2000);
    expect(line.overtimePay).toBe(0);
    expect(line.gross).toBe(2100);
    expect(line.net).toBe(roundMoney(2100 - line.employeeNic - 50));
  });

  it("lets net go negative", () => {
    const line = computeLineMoney({
      payType: "hourly",
      basicHours: 1,
      overtimeHours: 0,
      hourlyRate: 10,
      salaryAmount: 0,
      overtimeMultiplier: 1.5,
      extraEarnings: 0,
      customColumns: [],
      sickColumnVisible: true,
      medical: 40,
      shortage: 0,
      loanDeduction: 0,
      paye: 0,
      otherDeductions: 0,
      nicAlreadyEmployee: 0,
      nicAlreadyEmployer: 0,
      loanRemaining: null,
      country,
    });
    expect(line.net).toBeLessThan(0);
  });
});

describe("staff loan", () => {
  it("splits principal across pays and puts leftover cents on the last pay", () => {
    expect(loanInstallment(country, "semimonthly", 1000, 5, "months")).toBe(100);
    expect(loanDeductionThisPay(100, 100.4)).toBe(100.4);
    expect(loanDeductionThisPay(100, 150)).toBe(100);
    expect(loanDeductionThisPay(100, 0.4)).toBe(0.4);
  });
});

describe("who is on the run", () => {
  const directory = [
    { staffId: "a", name: "Ann", isActive: true, isManager: false, payType: "hourly" as const, frequency: "semimonthly" as const, onLocation: true },
    { staffId: "b", name: "Ben", isActive: true, isManager: false, payType: "salaried" as const, frequency: "semimonthly" as const, onLocation: true },
    { staffId: "c", name: "Cara", isActive: true, isManager: true, payType: "salaried" as const, frequency: "semimonthly" as const, onLocation: true },
    { staffId: "d", name: "Dan", isActive: false, isManager: false, payType: "hourly" as const, frequency: "semimonthly" as const, onLocation: true },
    { staffId: "e", name: "Eve", isActive: true, isManager: false, payType: "hourly" as const, frequency: "weekly" as const, onLocation: true },
  ];

  it("adds salaried staff with no hours and keeps a manager only when the extract has them", () => {
    const selected = selectPeopleForRun({
      frequency: "semimonthly",
      directory,
      extract: [
        { staffId: "a", name: "Ann", hours: 80, vacation: "", sickDays: 0, shortage: 0 },
        { staffId: "c", name: "Cara", hours: 10, vacation: "", sickDays: 0, shortage: 0 },
        { staffId: "d", name: "Dan", hours: 8, vacation: "", sickDays: 0, shortage: 0 },
        { staffId: "e", name: "Eve", hours: 40, vacation: "", sickDays: 0, shortage: 0 },
        { staffId: "report-only:x", name: "Rex", hours: 5, vacation: "", sickDays: 0, shortage: 0 },
      ],
    });
    expect(selected.map((p) => p.name)).toEqual(["Ann", "Ben", "Cara", "Dan", "Rex"]);
  });
});

describe("banking and GL labels", () => {
  it("maps St. Lucia banks and credit unions", () => {
    expect(placeBank(country, "Bank of Saint Lucia", "123").code).toBe("BOSL");
    expect(placeBank(country, "1st National Bank", "9").bucket).toBe("STNATIONALBA S/Station");
    expect(placeBank(country, "Laborie Credit Union", "9").code).toBe("LABORIE");
    expect(placeBank(country, "Cheque", "").code).toBe("CHQ");
    expect(placeBank(country, "", "").bucket).toBe("Cheques");
    expect(placeBank(country, "Some Credit Union", "1").bucket).toBe("SOMECREDITUN");
  });

  it("folds known earning and deduction names", () => {
    expect(foldEarningLabel("Commission")).toBe("Commission");
    expect(foldDeductionLabel("PAYE")).toBe("P.A.Y.E.");
    expect(foldDeductionLabel("NIC")).toBe("N.I.S.");
  });

  it("hides shortage until the company shows it", () => {
    expect(parseColumnLayout(null).hiddenBuiltIn).toEqual(["shortage"]);
  });
});
