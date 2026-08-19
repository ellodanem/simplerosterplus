import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  ABSENT_AFTER_DEFAULT,
  ABSENT_AFTER_KEY,
  GRACE_KEY,
  GRACE_MAX,
  LATE_AFTER_DEFAULT,
  LATE_AFTER_KEY,
} from "@/lib/attendance-week";
import { normalizeAbsentAfter } from "@/lib/attendance-policy";

/**
 * PUT /api/attendance/settings
 * Body: { lateAfterMinutes: number, absentAfterMinutes: number }
 * Also accepts legacy { graceMinutes } as an alias for lateAfterMinutes.
 *
 * Persists dual thresholds in AppSetting. Keeps writing the legacy grace key as
 * lateAfter so older readers stay coherent during rollout.
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

  function parseField(raw: unknown, label: string): number | null {
    if (raw === undefined || raw === null) return null;
    const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (!Number.isFinite(parsed)) {
      throw new Error(`${label} must be a number`);
    }
    const minutes = Math.round(parsed);
    if (minutes < 0 || minutes > GRACE_MAX) {
      throw new Error(`${label} must be between 0 and ${GRACE_MAX}`);
    }
    return minutes;
  }

  let lateAfter: number;
  let absentAfter: number;
  try {
    const lateRaw =
      body.lateAfterMinutes !== undefined ? body.lateAfterMinutes : body.graceMinutes;
    const parsedLate = parseField(lateRaw, "lateAfterMinutes");
    const parsedAbsent = parseField(body.absentAfterMinutes, "absentAfterMinutes");

    lateAfter = parsedLate ?? LATE_AFTER_DEFAULT;
    absentAfter =
      parsedAbsent ??
      normalizeAbsentAfter(lateAfter, Math.max(ABSENT_AFTER_DEFAULT, lateAfter + 1));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid settings" },
      { status: 400 },
    );
  }

  if (absentAfter <= lateAfter) {
    return NextResponse.json(
      { error: "absentAfterMinutes must be greater than lateAfterMinutes" },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: {
        organizationId_key: { organizationId: session.orgId, key: LATE_AFTER_KEY },
      },
      create: {
        organizationId: session.orgId,
        key: LATE_AFTER_KEY,
        value: String(lateAfter),
      },
      update: { value: String(lateAfter) },
    }),
    prisma.appSetting.upsert({
      where: {
        organizationId_key: { organizationId: session.orgId, key: ABSENT_AFTER_KEY },
      },
      create: {
        organizationId: session.orgId,
        key: ABSENT_AFTER_KEY,
        value: String(absentAfter),
      },
      update: { value: String(absentAfter) },
    }),
    // Keep legacy key aligned with lateAfter for any leftover readers.
    prisma.appSetting.upsert({
      where: {
        organizationId_key: { organizationId: session.orgId, key: GRACE_KEY },
      },
      create: {
        organizationId: session.orgId,
        key: GRACE_KEY,
        value: String(lateAfter),
      },
      update: { value: String(lateAfter) },
    }),
  ]);

  const { trackOrgMilestone } = await import("@/lib/onboarding-funnel/track-org");
  trackOrgMilestone({
    stage: "attendance_setup_started",
    organizationId: session.orgId,
    userId: session.sub,
    source: "attendance_settings",
  });

  return NextResponse.json({
    lateAfterMinutes: lateAfter,
    absentAfterMinutes: absentAfter,
    graceMinutes: lateAfter,
  });
}
