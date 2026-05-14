import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDefaultLocation } from "@/lib/location";

/**
 * POST /api/attendance/punches
 * Body: { staffId, punchAt: ISO, punchType: "in" | "out", note? }
 *
 * Creates one manual punch. Mirrors the per-cell `PUT /api/roster/.../entries` style: the
 * client posts one record per user action, the server handles scoping + validation, and
 * the page re-fetches via `router.refresh()` to recompute presence.
 *
 * v1 is manual-only — `source` is forced to `manual`. Device-sourced ingest will get its
 * own route under `/api/attendance/ingest` when the ADMS pipeline lands.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const staffId = typeof body.staffId === "string" ? body.staffId : "";
  const punchAtRaw = typeof body.punchAt === "string" ? body.punchAt : "";
  const punchType = body.punchType;
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!staffId) {
    return NextResponse.json({ error: "staffId is required" }, { status: 400 });
  }
  if (punchType !== "in" && punchType !== "out") {
    return NextResponse.json({ error: "punchType must be 'in' or 'out'" }, { status: 400 });
  }

  const punchAt = new Date(punchAtRaw);
  if (Number.isNaN(punchAt.getTime())) {
    return NextResponse.json({ error: "punchAt must be a valid ISO timestamp" }, { status: 400 });
  }
  // Sanity bound: refuse anything more than a day in the future. Catches typos like a year
  // bumped one digit and obvious mistakes without preventing "just-clocked-in-now" entries
  // when client clock drifts a little.
  if (punchAt.getTime() > Date.now() + 24 * 60 * 60_000) {
    return NextResponse.json({ error: "punchAt cannot be more than a day in the future" }, { status: 400 });
  }

  const location = await getDefaultLocation(session.orgId);

  const staff = await prisma.staff.findFirst({
    where: {
      id: staffId,
      organizationId: session.orgId,
      locationId: location.id,
    },
    select: { id: true },
  });
  if (!staff) {
    return NextResponse.json({ error: "Staff not found at this location" }, { status: 404 });
  }

  const user = await prisma.appUser.findFirst({
    where: { id: session.sub, organizationId: session.orgId },
    select: { id: true },
  });

  const punch = await prisma.attendanceLog.create({
    data: {
      organizationId: session.orgId,
      locationId: location.id,
      staffId: staff.id,
      punchAt,
      punchType,
      source: "manual",
      note: note || null,
      createdByUserId: user?.id ?? null,
    },
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
  }, { status: 201 });
}
