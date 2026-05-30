import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolveLocation } from "@/lib/location";
import {
  getStaffAttendanceReport,
  MAX_REPORT_RANGE_DAYS,
  ymdRangeInclusive,
} from "@/lib/staff-attendance-report";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const staffId = url.searchParams.get("staff");
  const startYmd = url.searchParams.get("start");
  const endYmd = url.searchParams.get("end");

  if (!staffId) {
    return NextResponse.json({ error: "staff is required" }, { status: 400 });
  }
  if (!startYmd || !YMD_RE.test(startYmd)) {
    return NextResponse.json({ error: "start must be YYYY-MM-DD" }, { status: 400 });
  }
  if (!endYmd || !YMD_RE.test(endYmd)) {
    return NextResponse.json({ error: "end must be YYYY-MM-DD" }, { status: 400 });
  }
  if (endYmd < startYmd) {
    return NextResponse.json({ error: "end must be on or after start" }, { status: 400 });
  }

  const days = ymdRangeInclusive(startYmd, endYmd);
  if (days.length > MAX_REPORT_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Date range cannot exceed ${MAX_REPORT_RANGE_DAYS} days` },
      { status: 400 },
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { id: true, timeZone: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const location = await resolveLocation(org.id, url.searchParams.get("location"));
  const timeZone = location.timeZone ?? org.timeZone;

  const report = await getStaffAttendanceReport({
    organizationId: org.id,
    locationId: location.id,
    staffId,
    startYmd,
    endYmd,
    timeZone,
  });

  if (!report) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}
