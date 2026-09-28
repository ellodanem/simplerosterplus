import { Prisma, type PayFrequency, type PayRun, type PayRunLine, type PayType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { utcDateFromYmd } from "@/lib/datetime-policy";
import { endOfLocalDayUtc, startOfLocalDayUtc } from "@/lib/datetime-policy";
import { parsePayPeriodRows } from "@/lib/pay-period-rows";
import { payPeriodStaffName, isPayPeriodManager } from "@/lib/pay-period-roster";
import { ymdForDbDate } from "@/lib/roster-week";
import { PayrollError, type PayrollAccess } from "./access";
import { columnVisible, type ColumnLayout } from "./columns";
import { computeLineMoney, type CustomColumnAmount } from "./compute-line";
import { dayHoursFromPunches } from "./day-hours";
import type { PayRunDto, PayRunLineDto, PayRunListItemDto, ThirdPartyDto } from "./dto";
import {
  daysInMonth,
  inclusiveDays,
  inferPayFrequency,
  parseYmd,
  payDateMonthKey,
  payDateYear,
} from "./frequency";
import { loanDeductionThisPay, loanInstallment } from "./loan";
import { roundHours, roundMoney } from "./money";
import { splitOvertimeHours, type DayHours } from "./overtime";
import { layoutFromConfig, num, parseCustomAmounts, parseDayBuckets, parseThirdParty } from "./parse";
import { selectPeopleForRun } from "./select-people";

type RunWithLines = PayRun & {
  lines: PayRunLine[];
  location: { name: string };
};

type HistoryLine = {
  staffId: string | null;
  employeeNic: number;
  employerNic: number;
  loanDeduction: number;
  gross: number;
  totalDeductions: number;
  net: number;
  payDate: string;
};

function money(value: unknown): number {
  return roundMoney(num(value));
}

function hours(value: unknown): number {
  return roundHours(num(value));
}

function dec(value: number): string {
  return roundMoney(value).toFixed(2);
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function assertCycle(cycleNumber: number) {
  if (!Number.isInteger(cycleNumber) || cycleNumber < 1 || cycleNumber > 53) {
    throw new PayrollError("Pay cycle must be a number from 1 to 53.", 400);
  }
}

function monthBounds(payDateYmd: string): { start: Date; end: Date } | null {
  const parsed = parseYmd(payDateYmd);
  if (!parsed) return null;
  const month = String(parsed.m).padStart(2, "0");
  const last = String(daysInMonth(parsed.y, parsed.m)).padStart(2, "0");
  return {
    start: utcDateFromYmd(`${parsed.y}-${month}-01`),
    end: utcDateFromYmd(`${parsed.y}-${month}-${last}`),
  };
}

async function loadHistory(organizationId: string, payDateYmd: string, excludeRunId?: string): Promise<HistoryLine[]> {
  const year = payDateYear(payDateYmd);
  if (!year) return [];
  const rows = await prisma.payRunLine.findMany({
    where: {
      payRun: {
        organizationId,
        status: "processed",
        ...(excludeRunId ? { id: { not: excludeRunId } } : {}),
        payDate: {
          gte: utcDateFromYmd(`${year}-01-01`),
          lte: utcDateFromYmd(`${year}-12-31`),
        },
      },
    },
    select: {
      staffId: true,
      employeeNic: true,
      employerNic: true,
      loanDeduction: true,
      gross: true,
      totalDeductions: true,
      net: true,
      payRun: { select: { payDate: true } },
    },
  });
  return rows.map((row) => ({
    staffId: row.staffId,
    employeeNic: money(row.employeeNic),
    employerNic: money(row.employerNic),
    loanDeduction: money(row.loanDeduction),
    gross: money(row.gross),
    totalDeductions: money(row.totalDeductions),
    net: money(row.net),
    payDate: ymdForDbDate(row.payRun.payDate),
  }));
}

async function loadLoanTaken(organizationId: string): Promise<{ staffId: string; amount: number; payDate: string }[]> {
  const rows = await prisma.payRunLine.findMany({
    where: {
      loanDeduction: { gt: 0 },
      payRun: { organizationId, status: "processed" },
    },
    select: {
      staffId: true,
      loanDeduction: true,
      payRun: { select: { payDate: true } },
    },
  });
  return rows.flatMap((row) =>
    row.staffId
      ? [{ staffId: row.staffId, amount: money(row.loanDeduction), payDate: ymdForDbDate(row.payRun.payDate) }]
      : [],
  );
}

function nicAlready(history: HistoryLine[], staffId: string | null, payDateYmd: string) {
  const month = payDateMonthKey(payDateYmd);
  let employee = 0;
  let employer = 0;
  if (!staffId || !month) return { employee, employer };
  for (const row of history) {
    if (row.staffId !== staffId || !row.payDate.startsWith(month)) continue;
    employee = roundMoney(employee + row.employeeNic);
    employer = roundMoney(employer + row.employerNic);
  }
  return { employee, employer };
}

function ytdBefore(history: HistoryLine[], staffId: string | null, payDateYmd: string) {
  let gross = 0;
  let deductions = 0;
  let net = 0;
  if (!staffId) return { gross, deductions, net };
  for (const row of history) {
    if (row.staffId !== staffId || row.payDate > payDateYmd) continue;
    gross = roundMoney(gross + row.gross);
    deductions = roundMoney(deductions + row.totalDeductions);
    net = roundMoney(net + row.net);
  }
  return { gross, deductions, net };
}

function loanRemainingFor(
  taken: { staffId: string; amount: number; payDate: string }[],
  staffId: string,
  startDate: string,
  principal: number,
): number {
  let used = 0;
  for (const row of taken) {
    if (row.staffId !== staffId || row.payDate < startDate) continue;
    used = roundMoney(used + row.amount);
  }
  return roundMoney(Math.max(0, principal - used));
}

type StaffSnap = {
  staffId: string;
  name: string;
  onLocation: boolean;
  isActive: boolean;
  isManager: boolean;
  payType: PayType;
  frequency: PayFrequency;
  nicNumber: string;
  hourlyRate: number;
  salaryAmount: number;
  taxCode: string;
  medical: number;
  bankName: string;
  bankAccount: string;
  openLoanAmount: number;
  loan: null | {
    id: string;
    principal: number;
    installment: number;
    remaining: number;
    startDate: string;
  };
};

async function loadStaffSnaps(
  organizationId: string,
  locationId: string,
  extractStaffIds: string[],
  taken: { staffId: string; amount: number; payDate: string }[],
  country: PayrollAccess["country"],
): Promise<Map<string, StaffSnap>> {
  const staff = await prisma.staff.findMany({
    where: {
      organizationId,
      OR: [{ locationId }, ...(extractStaffIds.length ? [{ id: { in: extractStaffIds } }] : [])],
    },
    select: {
      id: true,
      locationId: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      archivedAt: true,
      staffRole: { select: { name: true } },
      payProfile: true,
      loans: { where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const map = new Map<string, StaffSnap>();
  for (const person of staff) {
    const profile = person.payProfile;
    const payFrequency = profile?.payFrequency ?? "semimonthly";
    const loanRow = person.loans[0] ?? null;
    let loan: StaffSnap["loan"] = null;
    if (loanRow) {
      const startDate = ymdForDbDate(loanRow.startDate);
      const principal = money(loanRow.principal);
      const installment = loanInstallment(
        country,
        payFrequency,
        principal,
        loanRow.termCount,
        loanRow.termUnit,
      );
      loan = {
        id: loanRow.id,
        principal,
        installment,
        remaining: loanRemainingFor(taken, person.id, startDate, principal),
        startDate,
      };
    }
    map.set(person.id, {
      staffId: person.id,
      name: payPeriodStaffName(person.firstName, person.lastName),
      onLocation: person.locationId === locationId,
      isActive: person.isActive && !person.archivedAt,
      isManager: isPayPeriodManager(person.role, person.staffRole?.name ?? null),
      payType: profile?.payType ?? "hourly",
      frequency: payFrequency,
      nicNumber: profile?.nicNumber ?? "",
      hourlyRate: money(profile?.hourlyRate),
      salaryAmount: money(profile?.salaryAmount),
      taxCode: profile?.taxCode ?? "",
      medical: money(profile?.medicalAmount),
      bankName: profile?.bankName ?? "",
      bankAccount: profile?.bankAccount ?? "",
      openLoanAmount: money(profile?.openLoanAmount),
      loan,
    });
  }
  return map;
}

function prefillLoan(snap: StaffSnap | undefined, payDate: string): { deduction: number; remaining: number | null } {
  if (!snap) return { deduction: 0, remaining: null };
  if (snap.loan && snap.loan.remaining > 0 && payDate >= snap.loan.startDate) {
    return {
      deduction: loanDeductionThisPay(snap.loan.installment, snap.loan.remaining),
      remaining: snap.loan.remaining,
    };
  }
  if (snap.openLoanAmount > 0) return { deduction: snap.openLoanAmount, remaining: null };
  return { deduction: 0, remaining: snap.loan ? snap.loan.remaining : null };
}

async function dayBucketsFor(
  organizationId: string,
  locationId: string,
  timeZone: string,
  startYmd: string,
  endYmd: string,
): Promise<Map<string, DayHours[]>> {
  const punches = await prisma.attendanceLog.findMany({
    where: {
      organizationId,
      locationId,
      staffId: { not: null },
      punchAt: {
        gte: startOfLocalDayUtc(startYmd, timeZone),
        lte: endOfLocalDayUtc(endYmd, timeZone),
      },
    },
    select: { staffId: true, punchAt: true, punchType: true },
  });
  const grouped = new Map<string, { punchAt: Date; punchType: string }[]>();
  for (const punch of punches) {
    if (!punch.staffId) continue;
    const list = grouped.get(punch.staffId) ?? [];
    list.push({ punchAt: punch.punchAt, punchType: punch.punchType });
    grouped.set(punch.staffId, list);
  }
  const out = new Map<string, DayHours[]>();
  for (const [staffId, list] of grouped) out.set(staffId, dayHoursFromPunches(list, timeZone));
  return out;
}

type LineSeed = {
  staffId: string | null;
  displayName: string;
  nicNumber: string;
  payType: PayType;
  payFrequency: PayFrequency;
  reportOnly: boolean;
  sourceHours: number;
  dayBuckets: DayHours[];
  vacationNote: string;
  sickDays: number;
  shortage: number;
  hourlyRate: number;
  salaryAmount: number;
  taxCode: string;
  medical: number;
  bankName: string;
  bankAccount: string;
  extraEarnings: number;
  paye: number;
  otherDeductions: number;
  customColumns: CustomColumnAmount[];
  loanDeduction: number;
  loanRemaining: number | null;
};

function seedFromSelection(args: {
  selected: ReturnType<typeof selectPeopleForRun>[number];
  snap: StaffSnap | undefined;
  buckets: DayHours[];
  payDate: string;
  layout: ColumnLayout;
  kept?: {
    hourlyRate: number;
    salaryAmount: number;
    taxCode: string;
    medical: number;
    extraEarnings: number;
    paye: number;
    otherDeductions: number;
    customColumns: CustomColumnAmount[];
    shortage: number;
    loanDeduction: number;
  };
}): LineSeed {
  const snap = args.snap;
  const loan = prefillLoan(snap, args.payDate);
  const kept = args.kept;
  return {
    staffId: args.selected.reportOnly ? null : args.selected.staffId,
    displayName: args.selected.name,
    nicNumber: snap?.nicNumber ?? "",
    payType: snap?.payType ?? "hourly",
    payFrequency: snap?.frequency ?? "semimonthly",
    reportOnly: args.selected.reportOnly,
    sourceHours: roundHours(args.selected.hours),
    dayBuckets: args.buckets,
    vacationNote: args.selected.vacation,
    sickDays: args.selected.sickDays,
    shortage: kept ? kept.shortage : roundMoney(args.selected.shortage),
    hourlyRate: kept ? kept.hourlyRate : (snap?.hourlyRate ?? 0),
    salaryAmount: kept ? kept.salaryAmount : (snap?.salaryAmount ?? 0),
    taxCode: kept ? kept.taxCode : (snap?.taxCode ?? ""),
    medical: kept ? kept.medical : (snap?.medical ?? 0),
    bankName: snap?.bankName ?? "",
    bankAccount: snap?.bankAccount ?? "",
    extraEarnings: kept?.extraEarnings ?? 0,
    paye: kept?.paye ?? 0,
    otherDeductions: kept?.otherDeductions ?? 0,
    customColumns: kept?.customColumns ?? parseCustomAmounts([], args.layout),
    loanDeduction: kept ? kept.loanDeduction : loan.deduction,
    loanRemaining: loan.remaining,
  };
}

function hoursForSeed(
  seed: LineSeed,
  rule: PayRun["overtimeRule"],
  periodDays: number | null,
): { basicHours: number; overtimeHours: number } {
  if (seed.payType === "salaried") {
    return { basicHours: seed.sourceHours, overtimeHours: 0 };
  }
  return splitOvertimeHours({
    rule,
    extractedHours: seed.sourceHours,
    days: seed.dayBuckets,
    periodDays,
  });
}

function priceSeed(
  seed: LineSeed,
  basicHours: number,
  overtimeHours: number,
  access: PayrollAccess,
  multiplier: number,
  history: HistoryLine[],
  payDate: string,
  layout: ColumnLayout,
): Omit<PayRunLineDto, "id" | "ytdGross" | "ytdDeductions" | "ytdNet"> & {
  ytdGross: number;
  ytdDeductions: number;
  ytdNet: number;
} {
  const already = nicAlready(history, seed.staffId, payDate);
  const ytd = ytdBefore(history, seed.staffId, payDate);
  const priced = computeLineMoney({
    payType: seed.payType,
    basicHours,
    overtimeHours,
    hourlyRate: seed.hourlyRate,
    salaryAmount: seed.salaryAmount,
    overtimeMultiplier: multiplier,
    extraEarnings: seed.extraEarnings,
    customColumns: seed.customColumns,
    sickColumnVisible: columnVisible(layout, "sick"),
    medical: seed.medical,
    shortage: seed.shortage,
    loanDeduction: seed.loanDeduction,
    paye: seed.paye,
    otherDeductions: seed.otherDeductions,
    nicAlreadyEmployee: already.employee,
    nicAlreadyEmployer: already.employer,
    loanRemaining: seed.loanRemaining,
    country: access.country,
  });
  return {
    staffId: seed.staffId,
    displayName: seed.displayName,
    nicNumber: seed.nicNumber,
    payType: seed.payType,
    payFrequency: seed.payFrequency,
    reportOnly: seed.reportOnly,
    sourceHours: seed.sourceHours,
    basicHours,
    overtimeHours,
    dayBuckets: seed.dayBuckets,
    hourlyRate: seed.hourlyRate,
    salaryAmount: seed.salaryAmount,
    extraEarnings: seed.extraEarnings,
    customColumns: seed.customColumns,
    vacationNote: seed.vacationNote,
    sickDays: seed.sickDays,
    employeeNic: priced.employeeNic,
    employerNic: priced.employerNic,
    loanDeduction: priced.loanDeduction,
    loanRemaining: seed.loanRemaining,
    medical: seed.medical,
    shortage: seed.shortage,
    paye: seed.paye,
    otherDeductions: seed.otherDeductions,
    basicPay: priced.basicPay,
    overtimePay: priced.overtimePay,
    gross: priced.gross,
    totalDeductions: priced.totalDeductions,
    net: priced.net,
    taxCode: seed.taxCode,
    bankName: seed.bankName,
    bankAccount: seed.bankAccount,
    ytdGross: ytd.gross,
    ytdDeductions: ytd.deductions,
    ytdNet: ytd.net,
  };
}

function lineWrite(payRunId: string, line: ReturnType<typeof priceSeed>) {
  return {
    payRunId,
    staffId: line.staffId,
    sortName: line.displayName.toLowerCase(),
    displayName: line.displayName,
    nicNumber: line.nicNumber || null,
    payType: line.payType,
    payFrequency: line.payFrequency,
    reportOnly: line.reportOnly,
    sourceHours: dec(line.sourceHours),
    basicHours: dec(line.basicHours),
    overtimeHours: dec(line.overtimeHours),
    dayBuckets: json(line.dayBuckets),
    hourlyRate: dec(line.hourlyRate),
    salaryAmount: dec(line.salaryAmount),
    extraEarnings: dec(line.extraEarnings),
    customColumns: json(line.customColumns),
    vacationNote: line.vacationNote,
    sickDays: dec(line.sickDays),
    employeeNic: dec(line.employeeNic),
    employerNic: dec(line.employerNic),
    loanDeduction: dec(line.loanDeduction),
    medical: dec(line.medical),
    shortage: dec(line.shortage),
    paye: dec(line.paye),
    otherDeductions: dec(line.otherDeductions),
    gross: dec(line.gross),
    totalDeductions: dec(line.totalDeductions),
    net: dec(line.net),
    taxCode: line.taxCode || null,
    bankName: line.bankName || null,
    bankAccount: line.bankAccount || null,
  };
}

function toDto(
  run: RunWithLines,
  history: HistoryLine[],
  layout: ColumnLayout,
  multiplier: number,
  loanCaps: Map<string, number | null>,
): PayRunDto {
  const payDate = ymdForDbDate(run.payDate);
  const lines: PayRunLineDto[] = run.lines
    .slice()
    .sort((a, b) => a.sortName.localeCompare(b.sortName))
    .map((line) => {
      const ytd = ytdBefore(history, line.staffId, payDate);
      const basicPay =
        line.payType === "salaried"
          ? money(line.salaryAmount)
          : roundMoney(hours(line.basicHours) * money(line.hourlyRate));
      const overtimePay =
        line.payType === "salaried"
          ? 0
          : roundMoney(hours(line.overtimeHours) * money(line.hourlyRate) * multiplier);
      return {
        id: line.id,
        staffId: line.staffId,
        displayName: line.displayName,
        nicNumber: line.nicNumber ?? "",
        payType: line.payType,
        payFrequency: line.payFrequency,
        reportOnly: line.reportOnly,
        sourceHours: hours(line.sourceHours),
        basicHours: hours(line.basicHours),
        overtimeHours: hours(line.overtimeHours),
        dayBuckets: parseDayBuckets(line.dayBuckets),
        hourlyRate: money(line.hourlyRate),
        salaryAmount: money(line.salaryAmount),
        extraEarnings: money(line.extraEarnings),
        customColumns: parseCustomAmounts(line.customColumns, layout),
        vacationNote: line.vacationNote,
        sickDays: hours(line.sickDays),
        employeeNic: money(line.employeeNic),
        employerNic: money(line.employerNic),
        loanDeduction: money(line.loanDeduction),
        loanRemaining: line.staffId && loanCaps.has(line.staffId) ? (loanCaps.get(line.staffId) ?? null) : null,
        medical: money(line.medical),
        shortage: money(line.shortage),
        paye: money(line.paye),
        otherDeductions: money(line.otherDeductions),
        basicPay,
        overtimePay,
        gross: money(line.gross),
        totalDeductions: money(line.totalDeductions),
        net: money(line.net),
        taxCode: line.taxCode ?? "",
        bankName: line.bankName ?? "",
        bankAccount: line.bankAccount ?? "",
        ytdGross: ytd.gross,
        ytdDeductions: ytd.deductions,
        ytdNet: ytd.net,
      };
    });

  const counted = lines.filter((line) => line.displayName !== "__skipSalary");
  return {
    id: run.id,
    locationId: run.locationId,
    locationName: run.location.name,
    payPeriodId: run.payPeriodId,
    status: run.status,
    frequency: run.frequency,
    rangeStart: ymdForDbDate(run.rangeStart),
    rangeEnd: ymdForDbDate(run.rangeEnd),
    cycleNumber: run.cycleNumber,
    cycleManual: run.cycleManual,
    payDate,
    overtimeRule: run.overtimeRule,
    overtimeMultiplier: multiplier,
    approvedAt: run.approvedAt?.toISOString() ?? null,
    voidedAt: run.voidedAt?.toISOString() ?? null,
    voidedByName: run.voidedByName,
    voidReason: run.voidReason,
    thirdParty: parseThirdParty(run.thirdParty),
    lines,
    totals: {
      gross: roundMoney(counted.reduce((sum, line) => sum + line.gross, 0)),
      employeeNic: roundMoney(counted.reduce((sum, line) => sum + line.employeeNic, 0)),
      employerNic: roundMoney(counted.reduce((sum, line) => sum + line.employerNic, 0)),
      deductions: roundMoney(counted.reduce((sum, line) => sum + line.totalDeductions, 0)),
      net: roundMoney(counted.reduce((sum, line) => sum + line.net, 0)),
    },
  };
}

async function fetchRun(organizationId: string, id: string): Promise<RunWithLines> {
  const run = await prisma.payRun.findFirst({
    where: { id, organizationId },
    include: { lines: true, location: { select: { name: true } } },
  });
  if (!run) throw new PayrollError("Pay run not found.", 404);
  return run;
}

function multiplierOf(run: { overtimeMultiplier: unknown }, access: PayrollAccess): number {
  return num(run.overtimeMultiplier) || num(access.config.overtimeMultiplier);
}

export async function listPayRuns(access: PayrollAccess, locationId: string): Promise<PayRunListItemDto[]> {
  const runs = await prisma.payRun.findMany({
    where: { organizationId: access.organizationId, locationId },
    orderBy: { rangeEnd: "desc" },
    include: {
      lines: { select: { net: true, displayName: true } },
    },
  });
  return runs.map((run) => ({
    id: run.id,
    locationId: run.locationId,
    status: run.status,
    frequency: run.frequency,
    rangeStart: ymdForDbDate(run.rangeStart),
    rangeEnd: ymdForDbDate(run.rangeEnd),
    payDate: ymdForDbDate(run.payDate),
    cycleNumber: run.cycleNumber,
    headcount: run.lines.filter((line) => line.displayName !== "__skipSalary").length,
    net: roundMoney(
      run.lines.reduce((sum, line) => (line.displayName === "__skipSalary" ? sum : sum + money(line.net)), 0),
    ),
    updatedAt: run.updatedAt.toISOString(),
  }));
}

export async function createPayRun(
  access: PayrollAccess,
  input: {
    payPeriodId: string;
    rangeStart: string;
    rangeEnd: string;
    payDate: string;
    cycleNumber: number;
    cycleManual: boolean;
  },
): Promise<PayRunDto> {
  const frequency = inferPayFrequency(input.rangeStart, input.rangeEnd);
  if (!frequency || !parseYmd(input.payDate)) throw new PayrollError("Enter a valid pay range and pay date.", 400);
  assertCycle(input.cycleNumber);

  const period = await prisma.payPeriod.findFirst({
    where: { id: input.payPeriodId, organizationId: access.organizationId },
  });
  if (!period) throw new PayrollError("Choose a saved attendance extract.", 400);

  const existing = await prisma.payRun.findFirst({
    where: { payPeriodId: period.id, status: { in: ["draft", "processed"] } },
    select: { id: true },
  });
  if (existing) {
    throw new PayrollError("This attendance extract already has a pay run. Void it before starting another.", 409);
  }

  const location = await prisma.location.findFirst({
    where: { id: period.locationId, organizationId: access.organizationId },
    select: { id: true, timeZone: true, organization: { select: { timeZone: true } } },
  });
  if (!location) throw new PayrollError("Location not found.", 404);
  const timeZone = location.timeZone ?? location.organization.timeZone;

  const rows = parsePayPeriodRows(period.rows);
  const layout = layoutFromConfig(access.config.columnLayout);
  const taken = await loadLoanTaken(access.organizationId);
  const snaps = await loadStaffSnaps(
    access.organizationId,
    location.id,
    rows.map((row) => row.staffId).filter((id) => !id.startsWith("report-only:")),
    taken,
    access.country,
  );
  const selected = selectPeopleForRun({
    frequency,
    extract: rows.map((row) => ({
      staffId: row.staffId,
      name: row.staffName,
      hours: row.transTtl,
      vacation: row.vacation,
      sickDays: row.sickLeaveDays,
      shortage: row.shortage,
    })),
    directory: [...snaps.values()],
  });
  const buckets = await dayBucketsFor(
    access.organizationId,
    location.id,
    timeZone,
    input.rangeStart,
    input.rangeEnd,
  );
  const periodDays = inclusiveDays(input.rangeStart, input.rangeEnd);
  const history = await loadHistory(access.organizationId, input.payDate);
  const multiplier = num(access.config.overtimeMultiplier);

  const priced = selected.map((person) => {
    const snap = snaps.get(person.staffId);
    const seed = seedFromSelection({
      selected: person,
      snap,
      buckets: snap ? (buckets.get(person.staffId) ?? []) : [],
      payDate: input.payDate,
      layout,
    });
    const split = hoursForSeed(seed, access.config.overtimeRule, periodDays);
    return priceSeed(
      seed,
      split.basicHours,
      split.overtimeHours,
      access,
      multiplier,
      history,
      input.payDate,
      layout,
    );
  });

  try {
    const created = await prisma.$transaction(async (tx) => {
      const run = await tx.payRun.create({
        data: {
          organizationId: access.organizationId,
          locationId: location.id,
          payPeriodId: period.id,
          openSlot: period.id,
          countryCode: access.country.code,
          frequency,
          rangeStart: utcDateFromYmd(input.rangeStart),
          rangeEnd: utcDateFromYmd(input.rangeEnd),
          cycleNumber: input.cycleNumber,
          cycleManual: input.cycleManual,
          payDate: utcDateFromYmd(input.payDate),
          overtimeRule: access.config.overtimeRule,
          overtimeMultiplier: dec(multiplier),
          thirdParty: json([]),
        },
      });
      if (priced.length) {
        await tx.payRunLine.createMany({
          data: priced.map((line) => lineWrite(run.id, line)),
        });
      }
      return run.id;
    });
    return getPayRun(access, created);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new PayrollError("This attendance extract already has a pay run. Void it before starting another.", 409);
    }
    throw err;
  }
}

export async function getPayRun(access: PayrollAccess, id: string): Promise<PayRunDto> {
  const run = await fetchRun(access.organizationId, id);
  const layout = layoutFromConfig(access.config.columnLayout);
  const payDate = ymdForDbDate(run.payDate);
  const history = await loadHistory(access.organizationId, payDate, run.id);
  const taken = await loadLoanTaken(access.organizationId);
  const loans = await prisma.staffLoan.findMany({
    where: { organizationId: access.organizationId, status: "active" },
  });
  const loanCaps = new Map<string, number | null>();
  for (const loan of loans) {
    loanCaps.set(
      loan.staffId,
      loanRemainingFor(taken, loan.staffId, ymdForDbDate(loan.startDate), money(loan.principal)),
    );
  }
  return toDto(run, history, layout, multiplierOf(run, access), loanCaps);
}

export type LinePatch = {
  id: string;
  basicHours: number;
  overtimeHours: number;
  hourlyRate: number;
  salaryAmount: number;
  extraEarnings: number;
  customColumns: { id: string; hours: number; amount: number }[];
  medical: number;
  shortage: number;
  loanDeduction: number;
  paye: number;
  otherDeductions: number;
  taxCode: string;
  saveToProfile: boolean;
};

export async function savePayRun(
  access: PayrollAccess,
  id: string,
  patch: {
    rangeStart: string;
    rangeEnd: string;
    payDate: string;
    cycleNumber: number;
    cycleManual: boolean;
    thirdParty: ThirdPartyDto[];
    lines: LinePatch[];
  },
): Promise<PayRunDto> {
  const run = await fetchRun(access.organizationId, id);
  if (run.status !== "draft") throw new PayrollError("This pay run is locked.", 409);
  const frequency = inferPayFrequency(patch.rangeStart, patch.rangeEnd);
  if (!frequency || !parseYmd(patch.payDate)) throw new PayrollError("Enter a valid pay range and pay date.", 400);
  assertCycle(patch.cycleNumber);

  const layout = layoutFromConfig(access.config.columnLayout);
  const taken = await loadLoanTaken(access.organizationId);
  const snaps = await loadStaffSnaps(
    access.organizationId,
    run.locationId,
    run.lines.flatMap((line) => (line.staffId ? [line.staffId] : [])),
    taken,
    access.country,
  );

  if (frequency !== run.frequency) {
    const period = await prisma.payPeriod.findFirst({
      where: { id: run.payPeriodId, organizationId: access.organizationId },
    });
    if (!period) throw new PayrollError("The attendance extract is missing.", 404);
    const location = await prisma.location.findFirst({
      where: { id: run.locationId },
      select: { timeZone: true, organization: { select: { timeZone: true } } },
    });
    const timeZone = location?.timeZone ?? location?.organization.timeZone ?? "UTC";
    const rows = parsePayPeriodRows(period.rows);
    const selected = selectPeopleForRun({
      frequency,
      extract: rows.map((row) => ({
        staffId: row.staffId,
        name: row.staffName,
        hours: row.transTtl,
        vacation: row.vacation,
        sickDays: row.sickLeaveDays,
        shortage: row.shortage,
      })),
      directory: [...snaps.values()],
    });
    const keptByStaff = new Map(patch.lines.map((line) => [line.id, line]));
    const previousByStaff = new Map(run.lines.map((line) => [line.staffId ?? line.displayName, line]));
    const buckets = await dayBucketsFor(access.organizationId, run.locationId, timeZone, patch.rangeStart, patch.rangeEnd);
    const history = await loadHistory(access.organizationId, patch.payDate, run.id);
    const periodDays = inclusiveDays(patch.rangeStart, patch.rangeEnd);
    const rebuilt = selected.map((person) => {
      const previous = previousByStaff.get(person.reportOnly ? person.name : person.staffId);
      const edited = previous ? keptByStaff.get(previous.id) : undefined;
      const snap = snaps.get(person.staffId);
      const seed = seedFromSelection({
        selected: person,
        snap,
        buckets: snap ? (buckets.get(person.staffId) ?? []) : [],
        payDate: patch.payDate,
        layout,
        kept: edited
          ? {
              hourlyRate: roundMoney(Math.max(0, edited.hourlyRate)),
              salaryAmount: roundMoney(Math.max(0, edited.salaryAmount)),
              taxCode: edited.taxCode.trim(),
              medical: roundMoney(Math.max(0, edited.medical)),
              extraEarnings: roundMoney(Math.max(0, edited.extraEarnings)),
              paye: roundMoney(Math.max(0, edited.paye)),
              otherDeductions: roundMoney(Math.max(0, edited.otherDeductions)),
              customColumns: parseCustomAmounts(edited.customColumns, layout),
              shortage: roundMoney(Math.max(0, edited.shortage)),
              loanDeduction: roundMoney(Math.max(0, edited.loanDeduction)),
            }
          : undefined,
      });
      const split = hoursForSeed(seed, run.overtimeRule, periodDays);
      return priceSeed(
        seed,
        split.basicHours,
        split.overtimeHours,
        access,
        num(run.overtimeMultiplier),
        history,
        patch.payDate,
        layout,
      );
    });

    await prisma.$transaction(async (tx) => {
      await tx.payRunLine.deleteMany({ where: { payRunId: run.id } });
      if (rebuilt.length) {
        await tx.payRunLine.createMany({ data: rebuilt.map((line) => lineWrite(run.id, line)) });
      }
      await tx.payRun.update({
        where: { id: run.id },
        data: {
          frequency,
          rangeStart: utcDateFromYmd(patch.rangeStart),
          rangeEnd: utcDateFromYmd(patch.rangeEnd),
          payDate: utcDateFromYmd(patch.payDate),
          cycleNumber: patch.cycleNumber,
          cycleManual: patch.cycleManual,
          thirdParty: json(patch.thirdParty),
        },
      });
    });
    return getPayRun(access, run.id);
  }

  const history = await loadHistory(access.organizationId, patch.payDate, run.id);
  const edits = new Map(patch.lines.map((line) => [line.id, line]));
  const next = run.lines.map((line) => {
    const edit = edits.get(line.id);
    const snap = line.staffId ? snaps.get(line.staffId) : undefined;
    const loan = prefillLoan(snap, patch.payDate);
    const payType = snap?.payType ?? line.payType;
    const seed: LineSeed = {
      staffId: line.staffId,
      displayName: line.displayName,
      nicNumber: snap?.nicNumber ?? line.nicNumber ?? "",
      payType,
      payFrequency: snap?.frequency ?? line.payFrequency,
      reportOnly: line.reportOnly,
      sourceHours: hours(line.sourceHours),
      dayBuckets: parseDayBuckets(line.dayBuckets),
      vacationNote: line.vacationNote,
      sickDays: hours(line.sickDays),
      shortage: edit ? roundMoney(Math.max(0, edit.shortage)) : money(line.shortage),
      hourlyRate: edit ? roundMoney(Math.max(0, edit.hourlyRate)) : money(line.hourlyRate),
      salaryAmount: edit ? roundMoney(Math.max(0, edit.salaryAmount)) : money(line.salaryAmount),
      taxCode: edit ? edit.taxCode.trim() : (line.taxCode ?? ""),
      medical: edit ? roundMoney(Math.max(0, edit.medical)) : money(line.medical),
      bankName: snap?.bankName ?? line.bankName ?? "",
      bankAccount: snap?.bankAccount ?? line.bankAccount ?? "",
      extraEarnings: edit ? roundMoney(Math.max(0, edit.extraEarnings)) : money(line.extraEarnings),
      paye: edit ? roundMoney(Math.max(0, edit.paye)) : money(line.paye),
      otherDeductions: edit ? roundMoney(Math.max(0, edit.otherDeductions)) : money(line.otherDeductions),
      customColumns: parseCustomAmounts(edit ? edit.customColumns : line.customColumns, layout),
      loanDeduction: edit ? roundMoney(Math.max(0, edit.loanDeduction)) : money(line.loanDeduction),
      loanRemaining: loan.remaining,
    };
    let basicHours = edit ? roundHours(Math.max(0, edit.basicHours)) : hours(line.basicHours);
    let overtimeHours = edit ? roundHours(Math.max(0, edit.overtimeHours)) : hours(line.overtimeHours);
    if (payType === "salaried") overtimeHours = 0;
    return {
      priced: priceSeed(
        seed,
        basicHours,
        overtimeHours,
        access,
        num(run.overtimeMultiplier),
        history,
        patch.payDate,
        layout,
      ),
      id: line.id,
      edit,
    };
  });

  await prisma.$transaction(async (tx) => {
    for (const line of next) {
      const write = lineWrite(run.id, line.priced);
      await tx.payRunLine.update({
        where: { id: line.id },
        data: write,
      });
      if (line.edit?.saveToProfile && line.priced.staffId) {
        await tx.staffPayProfile.upsert({
          where: { staffId: line.priced.staffId },
          create: {
            organizationId: access.organizationId,
            staffId: line.priced.staffId,
            payType: line.priced.payType,
            payFrequency: line.priced.payFrequency,
            hourlyRate: dec(line.priced.hourlyRate),
            salaryAmount: dec(line.priced.salaryAmount),
            taxCode: line.priced.taxCode || null,
            medicalAmount: dec(line.priced.medical),
          },
          update: {
            hourlyRate: dec(line.priced.hourlyRate),
            salaryAmount: dec(line.priced.salaryAmount),
            taxCode: line.priced.taxCode || null,
            medicalAmount: dec(line.priced.medical),
          },
        });
      }
    }
    await tx.payRun.update({
      where: { id: run.id },
      data: {
        rangeStart: utcDateFromYmd(patch.rangeStart),
        rangeEnd: utcDateFromYmd(patch.rangeEnd),
        payDate: utcDateFromYmd(patch.payDate),
        cycleNumber: patch.cycleNumber,
        cycleManual: patch.cycleManual,
        thirdParty: json(patch.thirdParty),
      },
    });
  });

  return getPayRun(access, run.id);
}

export async function reloadPayRunHours(access: PayrollAccess, id: string): Promise<PayRunDto> {
  const run = await fetchRun(access.organizationId, id);
  if (run.status !== "draft") throw new PayrollError("This pay run is locked.", 409);
  const layout = layoutFromConfig(access.config.columnLayout);
  const payDate = ymdForDbDate(run.payDate);
  const history = await loadHistory(access.organizationId, payDate, run.id);
  const taken = await loadLoanTaken(access.organizationId);
  const snaps = await loadStaffSnaps(
    access.organizationId,
    run.locationId,
    run.lines.flatMap((line) => (line.staffId ? [line.staffId] : [])),
    taken,
    access.country,
  );
  const periodDays = inclusiveDays(ymdForDbDate(run.rangeStart), ymdForDbDate(run.rangeEnd));
  const rule = access.config.overtimeRule;
  const multiplier = num(access.config.overtimeMultiplier);

  await prisma.$transaction(async (tx) => {
    for (const line of run.lines) {
      const snap = line.staffId ? snaps.get(line.staffId) : undefined;
      const loan = prefillLoan(snap, payDate);
      const seed: LineSeed = {
        staffId: line.staffId,
        displayName: line.displayName,
        nicNumber: snap?.nicNumber ?? line.nicNumber ?? "",
        payType: snap?.payType ?? line.payType,
        payFrequency: snap?.frequency ?? line.payFrequency,
        reportOnly: line.reportOnly,
        sourceHours: hours(line.sourceHours),
        dayBuckets: parseDayBuckets(line.dayBuckets),
        vacationNote: line.vacationNote,
        sickDays: hours(line.sickDays),
        shortage: money(line.shortage),
        hourlyRate: money(line.hourlyRate),
        salaryAmount: money(line.salaryAmount),
        taxCode: line.taxCode ?? "",
        medical: money(line.medical),
        bankName: snap?.bankName ?? line.bankName ?? "",
        bankAccount: snap?.bankAccount ?? line.bankAccount ?? "",
        extraEarnings: money(line.extraEarnings),
        paye: money(line.paye),
        otherDeductions: money(line.otherDeductions),
        customColumns: parseCustomAmounts(line.customColumns, layout),
        loanDeduction: money(line.loanDeduction),
        loanRemaining: loan.remaining,
      };
      const split = hoursForSeed(seed, rule, periodDays);
      const priced = priceSeed(
        seed,
        split.basicHours,
        split.overtimeHours,
        access,
        multiplier,
        history,
        payDate,
        layout,
      );
      await tx.payRunLine.update({ where: { id: line.id }, data: lineWrite(run.id, priced) });
    }
    await tx.payRun.update({
      where: { id: run.id },
      data: { overtimeRule: rule, overtimeMultiplier: dec(multiplier) },
    });
  });
  return getPayRun(access, id);
}

export async function clearPayRunEntries(access: PayrollAccess, id: string): Promise<PayRunDto> {
  const run = await fetchRun(access.organizationId, id);
  if (run.status !== "draft") throw new PayrollError("This pay run is locked.", 409);
  const layout = layoutFromConfig(access.config.columnLayout);
  const payDate = ymdForDbDate(run.payDate);
  const history = await loadHistory(access.organizationId, payDate, run.id);
  const taken = await loadLoanTaken(access.organizationId);
  const snaps = await loadStaffSnaps(
    access.organizationId,
    run.locationId,
    run.lines.flatMap((line) => (line.staffId ? [line.staffId] : [])),
    taken,
    access.country,
  );

  await prisma.$transaction(async (tx) => {
    for (const line of run.lines) {
      const snap = line.staffId ? snaps.get(line.staffId) : undefined;
      const loan = prefillLoan(snap, payDate);
      const payType = snap?.payType ?? line.payType;
      const clearedCustom = parseCustomAmounts(line.customColumns, layout).map((column) =>
        column.kind === "deduction" ? column : { ...column, hours: 0, amount: 0 },
      );
      const seed: LineSeed = {
        staffId: line.staffId,
        displayName: line.displayName,
        nicNumber: line.nicNumber ?? "",
        payType,
        payFrequency: line.payFrequency,
        reportOnly: line.reportOnly,
        sourceHours: hours(line.sourceHours),
        dayBuckets: parseDayBuckets(line.dayBuckets),
        vacationNote: line.vacationNote,
        sickDays: hours(line.sickDays),
        shortage: 0,
        hourlyRate: money(line.hourlyRate),
        salaryAmount: money(line.salaryAmount),
        taxCode: line.taxCode ?? "",
        medical: money(line.medical),
        bankName: line.bankName ?? "",
        bankAccount: line.bankAccount ?? "",
        extraEarnings: 0,
        paye: money(line.paye),
        otherDeductions: money(line.otherDeductions),
        customColumns: clearedCustom,
        loanDeduction: money(line.loanDeduction),
        loanRemaining: loan.remaining,
      };
      const basicHours = payType === "hourly" ? 0 : hours(line.basicHours);
      const priced = priceSeed(seed, basicHours, 0, access, num(run.overtimeMultiplier), history, payDate, layout);
      await tx.payRunLine.update({ where: { id: line.id }, data: lineWrite(run.id, priced) });
    }
  });
  return getPayRun(access, id);
}

async function refreshLoanStatuses(organizationId: string) {
  const loans = await prisma.staffLoan.findMany({ where: { organizationId } });
  const taken = await loadLoanTaken(organizationId);
  for (const loan of loans) {
    const remaining = loanRemainingFor(
      taken,
      loan.staffId,
      ymdForDbDate(loan.startDate),
      money(loan.principal),
    );
    const status = remaining <= 0 ? "paid" : "active";
    if (status !== loan.status) {
      await prisma.staffLoan.update({ where: { id: loan.id }, data: { status } });
    }
  }
}

export async function approvePayRun(access: PayrollAccess, id: string): Promise<PayRunDto> {
  const run = await fetchRun(access.organizationId, id);
  if (run.status !== "draft") throw new PayrollError("Only a draft can be approved.", 409);
  await prisma.payRun.update({
    where: { id: run.id },
    data: {
      status: "processed",
      approvedAt: new Date(),
      approvedByUserId: access.appUserId,
    },
  });
  await refreshLoanStatuses(access.organizationId);
  return getPayRun(access, id);
}

export async function voidPayRun(access: PayrollAccess, id: string, reason: string, actorName: string): Promise<PayRunDto> {
  const clean = reason.trim();
  if (clean.length < 3) throw new PayrollError("Enter a void reason of at least 3 characters.", 400);
  const run = await fetchRun(access.organizationId, id);
  if (run.status !== "processed") throw new PayrollError("Only an approved pay run can be voided.", 409);
  await prisma.payRun.update({
    where: { id: run.id },
    data: {
      status: "void",
      openSlot: null,
      voidedAt: new Date(),
      voidedByUserId: access.appUserId,
      voidedByName: actorName,
      voidReason: clean,
    },
  });
  await refreshLoanStatuses(access.organizationId);
  return getPayRun(access, id);
}

export async function deletePayRun(access: PayrollAccess, id: string): Promise<void> {
  const run = await fetchRun(access.organizationId, id);
  if (run.status !== "draft") throw new PayrollError("Only a draft can be deleted.", 409);
  await prisma.payRun.delete({ where: { id: run.id } });
}
