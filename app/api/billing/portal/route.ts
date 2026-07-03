import { NextResponse } from "next/server";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { getSession, isReadOnlySession } from "@/lib/session";
import { createBillingPortalSession } from "@/lib/stripe-billing";
import { stripeConfigured } from "@/lib/ops/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isReadOnlySession(session)) {
    return NextResponse.json({ error: "Read-only session" }, { status: 403 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Billing is not configured yet" }, { status: 503 });
  }

  try {
    const { url } = await createBillingPortalSession({
      organizationId: session.orgId,
      request,
    });
    return NextResponse.json({ url });
  } catch (err) {
    return uncaughtApiErrorResponse(err);
  }
}
