import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  clampOvertimeThresholdHours,
  isValidOvertimeThresholdHours,
  OVERTIME_WEEKLY_THRESHOLD_STEP,
  type OvertimeSettings,
} from "@/lib/overtime";
import {
  getOvertimeSettings,
  OVERTIME_ENABLED_KEY,
  OVERTIME_WEEKLY_THRESHOLD_KEY,
} from "@/lib/overtime-settings";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getOvertimeSettings(session.orgId);
  return NextResponse.json(settings);
}

/**
 * PUT /api/overtime/settings
 * Body: { enabled: boolean, weeklyThresholdHours: number }
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

  const rawEnabled = body.enabled;
  if (typeof rawEnabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  const rawThreshold = body.weeklyThresholdHours;
  const parsedThreshold =
    typeof rawThreshold === "number"
      ? rawThreshold
      : typeof rawThreshold === "string"
        ? Number(rawThreshold)
        : NaN;
  if (!Number.isFinite(parsedThreshold)) {
    return NextResponse.json(
      { error: "weeklyThresholdHours must be a number" },
      { status: 400 },
    );
  }

  const weeklyThresholdHours = clampOvertimeThresholdHours(parsedThreshold);
  if (!isValidOvertimeThresholdHours(parsedThreshold)) {
    return NextResponse.json(
      {
        error: `weeklyThresholdHours must be between 1 and 168 in ${OVERTIME_WEEKLY_THRESHOLD_STEP}-hour increments`,
      },
      { status: 400 },
    );
  }

  await Promise.all([
    prisma.appSetting.upsert({
      where: {
        organizationId_key: {
          organizationId: session.orgId,
          key: OVERTIME_ENABLED_KEY,
        },
      },
      create: {
        organizationId: session.orgId,
        key: OVERTIME_ENABLED_KEY,
        value: rawEnabled ? "true" : "false",
      },
      update: { value: rawEnabled ? "true" : "false" },
    }),
    prisma.appSetting.upsert({
      where: {
        organizationId_key: {
          organizationId: session.orgId,
          key: OVERTIME_WEEKLY_THRESHOLD_KEY,
        },
      },
      create: {
        organizationId: session.orgId,
        key: OVERTIME_WEEKLY_THRESHOLD_KEY,
        value: String(weeklyThresholdHours),
      },
      update: { value: String(weeklyThresholdHours) },
    }),
  ]);

  const settings: OvertimeSettings = {
    enabled: rawEnabled,
    weeklyThresholdHours,
  };
  return NextResponse.json(settings);
}
