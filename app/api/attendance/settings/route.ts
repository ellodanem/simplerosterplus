import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { GRACE_KEY, GRACE_MAX } from "@/lib/attendance-week";

/**
 * PUT /api/attendance/settings
 * Body: { graceMinutes: number }
 *
 * Per-org attendance settings. v1 stores a single value (`attendance_grace_minutes`) in
 * `AppSetting`. Same `(organizationId, key)` upsert pattern the seed uses so this route
 * can never create a duplicate row.
 *
 * No RBAC gate yet — SR+ is single-admin per org for v1. When roles land, restrict this
 * to org admins.
 */
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.graceMinutes;
  // Accept number or numeric string — HTML <input type="number"> serializes either depending
  // on the form library, and we don't want a UI library quirk to surface as a 400.
  const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) {
    return NextResponse.json({ error: "graceMinutes must be a number" }, { status: 400 });
  }
  const minutes = Math.round(parsed);
  if (minutes < 0 || minutes > GRACE_MAX) {
    return NextResponse.json(
      { error: `graceMinutes must be between 0 and ${GRACE_MAX}` },
      { status: 400 },
    );
  }

  await prisma.appSetting.upsert({
    where: {
      organizationId_key: { organizationId: session.orgId, key: GRACE_KEY },
    },
    create: {
      organizationId: session.orgId,
      key: GRACE_KEY,
      value: String(minutes),
    },
    update: { value: String(minutes) },
  });

  return NextResponse.json({ graceMinutes: minutes });
}
