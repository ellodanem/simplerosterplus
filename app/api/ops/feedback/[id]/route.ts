import { NextResponse } from "next/server";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";
import {
  updateTesterFeedbackStatus,
  type TesterFeedbackStatus,
} from "@/lib/ops/data";

const ALLOWED: TesterFeedbackStatus[] = ["open", "triaged", "closed"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardOperatorApi("support");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body.status;
  if (!status || !ALLOWED.includes(status as TesterFeedbackStatus)) {
    return NextResponse.json(
      { error: "status must be open, triaged, or closed" },
      { status: 400 },
    );
  }

  const row = await updateTesterFeedbackStatus(id, status as TesterFeedbackStatus);
  if (!row) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  await recordOperatorAudit({
    operatorUserId: guard.ctx.operatorUserId,
    action: "feedback.status",
    targetType: "tester_feedback",
    targetId: id,
    organizationId: row.organizationId,
    metadata: { status },
  });

  return NextResponse.json({ ok: true, id: row.id, status: row.status });
}
