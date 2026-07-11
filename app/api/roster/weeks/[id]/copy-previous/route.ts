import { NextResponse } from "next/server";
import { copyPreviousWeek } from "@/lib/auto-scheduler";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/roster/weeks/[id]/copy-previous
 * Copies shifts from the prior week into unlocked days of the target week.
 * Preserves locked days, closed holidays, and approved leave blocks.
 */
export async function POST(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: weekId } = await params;

  const result = await copyPreviousWeek(weekId, session.orgId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
