import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveLocation } from "@/lib/location";
import {
  buildLateAbsentCsv,
  getLateAbsentExportRows,
  resolveLateAbsentRange,
  type LateAbsentPreset,
} from "@/lib/late-absent-summary";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function parsePreset(raw: string | null): LateAbsentPreset {
  if (raw === "last" || raw === "custom") return raw;
  return "this";
}

/** GET /api/attendance/late-absent/csv?location=&preset=&start=&end= */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { timeZone: true },
  });
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const location = await resolveLocation(session.orgId, url.searchParams.get("location"));
  const timeZone = location.timeZone ?? org.timeZone;
  const preset = parsePreset(url.searchParams.get("preset"));
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  const range = await resolveLateAbsentRange({
    locationId: location.id,
    timeZone,
    preset,
    startYmd: start && YMD_RE.test(start) ? start : undefined,
    endYmd: end && YMD_RE.test(end) ? end : undefined,
  });
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  const { summary, incidentDays } = await getLateAbsentExportRows({
    organizationId: session.orgId,
    locationId: location.id,
    startYmd: range.startYmd,
    endYmd: range.endYmd,
    timeZone,
    periodLabel: range.periodLabel,
  });

  const csv = buildLateAbsentCsv(summary, incidentDays);
  const filename = `late-absent-${range.startYmd}-to-${range.endYmd}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
