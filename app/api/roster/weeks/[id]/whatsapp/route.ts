import { NextResponse } from "next/server";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { sendRosterWhatsappOnPublish } from "@/lib/messaging/roster-whatsapp-notify";
import { getWhatsappAccess } from "@/lib/messaging/whatsapp-access";
import { twilioWhatsappConfigured } from "@/lib/messaging/twilio-whatsapp";
import { prisma } from "@/lib/prisma";
import { getSession, isReadOnlySession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/roster/weeks/[id]/whatsapp
 * Body: { mode?: "publish" | "direct" }
 *
 * Resends link-based WhatsApp alerts to opted-in staff (no image blast).
 * mode "direct" uses a fresh timestamp so each Share → WhatsApp (Direct) can retest.
 */
export async function POST(request: Request, { params }: Ctx) {
  try {
    return await postRosterWeekWhatsapp(request, params);
  } catch (err) {
    return uncaughtApiErrorResponse(err, "roster week whatsapp");
  }
}

async function postRosterWeekWhatsapp(request: Request, params: Promise<{ id: string }>) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isReadOnlySession(session)) {
    return NextResponse.json({ error: "Read-only session" }, { status: 403 });
  }

  const { id: weekId } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const mode = body.mode === "direct" ? "direct" : "publish";

  const week = await prisma.rosterWeek.findFirst({
    where: { id: weekId, organizationId: session.orgId, status: "published" },
    select: { id: true, updatedAt: true },
  });
  if (!week) {
    return NextResponse.json(
      { error: "Published roster week not found. Publish the week first." },
      { status: 404 },
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: {
      plan: true,
      isDemo: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      suspendedAt: true,
      addonWhatsapp: true,
      messagingWhatsappEnabled: true,
      whatsappSentMonth: true,
      whatsappSentCount: true,
    },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = getWhatsappAccess(org);
  if (!access.entitled) {
    return NextResponse.json({
      whatsapp: {
        configured: twilioWhatsappConfigured(),
        enabled: false,
        attempted: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        capReached: false,
        reasons: ["not_entitled"],
      },
    });
  }
  if (!org.messagingWhatsappEnabled) {
    return NextResponse.json({
      whatsapp: {
        configured: twilioWhatsappConfigured(),
        enabled: false,
        attempted: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        capReached: false,
        reasons: ["disabled"],
      },
    });
  }
  if (!twilioWhatsappConfigured() || !process.env.TWILIO_WHATSAPP_ROSTER_CONTENT_SID?.trim()) {
    return NextResponse.json({
      whatsapp: {
        configured: false,
        enabled: true,
        attempted: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        capReached: false,
        reasons: ["not_configured"],
      },
    });
  }

  const whatsapp = await sendRosterWhatsappOnPublish({
    organizationId: session.orgId,
    rosterWeekId: week.id,
    rosterWeekPublishAt: mode === "direct" ? new Date() : week.updatedAt,
    kind: mode === "direct" ? "direct" : "publish",
    request,
  });

  return NextResponse.json({ whatsapp });
}
