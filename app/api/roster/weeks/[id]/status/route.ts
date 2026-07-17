import { NextResponse } from "next/server";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getRosterWeekCoverageGaps, newRosterShareToken, rosterSharePath } from "@/lib/roster-share";
import { sendRosterWhatsappOnPublish } from "@/lib/messaging/roster-whatsapp-notify";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/roster/weeks/[id]/status
 * Body: { action: "publish" | "unpublish", acknowledgeGaps?: boolean }
 */
export async function POST(request: Request, { params }: Ctx) {
  try {
    return await postRosterWeekStatus(request, params);
  } catch (err) {
    return uncaughtApiErrorResponse(err, "roster week status");
  }
}

async function postRosterWeekStatus(request: Request, params: Promise<{ id: string }>) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: weekId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "publish" && action !== "unpublish") {
    return NextResponse.json(
      { error: 'action must be "publish" or "unpublish"' },
      { status: 400 },
    );
  }

  const week = await prisma.rosterWeek.findFirst({
    where: { id: weekId, organizationId: session.orgId },
    select: { id: true, status: true, shareToken: true },
  });
  if (!week) {
    return NextResponse.json({ error: "Roster week not found" }, { status: 404 });
  }

  if (action === "unpublish") {
    const updated = await prisma.rosterWeek.update({
      where: { id: week.id },
      data: { status: "draft" },
      select: { id: true, status: true, shareToken: true },
    });
    return NextResponse.json({
      status: updated.status,
      shareToken: updated.shareToken,
      sharePath: updated.shareToken ? rosterSharePath(updated.shareToken) : null,
    });
  }

  const acknowledgeGaps = body.acknowledgeGaps === true;
  const gaps = await getRosterWeekCoverageGaps(week.id);
  if (gaps && gaps.openShiftCount > 0 && !acknowledgeGaps) {
    return NextResponse.json(
      {
        error: "This week still has open slots. Confirm to publish anyway.",
        openShiftCount: gaps.openShiftCount,
        openShiftDayYmd: gaps.openShiftDayYmd,
        openShiftDayLabel: gaps.openShiftDayLabel,
        code: "OPEN_SHIFTS",
      },
      { status: 409 },
    );
  }

  const shareToken = week.shareToken ?? newRosterShareToken();
  const updated = await prisma.rosterWeek.update({
    where: { id: week.id },
    data: {
      status: "published",
      shareToken,
    },
    select: { id: true, status: true, shareToken: true, updatedAt: true },
  });

  const { trackRosterPublished } = await import("@/lib/onboarding-funnel/track-roster");
  trackRosterPublished({ organizationId: session.orgId, userId: session.sub });

  const whatsapp = await sendRosterWhatsappOnPublish({
    organizationId: session.orgId,
    rosterWeekId: updated.id,
    rosterWeekPublishAt: updated.updatedAt,
    request,
  });

  return NextResponse.json({
    status: updated.status,
    shareToken: updated.shareToken,
    sharePath: updated.shareToken ? rosterSharePath(updated.shareToken) : null,
    openShiftCount: gaps?.openShiftCount ?? 0,
    whatsapp,
  });
}
