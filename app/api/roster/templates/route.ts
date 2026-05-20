import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SHIFT_COLOR, isAllowedSwatch } from "@/lib/shift-colors";
import {
  parseUnpaidBreakMinutes,
  validateUnpaidBreak,
} from "@/lib/shift-duration";

const TEMPLATE_SELECT = {
  id: true,
  name: true,
  startTime: true,
  endTime: true,
  unpaidBreakMinutes: true,
  color: true,
} as const;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const templates = await prisma.shiftTemplate.findMany({
    where: { organizationId: session.orgId },
    orderBy: [{ name: "asc" }],
    select: TEMPLATE_SELECT,
  });
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const startTime = typeof body.startTime === "string" ? body.startTime.trim() : "";
  const endTime = typeof body.endTime === "string" ? body.endTime.trim() : "";
  const rawColor = typeof body.color === "string" ? body.color.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return NextResponse.json(
      { error: "startTime and endTime must be HH:MM (24-hour)" },
      { status: 400 },
    );
  }
  const color = rawColor && isAllowedSwatch(rawColor) ? rawColor : DEFAULT_SHIFT_COLOR;

  const unpaidBreakMinutes = parseUnpaidBreakMinutes(body.unpaidBreakMinutes);
  if (unpaidBreakMinutes === null) {
    return NextResponse.json(
      { error: "unpaidBreakMinutes must be a non-negative integer up to 480" },
      { status: 400 },
    );
  }
  const breakError = validateUnpaidBreak(startTime, endTime, unpaidBreakMinutes);
  if (breakError) {
    return NextResponse.json({ error: breakError }, { status: 400 });
  }

  const template = await prisma.shiftTemplate.create({
    data: {
      organizationId: session.orgId,
      name,
      startTime,
      endTime,
      unpaidBreakMinutes,
      color,
    },
    select: TEMPLATE_SELECT,
  });

  return NextResponse.json({ template }, { status: 201 });
}
