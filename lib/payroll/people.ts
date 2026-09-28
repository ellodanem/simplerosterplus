import { Prisma, type LoanTermUnit, type PayFrequency, type PayType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { utcDateFromYmd } from "@/lib/datetime-policy";
import { isPayPeriodManager, payPeriodStaffName } from "@/lib/pay-period-roster";
import { ymdForDbDate } from "@/lib/roster-week";
import { PayrollError, type PayrollAccess } from "./access";
import { parseColumnLayout, type ColumnLayout, BUILT_IN_COLUMNS, type BuiltInColumn } from "./columns";
import type { StaffPayDto } from "./dto";
import { loanInstallment } from "./loan";
import { roundMoney } from "./money";
import { clampMultiplier } from "./compute-line";
import { num } from "./parse";
import type { OvertimeRule } from "./countries/types";

function money(value: unknown): number {
  return roundMoney(num(value));
}

export async function listStaffPay(access: PayrollAccess): Promise<StaffPayDto[]> {
  const [staff, takenRows] = await Promise.all([
    prisma.staff.findMany({
      where: { organizationId: access.organizationId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        archivedAt: true,
        location: { select: { name: true } },
        staffRole: { select: { name: true } },
        payProfile: true,
        loans: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.payRunLine.findMany({
      where: { loanDeduction: { gt: 0 }, payRun: { organizationId: access.organizationId, status: "processed" } },
      select: { staffId: true, loanDeduction: true, payRun: { select: { payDate: true } } },
    }),
  ]);

  return staff.map((person) => {
    const profile = person.payProfile;
    const loan = person.loans[0] ?? null;
    const frequency = profile?.payFrequency ?? "semimonthly";
    let loanDto: StaffPayDto["loan"] = null;
    if (loan) {
      const startDate = ymdForDbDate(loan.startDate);
      const principal = money(loan.principal);
      let used = 0;
      for (const row of takenRows) {
        if (row.staffId !== person.id) continue;
        if (ymdForDbDate(row.payRun.payDate) < startDate) continue;
        used = roundMoney(used + money(row.loanDeduction));
      }
      loanDto = {
        id: loan.id,
        principal,
        termCount: loan.termCount,
        termUnit: loan.termUnit,
        startDate,
        status: loan.status,
        remaining: roundMoney(Math.max(0, principal - used)),
        installment: loanInstallment(access.country, frequency, principal, loan.termCount, loan.termUnit),
      };
    }
    return {
      staffId: person.id,
      name: payPeriodStaffName(person.firstName, person.lastName),
      locationName: person.location.name,
      role: person.staffRole?.name || person.role || "",
      isActive: person.isActive && !person.archivedAt,
      isManager: isPayPeriodManager(person.role, person.staffRole?.name ?? null),
      nicNumber: profile?.nicNumber ?? "",
      payFrequency: frequency,
      payType: profile?.payType ?? "hourly",
      hourlyRate: money(profile?.hourlyRate),
      salaryAmount: money(profile?.salaryAmount),
      taxCode: profile?.taxCode ?? "",
      medicalAmount: money(profile?.medicalAmount),
      bankName: profile?.bankName ?? "",
      bankAccount: profile?.bankAccount ?? "",
      openLoanAmount: money(profile?.openLoanAmount),
      loan: loanDto,
    };
  });
}

const FREQUENCIES: PayFrequency[] = ["weekly", "biweekly", "semimonthly", "monthly"];
const PAY_TYPES: PayType[] = ["hourly", "salaried"];

export async function saveStaffPay(
  access: PayrollAccess,
  staffId: string,
  input: {
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
  },
): Promise<void> {
  if (!FREQUENCIES.includes(input.payFrequency) || !PAY_TYPES.includes(input.payType)) {
    throw new PayrollError("Choose a pay frequency and pay type.", 400);
  }
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, organizationId: access.organizationId },
    select: { id: true },
  });
  if (!staff) throw new PayrollError("Staff member not found.", 404);
  const data = {
    nicNumber: input.nicNumber.trim() || null,
    payFrequency: input.payFrequency,
    payType: input.payType,
    hourlyRate: roundMoney(Math.max(0, input.hourlyRate)).toFixed(2),
    salaryAmount: roundMoney(Math.max(0, input.salaryAmount)).toFixed(2),
    taxCode: input.taxCode.trim() || null,
    medicalAmount: roundMoney(Math.max(0, input.medicalAmount)).toFixed(2),
    bankName: input.bankName.trim() || null,
    bankAccount: input.bankAccount.trim() || null,
    openLoanAmount: roundMoney(Math.max(0, input.openLoanAmount)).toFixed(2),
  };
  await prisma.staffPayProfile.upsert({
    where: { staffId },
    create: { organizationId: access.organizationId, staffId, ...data },
    update: data,
  });
}

export async function saveStaffLoan(
  access: PayrollAccess,
  staffId: string,
  input: { principal: number; termCount: number; termUnit: LoanTermUnit; startDate: string },
): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) throw new PayrollError("Enter the first pay date for this loan.", 400);
  if (!Number.isInteger(input.termCount) || input.termCount < 1) {
    throw new PayrollError("Enter the loan term.", 400);
  }
  if (input.termUnit !== "months" && input.termUnit !== "pays") {
    throw new PayrollError("Choose months or pays for the loan term.", 400);
  }
  if (!(input.principal > 0)) throw new PayrollError("Enter the loan principal.", 400);
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, organizationId: access.organizationId },
    select: { id: true },
  });
  if (!staff) throw new PayrollError("Staff member not found.", 404);
  const active = await prisma.staffLoan.findFirst({
    where: { staffId, organizationId: access.organizationId, status: "active" },
  });
  if (active) throw new PayrollError("This person already has an active loan.", 409);
  await prisma.staffLoan.create({
    data: {
      organizationId: access.organizationId,
      staffId,
      principal: roundMoney(input.principal).toFixed(2),
      termCount: input.termCount,
      termUnit: input.termUnit,
      startDate: utcDateFromYmd(input.startDate),
    },
  });
}

export async function updatePayrollSettings(
  access: PayrollAccess,
  input: {
    overtimeRule: OvertimeRule;
    overtimeMultiplier: number;
    legalName: string;
    addressLine: string;
    phone: string;
    glCentre: string;
    glDepartment: string;
    columnLayout: ColumnLayout;
  },
): Promise<void> {
  if (input.overtimeRule !== "none" && input.overtimeRule !== "daily" && input.overtimeRule !== "weekly") {
    throw new PayrollError("Choose an overtime rule.", 400);
  }
  const hidden = input.columnLayout.hiddenBuiltIn.filter((item): item is BuiltInColumn =>
    BUILT_IN_COLUMNS.includes(item),
  );
  const custom = input.columnLayout.custom
    .map((column) => ({
      id: column.id.trim(),
      label: column.label.trim(),
      kind: column.kind,
    }))
    .filter((column) => column.id && column.label && (column.kind === "hour" || column.kind === "money" || column.kind === "deduction"));
  const layout = parseColumnLayout({ hiddenBuiltIn: hidden, custom });
  await prisma.payrollConfig.update({
    where: { organizationId: access.organizationId },
    data: {
      overtimeRule: input.overtimeRule,
      overtimeMultiplier: clampMultiplier(input.overtimeMultiplier).toFixed(2),
      legalName: input.legalName.trim() || null,
      addressLine: input.addressLine.trim() || null,
      phone: input.phone.trim() || null,
      glCentre: input.glCentre.trim() || null,
      glDepartment: input.glDepartment.trim() || null,
      columnLayout: layout as unknown as Prisma.InputJsonValue,
    },
  });
}
