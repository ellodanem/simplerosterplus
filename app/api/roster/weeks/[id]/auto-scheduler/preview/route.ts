import { NextResponse } from "next/server";
import { previewAutoScheduler, type AutoSchedulerMode } from "@/lib/auto-scheduler";
import { dayHeaderLabel } from "@/lib/roster-week";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { formatStaffFullName } from "@/lib/staff-display-name";

type Ctx = { params: Promise<{ id: string }> };

const MODES = new Set<AutoSchedulerMode>(["copy_previous", "fill_open"]);

export async function POST(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: weekId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode;
  if (mode !== "copy_previous" && mode !== "fill_open") {
    return NextResponse.json(
      { error: "mode must be copy_previous or fill_open" },
      { status: 400 },
    );
  }
  if (!MODES.has(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const result = await previewAutoScheduler(weekId, session.orgId, mode);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const week = await prisma.rosterWeek.findFirst({
    where: { id: weekId, organizationId: session.orgId },
    select: {
      location: { select: { timeZone: true } },
      organization: { select: { timeZone: true } },
    },
  });
  const timeZone = week?.location.timeZone ?? week?.organization.timeZone ?? "UTC";

  const staffIds = new Set<string>();
  const templateIds = new Set<string>();
  for (const p of result.proposals) {
    staffIds.add(p.staffId);
    templateIds.add(p.shiftTemplateId);
  }
  for (const s of result.skipped) {
    staffIds.add(s.staffId);
  }

  const [staffRows, templates] = await Promise.all([
    staffIds.size > 0
      ? prisma.staff.findMany({
          where: { id: { in: [...staffIds] }, organizationId: session.orgId },
          select: { id: true, firstName: true, lastName: true },
        })
      : [],
    templateIds.size > 0
      ? prisma.shiftTemplate.findMany({
          where: { id: { in: [...templateIds] }, organizationId: session.orgId },
          select: { id: true, name: true },
        })
      : [],
  ]);

  const staffNameById = new Map(
    staffRows.map((s) => [s.id, formatStaffFullName(s.firstName, s.lastName)]),
  );
  const templateNameById = new Map(templates.map((t) => [t.id, t.name]));

  return NextResponse.json({
    ...result,
    proposals: result.proposals.map((p) => ({
      ...p,
      staffName: staffNameById.get(p.staffId) ?? "Staff",
      shiftName: templateNameById.get(p.shiftTemplateId) ?? "Shift",
      dayLabel: dayHeaderLabel(p.date, timeZone).weekday,
    })),
    skipped: result.skipped.map((s) => ({
      ...s,
      staffName: staffNameById.get(s.staffId) ?? "Staff",
      dayLabel: dayHeaderLabel(s.date, timeZone).weekday,
    })),
  });
}
