import { NextResponse } from "next/server";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";
import { stripeConfigured } from "@/lib/ops/stripe";
import { syncOrgFromStripe } from "@/lib/ops/stripe-sync";

// Pull this org's current subscription from Stripe and refresh the mirror columns. Useful
// when a webhook was missed. Billing role or higher.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardOperatorApi("billing");
  if (!guard.ok) return guard.response;

  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const { id } = await params;
  const result = await syncOrgFromStripe(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? "Sync failed" }, { status: 409 });
  }

  await recordOperatorAudit({
    operatorUserId: guard.ctx.operatorUserId,
    action: "billing.sync_stripe",
    targetType: "organization",
    targetId: id,
    organizationId: id,
  });

  return NextResponse.json({ ok: true });
}
