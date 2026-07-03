import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getSchedulingRulesSettings,
  saveSchedulingRulesSettings,
} from "@/lib/roster-scheduling-rules-settings";
import {
  DEFAULT_SUNDAY_ANCHOR_WEEKDAY,
  parseRoleNamesCsv,
  parseSundayAnchorWeekday,
  parseWeekdayList,
  type SchedulingRulesSettings,
} from "@/lib/roster-scheduling-rules";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSchedulingRulesSettings(session.orgId);
  return NextResponse.json(settings);
}

/**
 * PUT /api/roster/scheduling-rules/settings
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

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  const supervisor = body.supervisorNoWeekendOff;
  const sunday = body.sundayOrWeekdayOff;
  if (!supervisor || typeof supervisor !== "object" || !sunday || typeof sunday !== "object") {
    return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
  }

  const supervisorObj = supervisor as Record<string, unknown>;
  const sundayObj = sunday as Record<string, unknown>;

  if (typeof supervisorObj.enabled !== "boolean") {
    return NextResponse.json({ error: "supervisorNoWeekendOff.enabled must be a boolean" }, { status: 400 });
  }
  if (typeof sundayObj.enabled !== "boolean") {
    return NextResponse.json({ error: "sundayOrWeekdayOff.enabled must be a boolean" }, { status: 400 });
  }

  const roleNames =
    typeof supervisorObj.roleNames === "string"
      ? parseRoleNamesCsv(supervisorObj.roleNames)
      : Array.isArray(supervisorObj.roleNames)
        ? supervisorObj.roleNames
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean)
        : parseRoleNamesCsv(null);

  const weekdays =
    typeof supervisorObj.weekdays === "string"
      ? parseWeekdayList(supervisorObj.weekdays)
      : Array.isArray(supervisorObj.weekdays)
        ? supervisorObj.weekdays
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
        : parseWeekdayList(null);

  const anchorWeekday =
    typeof sundayObj.anchorWeekday === "number"
      ? parseSundayAnchorWeekday(String(sundayObj.anchorWeekday))
      : typeof sundayObj.anchorWeekday === "string"
        ? parseSundayAnchorWeekday(sundayObj.anchorWeekday)
        : DEFAULT_SUNDAY_ANCHOR_WEEKDAY;

  const nextSettings: SchedulingRulesSettings = {
    enabled: body.enabled,
    supervisorNoWeekendOff: {
      enabled: supervisorObj.enabled,
      roleNames,
      weekdays: weekdays.length > 0 ? weekdays : parseWeekdayList(null),
    },
    sundayOrWeekdayOff: {
      enabled: sundayObj.enabled,
      anchorWeekday,
      rotateAnchorWeek:
        typeof sundayObj.rotateAnchorWeek === "boolean" ? sundayObj.rotateAnchorWeek : false,
    },
  };

  const saved = await saveSchedulingRulesSettings(session.orgId, nextSettings);
  return NextResponse.json(saved);
}
