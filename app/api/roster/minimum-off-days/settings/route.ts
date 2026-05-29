import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  clampMinimumOffDays,
  isValidMinimumOffDays,
  type MinimumOffDaysSettings,
} from "@/lib/minimum-off-days";
import {
  getMinimumOffDaysSettings,
  MINIMUM_OFF_DAYS_ENABLED_KEY,
  MINIMUM_OFF_DAYS_KEY,
} from "@/lib/minimum-off-days-settings";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getMinimumOffDaysSettings(session.orgId);
  return NextResponse.json(settings);
}

/**
 * PUT /api/roster/minimum-off-days/settings
 * Body: { enabled: boolean, minimumOffDays: number }
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

  const rawMinimum = body.minimumOffDays;
  const parsedMinimum =
    typeof rawMinimum === "number"
      ? rawMinimum
      : typeof rawMinimum === "string"
        ? Number(rawMinimum)
        : NaN;
  if (!Number.isFinite(parsedMinimum)) {
    return NextResponse.json(
      { error: "minimumOffDays must be a number" },
      { status: 400 },
    );
  }

  const minimumOffDays = clampMinimumOffDays(parsedMinimum);
  if (!isValidMinimumOffDays(parsedMinimum)) {
    return NextResponse.json(
      { error: `minimumOffDays must be between 0 and 7` },
      { status: 400 },
    );
  }

  await Promise.all([
    prisma.appSetting.upsert({
      where: {
        organizationId_key: {
          organizationId: session.orgId,
          key: MINIMUM_OFF_DAYS_ENABLED_KEY,
        },
      },
      create: {
        organizationId: session.orgId,
        key: MINIMUM_OFF_DAYS_ENABLED_KEY,
        value: rawEnabled ? "true" : "false",
      },
      update: { value: rawEnabled ? "true" : "false" },
    }),
    prisma.appSetting.upsert({
      where: {
        organizationId_key: {
          organizationId: session.orgId,
          key: MINIMUM_OFF_DAYS_KEY,
        },
      },
      create: {
        organizationId: session.orgId,
        key: MINIMUM_OFF_DAYS_KEY,
        value: String(minimumOffDays),
      },
      update: { value: String(minimumOffDays) },
    }),
  ]);

  const settings: MinimumOffDaysSettings = {
    enabled: rawEnabled,
    minimumOffDays,
  };
  return NextResponse.json(settings);
}
