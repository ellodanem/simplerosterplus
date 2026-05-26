import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getDefaultLocation } from "@/lib/location";
import { formatYmdInZone, startOfLocalDayUtc } from "@/lib/datetime-policy";
import { shiftYmd } from "@/lib/roster-week";
import { getAttendanceLogWindowDays } from "@/lib/attendance-log-window";
import { getAttendanceLogData } from "@/lib/attendance-log-data";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { id: true, timeZone: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const location = await getDefaultLocation(org.id);
  const timeZone = location.timeZone ?? org.timeZone;
  const url = new URL(request.url);
  const windowDays = getAttendanceLogWindowDays(url.searchParams.get("all"));
  const todayYmd = formatYmdInZone(new Date(), timeZone);
  const windowStartYmd = shiftYmd(todayYmd, -(windowDays - 1));

  const data = await getAttendanceLogData({
    organizationId: org.id,
    locationId: location.id,
    timeZone,
    sinceDate: startOfLocalDayUtc(windowStartYmd, timeZone),
  });

  return NextResponse.json(data);
}
