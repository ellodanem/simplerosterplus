import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolveLocation } from "@/lib/location";
import { formatYmdInZone, startOfLocalDayUtc } from "@/lib/datetime-policy";
import { shiftYmd } from "@/lib/roster-week";
import { getAttendanceLogWindowDays } from "@/lib/attendance-log-window";
import { getAttendanceLogData } from "@/lib/attendance-log-data";
import { getLastFiledCutoffYmd } from "@/lib/pay-period-last-filed";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { id: true, timeZone: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const url = new URL(request.url);
  const location = await resolveLocation(org.id, url.searchParams.get("location"));
  const timeZone = location.timeZone ?? org.timeZone;
  const windowDays = getAttendanceLogWindowDays(url.searchParams.get("all"));
  const todayYmd = formatYmdInZone(new Date(), timeZone);
  const windowStartYmd = shiftYmd(todayYmd, -(windowDays - 1));
  const includeFiled = url.searchParams.get("includeFiled") === "1";
  const lastFiledCutoff = await getLastFiledCutoffYmd(location.id);
  const sinceYmd =
    lastFiledCutoff && lastFiledCutoff > windowStartYmd ? lastFiledCutoff : windowStartYmd;

  const data = await getAttendanceLogData({
    organizationId: org.id,
    locationId: location.id,
    timeZone,
    sinceDate: startOfLocalDayUtc(sinceYmd, timeZone),
    activeOnly: !includeFiled,
  });

  return NextResponse.json(data);
}
