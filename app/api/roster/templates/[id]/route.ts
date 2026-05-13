import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAllowedSwatch } from "@/lib/shift-colors";

const TEMPLATE_SELECT = {
  id: true,
  name: true,
  startTime: true,
  endTime: true,
  color: true,
} as const;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.shiftTemplate.findFirst({
    where: { id, organizationId: session.orgId },
    select: TEMPLATE_SELECT,
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Prisma.ShiftTemplateUpdateInput = {};

  if (typeof body.name === "string") {
    const v = body.name.trim();
    if (!v) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = v;
  }
  if (typeof body.startTime === "string") {
    const v = body.startTime.trim();
    if (!TIME_RE.test(v)) {
      return NextResponse.json({ error: "startTime must be HH:MM" }, { status: 400 });
    }
    data.startTime = v;
  }
  if (typeof body.endTime === "string") {
    const v = body.endTime.trim();
    if (!TIME_RE.test(v)) {
      return NextResponse.json({ error: "endTime must be HH:MM" }, { status: 400 });
    }
    data.endTime = v;
  }
  if (typeof body.color === "string") {
    const v = body.color.trim();
    if (!isAllowedSwatch(v)) {
      return NextResponse.json({ error: "color must be one of the allowed swatches" }, { status: 400 });
    }
    data.color = v;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ template: existing });
  }

  const template = await prisma.shiftTemplate.update({
    where: { id },
    data,
    select: TEMPLATE_SELECT,
  });
  return NextResponse.json({ template });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.shiftTemplate.findFirst({
    where: { id, organizationId: session.orgId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.shiftTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
