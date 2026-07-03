import { NextResponse } from "next/server";
import {
  applyAutoScheduler,
  AUTO_SCHEDULER_NO_PREVIOUS_SHIFTS_WARNING,
  previewAutoScheduler,
} from "@/lib/auto-scheduler";
import { prisma } from "@/lib/prisma";
import { ymdForDbDate } from "@/lib/roster-week";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

const NO_PREVIOUS_SHIFTS_WARNING = AUTO_SCHEDULER_NO_PREVIOUS_SHIFTS_WARNING;

/**
 * POST /api/roster/weeks/[id]/copy-previous
 * Copies shifts from the prior week into unlocked days of the target week.
 * Preserves locked days, closed holidays, and approved leave blocks.
 */
export async function POST(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: weekId } = await params;

  const preview = await previewAutoScheduler(weekId, session.orgId, "copy_previous");
  if ("error" in preview) {
    return NextResponse.json({ error: preview.error }, { status: preview.status });
  }

  if (preview.warnings.includes(NO_PREVIOUS_SHIFTS_WARNING)) {
    const existing = await prisma.rosterEntry.findMany({
      where: { rosterWeekId: weekId, shiftTemplateId: { not: null } },
      select: { staffId: true, date: true, shiftTemplateId: true },
    });
    return NextResponse.json({
      copied: 0,
      skipped: 0,
      entries: existing.map((e) => ({
        staffId: e.staffId,
        date: ymdForDbDate(e.date),
        shiftTemplateId: e.shiftTemplateId,
      })),
    });
  }

  const applied = await applyAutoScheduler(
    weekId,
    session.orgId,
    "copy_previous",
    preview.proposals,
  );
  if ("error" in applied) {
    return NextResponse.json({ error: applied.error }, { status: applied.status });
  }

  return NextResponse.json({
    copied: applied.applied,
    skipped: preview.skipped.length,
    entries: applied.entries,
  });
}
