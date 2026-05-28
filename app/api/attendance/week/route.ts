import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolveLocation } from "@/lib/location";
import { getAttendanceWeekData } from "@/lib/attendance-week";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStartYmd = new URL(request.url).searchParams.get("week");
  if (!weekStartYmd || !YMD_RE.test(weekStartYmd)) {
    return NextResponse.json({ error: "week must be YYYY-MM-DD" }, { status: 400 });
  }

  const url = new URL(request.url);
  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { id: true, timeZone: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const location = await resolveLocation(org.id, url.searchParams.get("location"));
  const timeZone = location.timeZone ?? org.timeZone;
  const data = await getAttendanceWeekData({
    organizationId: org.id,
    locationId: location.id,
    weekStartYmd,
    timeZone,
  });

  return NextResponse.json(data);
}
