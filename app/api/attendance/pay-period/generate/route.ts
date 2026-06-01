import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolveLocation } from "@/lib/location";
import { generatePayPeriodReport } from "@/lib/pay-period-generate";
import { YMD_RE } from "@/lib/pay-period-types";
import { apiErrorResponse } from "@/lib/api-error";

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
  if (startDate > endDate) {
    return NextResponse.json({ error: "startDate must be on or before endDate" }, { status: 400 });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: session.orgId },
      select: { id: true, name: true, timeZone: true },
    });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const url = new URL(request.url);
    const locParam =
      url.searchParams.get("location") ??
      (typeof body.location === "string" ? body.location : null);
    const location = await resolveLocation(org.id, locParam);
    const timeZone = location.timeZone ?? org.timeZone;
    const entityName =
      typeof body.entityName === "string" && body.entityName.trim()
        ? body.entityName.trim()
        : org.name;

    const draft = await generatePayPeriodReport({
      organizationId: org.id,
      locationId: location.id,
      timeZone,
      startDate,
      endDate,
      entityName,
    });

    return NextResponse.json({ ...draft, locationId: location.id });
  } catch (err) {
    return apiErrorResponse(err, "pay-period-generate");
  }
}
