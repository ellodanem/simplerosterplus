import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDefaultLocation } from "@/lib/location";

type Ctx = { params: Promise<{ id: string }> };

async function loadPunch(id: string, organizationId: string, locationId: string) {
  return prisma.attendanceLog.findFirst({
    where: { id, organizationId, locationId },
    select: {
      id: true,
      punchAt: true,
      punchType: true,
      originalPunchAt: true,
      extractedAt: true,
    },
  });
}

/**
 * PATCH /api/attendance/punches/[id]
 * Body: { punchAt?: ISO, punchType?: "in" | "out", note?: string | null }
 *
 * Edits an existing punch. When `punchAt` actually changes value, we record the prior
 * timestamp in `originalPunchAt` (first edit only — subsequent edits keep the *first*
 * original so the audit trail tells you what the device/operator originally entered, not
 * what the most recent edit was correcting). This drives the `CORRECTED` pill in the log
 * drawer.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const location = await getDefaultLocation(session.orgId);
  const existing = await loadPunch(id, session.orgId, location.id);
  if (!existing) return NextResponse.json({ error: "Punch not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    punchAt?: Date;
    punchType?: "in" | "out";
    note?: string | null;
    originalPunchAt?: Date;
    correctedByUserId?: string | null;
    correctedAt?: Date;
  } = {};

  let timeChanged = false;

  if (body.punchAt !== undefined) {
    if (typeof body.punchAt !== "string") {
      return NextResponse.json({ error: "punchAt must be an ISO string" }, { status: 400 });
    }
    const next = new Date(body.punchAt);
    if (Number.isNaN(next.getTime())) {
      return NextResponse.json({ error: "punchAt must be a valid ISO timestamp" }, { status: 400 });
    }
    if (next.getTime() > Date.now() + 24 * 60 * 60_000) {
      return NextResponse.json({ error: "punchAt cannot be more than a day in the future" }, { status: 400 });
    }
    if (next.getTime() !== existing.punchAt.getTime()) {
      data.punchAt = next;
      timeChanged = true;
    }
  }

  if (body.punchType !== undefined) {
    if (body.punchType !== "in" && body.punchType !== "out") {
      return NextResponse.json({ error: "punchType must be 'in' or 'out'" }, { status: 400 });
    }
    if (body.punchType !== existing.punchType) {
      data.punchType = body.punchType;
    }
  }

  if (body.note !== undefined) {
    if (body.note === null) {
      data.note = null;
    } else if (typeof body.note === "string") {
      const trimmed = body.note.trim();
      data.note = trimmed === "" ? null : trimmed;
    } else {
      return NextResponse.json({ error: "note must be a string or null" }, { status: 400 });
    }
  }

  if (timeChanged) {
    // First-edit semantics: preserve the very first observed time. Re-editing a corrected
    // row keeps the same `originalPunchAt` because that's what an auditor cares about.
    if (existing.originalPunchAt === null) {
      data.originalPunchAt = existing.punchAt;
    }
    const user = await prisma.appUser.findFirst({
      where: { id: session.sub, organizationId: session.orgId },
      select: { id: true },
    });
    data.correctedByUserId = user?.id ?? null;
    data.correctedAt = new Date();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const punch = await prisma.attendanceLog.update({
    where: { id, organizationId: session.orgId },
    data,
    select: {
      id: true,
      staffId: true,
      punchAt: true,
      punchType: true,
      source: true,
      note: true,
      originalPunchAt: true,
    },
  });

  return NextResponse.json({
    punch: {
      id: punch.id,
      staffId: punch.staffId,
      punchAt: punch.punchAt.toISOString(),
      punchType: punch.punchType,
      source: punch.source,
      note: punch.note,
      corrected: punch.originalPunchAt !== null,
      originalPunchAt: punch.originalPunchAt ? punch.originalPunchAt.toISOString() : null,
    },
  });
}

/**
 * DELETE /api/attendance/punches/[id]
 * Hard delete. Punches are immutable events from a payroll perspective once filed, but
 * v1 doesn't have a pay period yet so there's no "extracted, can't delete" check to make.
 * When pay period lands, gate this on `extractedAt == null`.
 */
export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const location = await getDefaultLocation(session.orgId);
  const existing = await loadPunch(id, session.orgId, location.id);
  if (!existing) return NextResponse.json({ error: "Punch not found" }, { status: 404 });
  if (existing.extractedAt) {
    return NextResponse.json(
      { error: "This punch was filed in an Extract Pay Period and cannot be deleted." },
      { status: 409 },
    );
  }

  await prisma.attendanceLog.delete({ where: { id, organizationId: session.orgId } });
  return NextResponse.json({ ok: true });
}
