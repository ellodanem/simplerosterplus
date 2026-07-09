import { NextResponse } from "next/server";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { getWhatsappAccess } from "@/lib/messaging/whatsapp-access";
import { twilioWhatsappConfigured } from "@/lib/messaging/twilio-whatsapp";
import { prisma } from "@/lib/prisma";
import { getSession, isReadOnlySession } from "@/lib/session";

/**
 * GET /api/settings/messaging
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const whatsapp = getWhatsappAccess(org);

  return NextResponse.json({
    whatsapp: {
      ...whatsapp,
      configured: twilioWhatsappConfigured(),
      hasTemplate: Boolean(process.env.TWILIO_WHATSAPP_ROSTER_CONTENT_SID?.trim()),
    },
  });
}

/**
 * PATCH /api/settings/messaging
 * Body: { messagingWhatsappEnabled?: boolean }
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isReadOnlySession(session)) {
      return NextResponse.json({ error: "Read-only session" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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

    if (typeof body.messagingWhatsappEnabled !== "boolean") {
      return NextResponse.json(
        { error: "messagingWhatsappEnabled must be a boolean" },
        { status: 400 },
      );
    }

    const access = getWhatsappAccess(org);
    if (body.messagingWhatsappEnabled && !access.entitled) {
      return NextResponse.json(
        {
          error:
            "WhatsApp alerts require Plus with the WhatsApp add-on, or Pro. Upgrade in Settings → Billing.",
        },
        { status: 403 },
      );
    }

    const updated = await prisma.organization.update({
      where: { id: session.orgId },
      data: { messagingWhatsappEnabled: body.messagingWhatsappEnabled },
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

    const whatsapp = getWhatsappAccess(updated);

    return NextResponse.json({
      whatsapp: {
        ...whatsapp,
        configured: twilioWhatsappConfigured(),
        hasTemplate: Boolean(process.env.TWILIO_WHATSAPP_ROSTER_CONTENT_SID?.trim()),
      },
    });
  } catch (err) {
    return uncaughtApiErrorResponse(err, "settings messaging PATCH");
  }
}
