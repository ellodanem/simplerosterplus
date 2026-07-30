import { NextResponse } from "next/server";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";
import { resetRecordingSandbox } from "@/lib/ops/recording-sandbox";

/**
 * Reset a recording sandbox to post-provision / pre-wizard state.
 * Support+. Does not open an impersonation session — sign in with the
 * dedicated Clerk account and run setup → publish for the take.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardOperatorApi("support");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let reason = "";
  try {
    const body = (await request.json()) as { reason?: string };
    reason = typeof body.reason === "string" ? body.reason.trim() : "";
  } catch {
    // reason optional
  }

  try {
    await resetRecordingSandbox(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reset failed";
    const status = message.includes("not a recording sandbox") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  await recordOperatorAudit({
    operatorUserId: guard.ctx.operatorUserId,
    action: "org.recording_sandbox.reset",
    targetType: "organization",
    targetId: id,
    organizationId: id,
    metadata: { reason: reason || null },
  });

  return NextResponse.json({
    ok: true,
    orgId: id,
    nextStep: "Sign in with the recording Clerk account and open /setup",
  });
}
