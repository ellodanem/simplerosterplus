import { NextResponse } from "next/server";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";
import { parseSetCompPlanBody, setCompPlanForOrganization } from "@/lib/ops/set-comp-plan";

// Operator comp: set plan and add-ons without Stripe payment. Billing lifecycle → billing+.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardOperatorApi("billing");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseSetCompPlanBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await setCompPlanForOrganization({ ...parsed, organizationId: id });
  if (!result) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  await recordOperatorAudit({
    operatorUserId: guard.ctx.operatorUserId,
    action: "org.set_plan",
    targetType: "organization",
    targetId: id,
    organizationId: id,
    metadata: {
      before: result.before,
      after: result.after,
      stripeLinked: result.stripeLinked,
    },
  });

  return NextResponse.json({
    ok: true,
    ...result.after,
    warning: result.stripeLinked
      ? "Stripe subscription is linked — Sync from Stripe may overwrite this comp until the sub is canceled in Stripe."
      : null,
  });
}
