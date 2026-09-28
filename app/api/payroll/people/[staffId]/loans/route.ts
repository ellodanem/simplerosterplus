import { NextResponse } from "next/server";
import type { LoanTermUnit } from "@prisma/client";
import { assertWritable, payrollErrorResponse, requirePayrollAccess } from "@/lib/payroll/access";
import { saveStaffLoan } from "@/lib/payroll/people";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const access = await requirePayrollAccess();
    assertWritable(access);
    const { staffId } = await params;
    const body = (await request.json()) as {
      principal?: number;
      termCount?: number;
      termUnit?: LoanTermUnit;
      startDate?: string;
    };
    await saveStaffLoan(access, staffId, {
      principal: Number(body.principal ?? 0),
      termCount: Number(body.termCount ?? 0),
      termUnit: body.termUnit ?? "months",
      startDate: body.startDate ?? "",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return payrollErrorResponse(err);
  }
}
