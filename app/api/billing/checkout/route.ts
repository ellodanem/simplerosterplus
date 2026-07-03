import { NextResponse } from "next/server";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { PLAN_PLUS, PLAN_PRO } from "@/lib/plans";
import { getSession, isReadOnlySession } from "@/lib/session";
import { createCheckoutSession, type CheckoutInterval } from "@/lib/stripe-billing";
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

  let body: { plan?: string; interval?: string };
  try {
    body = (await request.json()) as { plan?: string; interval?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan = body.plan === PLAN_PRO ? PLAN_PRO : PLAN_PLUS;
  const interval: CheckoutInterval = body.interval === "year" ? "year" : "month";

  try {
    const { url } = await createCheckoutSession({
      organizationId: session.orgId,
      email: session.email,
      plan,
      interval,
      request,
    });
    return NextResponse.json({ url });
  } catch (err) {
    return uncaughtApiErrorResponse(err);
  }
}
