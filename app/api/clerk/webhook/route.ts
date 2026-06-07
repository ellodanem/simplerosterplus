import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { ensureAppUserFromClerk, ensureOrganizationFromClerk } from "@/lib/clerk/provision";
import { clerkConfigured } from "@/lib/clerk/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function emailFromUserCreated(data: WebhookEvent["data"]): string | null {
  if (!("email_addresses" in data) || !Array.isArray(data.email_addresses)) {
    return null;
  }
  const addresses = data.email_addresses as Array<{ email_address?: string }>;
  return addresses[0]?.email_address?.trim().toLowerCase() ?? null;
}

export async function POST(request: NextRequest) {
  if (!clerkConfigured() || !process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    return NextResponse.json({ error: "Clerk webhooks are not configured" }, { status: 503 });
  }

  let event: WebhookEvent;
  try {
    event = await verifyWebhook(request);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "organization.created": {
        const { id, name } = event.data as { id: string; name: string };
        await ensureOrganizationFromClerk({ clerkOrgId: id, orgName: name });
        break;
      }
      case "organizationMembership.created": {
        const data = event.data as {
          organization: { id: string; name?: string };
          public_user_data: { user_id: string; identifier?: string };
          role?: string;
        };
        const email =
          data.public_user_data.identifier?.trim().toLowerCase() ??
          emailFromUserCreated(event.data);
        if (!email) break;
        await ensureAppUserFromClerk({
          clerkOrgId: data.organization.id,
          orgName: data.organization.name ?? "My organization",
          clerkUserId: data.public_user_data.user_id,
          email,
          clerkRole: data.role,
        });
        break;
      }
      case "organizationMembership.updated": {
        const data = event.data as {
          organization: { id: string; name?: string };
          public_user_data: { user_id: string; identifier?: string };
          role?: string;
        };
        const email =
          data.public_user_data.identifier?.trim().toLowerCase() ??
          emailFromUserCreated(event.data);
        if (!email) break;
        await ensureAppUserFromClerk({
          clerkOrgId: data.organization.id,
          orgName: data.organization.name ?? "My organization",
          clerkUserId: data.public_user_data.user_id,
          email,
          clerkRole: data.role,
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("clerk webhook handler error", { type: event.type, err });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
