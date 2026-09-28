import { NextResponse } from "next/server";
import { payrollErrorResponse, requirePayrollAccess } from "@/lib/payroll/access";
import { listStaffPay } from "@/lib/payroll/people";

export async function GET() {
  try {
    const access = await requirePayrollAccess();
    const people = await listStaffPay(access);
    return NextResponse.json({ people });
  } catch (err) {
    return payrollErrorResponse(err);
  }
}
