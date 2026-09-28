import { NextResponse } from "next/server";
import type { PayFrequency, PayType } from "@prisma/client";
import { assertWritable, payrollErrorResponse, requirePayrollAccess } from "@/lib/payroll/access";
import { saveStaffPay } from "@/lib/payroll/people";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const access = await requirePayrollAccess();
    assertWritable(access);
    const { staffId } = await params;
    const body = (await request.json()) as {
      nicNumber?: string;
      payFrequency?: PayFrequency;
      payType?: PayType;
      hourlyRate?: number;
      salaryAmount?: number;
      taxCode?: string;
      medicalAmount?: number;
      bankName?: string;
      bankAccount?: string;
      openLoanAmount?: number;
    };
    await saveStaffPay(access, staffId, {
      nicNumber: body.nicNumber ?? "",
      payFrequency: body.payFrequency ?? "semimonthly",
      payType: body.payType ?? "hourly",
      hourlyRate: Number(body.hourlyRate ?? 0),
      salaryAmount: Number(body.salaryAmount ?? 0),
      taxCode: body.taxCode ?? "",
      medicalAmount: Number(body.medicalAmount ?? 0),
      bankName: body.bankName ?? "",
      bankAccount: body.bankAccount ?? "",
      openLoanAmount: Number(body.openLoanAmount ?? 0),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return payrollErrorResponse(err);
  }
}
