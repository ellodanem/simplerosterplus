import { NextResponse } from "next/server";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";
import { setRecordingSandboxFlag } from "@/lib/ops/recording-sandbox";

/**
 * Mark / unmark an organization as the reusable marketing recording sandbox.
 * Support+. Does not reset data — use reset-recording for that.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardOperatorApi("support");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let body: { enabled?: boolean; reason?: string };
  try {
    body = (await request.json()) as { enabled?: boolean; reason?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  try {
    const updated = await setRecordingSandboxFlag(id, body.enabled);
    await recordOperatorAudit({
      operatorUserId: guard.ctx.operatorUserId,
      action: body.enabled ? "org.recording_sandbox.enable" : "org.recording_sandbox.disable",
      targetType: "organization",
      targetId: id,
      organizationId: id,
      metadata: {
        reason: reason || null,
        after: { isRecordingSandbox: updated.isRecordingSandbox },
      },
    });
    return NextResponse.json({ ok: true, ...updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status =
      message === "Organization not found"
        ? 404
        : message.includes("cannot")
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
