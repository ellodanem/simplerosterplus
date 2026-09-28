import { NextResponse } from "next/server";
import { payrollErrorResponse } from "@/lib/payroll/access";
import { voidOne } from "@/lib/payroll/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const run = await voidOne(request, id);
    return NextResponse.json({ run });
  } catch (err) {
    return payrollErrorResponse(err);
  }
}
