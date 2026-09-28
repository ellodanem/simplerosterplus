import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertWritable, payrollErrorResponse, requirePayrollAccess } from "@/lib/payroll/access";
import {
  approvePayRun,
  clearPayRunEntries,
  createPayRun,
  deletePayRun,
  getPayRun,
  listPayRuns,
  reloadPayRunHours,
  savePayRun,
  voidPayRun,
  type LinePatch,
} from "@/lib/payroll/runs";
import { parseThirdParty } from "@/lib/payroll/parse";
import { bankingCsv, bankingList } from "@/lib/payroll/documents";
import { inferPayFrequency, semiMonthlyCycleNumber } from "@/lib/payroll/frequency";

export async function GET(request: Request) {
  try {
    const access = await requirePayrollAccess();
    const locationId = new URL(request.url).searchParams.get("locationId") ?? "";
    if (!locationId) return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    const runs = await listPayRuns(access, locationId);
    return NextResponse.json({ runs });
  } catch (err) {
    return payrollErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requirePayrollAccess();
    assertWritable(access);
    const body = (await request.json()) as {
      payPeriodId?: string;
      rangeStart?: string;
      rangeEnd?: string;
      payDate?: string;
      cycleNumber?: number;
      cycleManual?: boolean;
    };
    const rangeEnd = body.rangeEnd ?? "";
    const frequency = inferPayFrequency(body.rangeStart ?? "", rangeEnd);
    const cycle =
      body.cycleManual || frequency !== "semimonthly"
        ? Number(body.cycleNumber ?? 0)
        : (semiMonthlyCycleNumber(rangeEnd) ?? Number(body.cycleNumber ?? 0));
    const run = await createPayRun(access, {
      payPeriodId: body.payPeriodId ?? "",
      rangeStart: body.rangeStart ?? "",
      rangeEnd,
      payDate: body.payDate || rangeEnd,
      cycleNumber: cycle,
      cycleManual: Boolean(body.cycleManual),
    });
    return NextResponse.json({ run });
  } catch (err) {
    return payrollErrorResponse(err);
  }
}

export async function getOne(_request: Request, id: string) {
  const access = await requirePayrollAccess();
  return getPayRun(access, id);
}

export function linePatches(raw: unknown): LinePatch[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string") return [];
    return [
      {
        id: row.id,
        basicHours: Number(row.basicHours ?? 0),
        overtimeHours: Number(row.overtimeHours ?? 0),
        hourlyRate: Number(row.hourlyRate ?? 0),
        salaryAmount: Number(row.salaryAmount ?? 0),
        extraEarnings: Number(row.extraEarnings ?? 0),
        customColumns: Array.isArray(row.customColumns)
          ? row.customColumns.flatMap((column) => {
              if (!column || typeof column !== "object") return [];
              const cell = column as { id?: unknown; hours?: unknown; amount?: unknown };
              if (typeof cell.id !== "string") return [];
              return [{ id: cell.id, hours: Number(cell.hours ?? 0), amount: Number(cell.amount ?? 0) }];
            })
          : [],
        medical: Number(row.medical ?? 0),
        shortage: Number(row.shortage ?? 0),
        loanDeduction: Number(row.loanDeduction ?? 0),
        paye: Number(row.paye ?? 0),
        otherDeductions: Number(row.otherDeductions ?? 0),
        taxCode: typeof row.taxCode === "string" ? row.taxCode : "",
        saveToProfile: row.saveToProfile === true,
      },
    ];
  });
}

export async function saveOne(request: Request, id: string) {
  const access = await requirePayrollAccess();
  assertWritable(access);
  const body = (await request.json()) as Record<string, unknown>;
  const run = await savePayRun(access, id, {
    rangeStart: String(body.rangeStart ?? ""),
    rangeEnd: String(body.rangeEnd ?? ""),
    payDate: String(body.payDate ?? ""),
    cycleNumber: Number(body.cycleNumber ?? 0),
    cycleManual: body.cycleManual === true,
    thirdParty: parseThirdParty(body.thirdParty),
    lines: linePatches(body.lines),
  });
  return run;
}

export async function bankingDownload(id: string) {
  const access = await requirePayrollAccess();
  const run = await getPayRun(access, id);
  if (run.status === "draft") {
    return NextResponse.json({ error: "Approve the pay run before downloading the banking list." }, { status: 409 });
  }
  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: { name: true },
  });
  const list = bankingList(run, access.country);
  const csv = bankingCsv(list.rows);
  const filename = `${(org?.name ?? "payroll").replace(/[^\w.-]+/g, "-")}-banking-${run.payDate}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function approveOne(id: string) {
  const access = await requirePayrollAccess();
  assertWritable(access);
  return approvePayRun(access, id);
}

export async function voidOne(request: Request, id: string) {
  const access = await requirePayrollAccess();
  assertWritable(access);
  const body = (await request.json()) as { reason?: string };
  const user = await prisma.appUser.findUnique({ where: { id: access.appUserId }, select: { email: true } });
  return voidPayRun(access, id, body.reason ?? "", user?.email ?? access.email);
}

export async function deleteOne(id: string) {
  const access = await requirePayrollAccess();
  assertWritable(access);
  await deletePayRun(access, id);
}

export async function reloadOne(id: string) {
  const access = await requirePayrollAccess();
  assertWritable(access);
  return reloadPayRunHours(access, id);
}

export async function clearOne(id: string) {
  const access = await requirePayrollAccess();
  assertWritable(access);
  return clearPayRunEntries(access, id);
}
