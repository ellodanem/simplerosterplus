import { NextResponse } from "next/server";
import { payrollErrorResponse } from "@/lib/payroll/access";
import { deleteOne, getOne, saveOne } from "@/lib/payroll/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const run = await getOne(request, id);
    return NextResponse.json({ run });
  } catch (err) {
    return payrollErrorResponse(err);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const run = await saveOne(request, id);
    return NextResponse.json({ run });
  } catch (err) {
    return payrollErrorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteOne(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return payrollErrorResponse(err);
  }
}
