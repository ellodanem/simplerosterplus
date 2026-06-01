import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolveLocation } from "@/lib/location";
import { utcDateFromYmd } from "@/lib/datetime-policy";
import { formatYmdInZone } from "@/lib/datetime-policy";
import { filePunchesForPayPeriod } from "@/lib/pay-period-generate";
import { serializePayPeriodDetail, serializePayPeriodListItem } from "@/lib/pay-period-db";
import { parsePayPeriodRows } from "@/lib/pay-period-rows";
import { YMD_RE } from "@/lib/pay-period-types";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const location = await resolveLocation(session.orgId, url.searchParams.get("location"));

  if (url.searchParams.get("latestSaved") === "1") {
    const latest = await prisma.payPeriod.findFirst({
      where: { organizationId: session.orgId, locationId: location.id },
      orderBy: [{ endDate: "desc" }, { createdAt: "desc" }],
    });
    if (!latest) return NextResponse.json({ latest: null });
    return NextResponse.json({ latest: serializePayPeriodDetail(latest) });
  }

  const periods = await prisma.payPeriod.findMany({
    where: { organizationId: session.orgId, locationId: location.id },
    orderBy: [{ endDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    periods: periods.map(serializePayPeriodListItem),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const startDate = typeof body.startDate === "string" ? body.startDate.trim() : "";
  const endDate = typeof body.endDate === "string" ? body.endDate.trim() : "";
  if (!YMD_RE.test(startDate) || !YMD_RE.test(endDate)) {
    return NextResponse.json(
      { error: "startDate and endDate must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  let rows;
  try {
    rows = parsePayPeriodRows(body.rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid rows";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const notes = typeof body.notes === "string" ? body.notes : "";

  try {
    const org = await prisma.organization.findUnique({
      where: { id: session.orgId },
      select: { id: true, name: true, timeZone: true },
    });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const location = await resolveLocation(org.id, urlLocation(body, request));
    const timeZone = location.timeZone ?? org.timeZone;

    const reportDateStr =
      typeof body.reportDate === "string" && YMD_RE.test(body.reportDate)
        ? body.reportDate
        : formatYmdInZone(new Date(), timeZone);

    const entityName =
      typeof body.entityName === "string" && body.entityName.trim()
        ? body.entityName.trim()
        : org.name;

    const filedAt = new Date();
    const created = await prisma.$transaction(async (tx) => {
      const period = await tx.payPeriod.create({
        data: {
          organizationId: org.id,
          locationId: location.id,
          startDate: utcDateFromYmd(startDate),
          endDate: utcDateFromYmd(endDate),
          reportDate: utcDateFromYmd(reportDateStr),
          entityName,
          rows,
          notes,
        },
      });
      await filePunchesForPayPeriod(
        {
          organizationId: org.id,
          locationId: location.id,
          timeZone,
          startDate,
          endDate,
          payPeriodId: period.id,
          filedAt,
        },
        tx,
      );
      return period;
    });

    const full = await prisma.payPeriod.findUniqueOrThrow({ where: { id: created.id } });
    return NextResponse.json({ period: serializePayPeriodDetail(full) });
  } catch (err) {
    return apiErrorResponse(err, "pay-period-create");
  }
}

function urlLocation(body: Record<string, unknown>, request: Request): string | null {
  if (typeof body.locationId === "string") return body.locationId;
  return new URL(request.url).searchParams.get("location");
}
