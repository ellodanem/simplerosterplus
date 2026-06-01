import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { serializePayPeriodDetail } from "@/lib/pay-period-db";
import { parsePayPeriodRows, rowsEqual } from "@/lib/pay-period-rows";
import { apiErrorResponse } from "@/lib/api-error";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const period = await prisma.payPeriod.findFirst({
    where: { id, organizationId: session.orgId },
  });
  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ period: serializePayPeriodDetail(period) });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.payPeriod.findFirst({
    where: { id, organizationId: session.orgId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    rows?: Prisma.InputJsonValue;
    notes?: string;
    rowsBeforeLastEdit?: Prisma.InputJsonValue | typeof Prisma.DbNull;
  } = {};

  if (body.notes !== undefined) {
    if (typeof body.notes !== "string") {
      return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
    }
    data.notes = body.notes;
  }

  if (body.rows !== undefined) {
    let nextRows;
    try {
      nextRows = parsePayPeriodRows(body.rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid rows";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const prevRows = parsePayPeriodRows(existing.rows);
    if (!rowsEqual(prevRows, nextRows)) {
      data.rowsBeforeLastEdit = prevRows;
      data.rows = nextRows;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ period: serializePayPeriodDetail(existing) });
  }

  try {
    const updated = await prisma.payPeriod.update({
      where: { id },
      data,
    });
    return NextResponse.json({ period: serializePayPeriodDetail(updated) });
  } catch (err) {
    return apiErrorResponse(err, "pay-period-patch");
  }
}
