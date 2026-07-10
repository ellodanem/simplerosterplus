import { NextResponse } from "next/server";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { uploadRosterWhatsappPng } from "@/lib/messaging/roster-blob";
import { sendRosterWhatsappOnPublish } from "@/lib/messaging/roster-whatsapp-notify";
import { getWhatsappAccess } from "@/lib/messaging/whatsapp-access";
import { twilioWhatsappConfigured } from "@/lib/messaging/twilio-whatsapp";
import { prisma } from "@/lib/prisma";
import { getSession, isReadOnlySession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/roster/weeks/[id]/whatsapp
 * Body: { imageBase64: string }
 *
 * Uploads the roster PNG once, then sends the approved media template
 * ({{1}} = public image URL) to opted-in staff.
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

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
    return NextResponse.json(
      {
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
      },
      { status: 200 },
    );
  }
  if (!org.messagingWhatsappEnabled) {
    return NextResponse.json(
      {
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
      },
      { status: 200 },
    );
  }
  if (!twilioWhatsappConfigured() || !process.env.TWILIO_WHATSAPP_ROSTER_CONTENT_SID?.trim()) {
    return NextResponse.json(
      {
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
      },
      { status: 200 },
    );
  }

  let mediaUrl: string;
  try {
    mediaUrl = await uploadRosterWhatsappPng(imageBase64);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not upload roster image";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const whatsapp = await sendRosterWhatsappOnPublish({
    organizationId: session.orgId,
    rosterWeekId: week.id,
    rosterWeekPublishAt: week.updatedAt,
    mediaUrl,
  });

  return NextResponse.json({ whatsapp });
}
