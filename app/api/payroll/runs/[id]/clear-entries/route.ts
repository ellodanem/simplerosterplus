import { NextResponse } from "next/server";
import { payrollErrorResponse } from "@/lib/payroll/access";
import { clearOne } from "@/lib/payroll/http";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const run = await clearOne(id);
    return NextResponse.json({ run });
  } catch (err) {
    return payrollErrorResponse(err);
  }
}
