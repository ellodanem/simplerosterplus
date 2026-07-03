import { NextResponse } from "next/server";
import {
  applyAutoScheduler,
  type AutoSchedulerMode,
  type AutoSchedulerProposal,
} from "@/lib/auto-scheduler";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

function isProposal(value: unknown): value is AutoSchedulerProposal {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.staffId === "string" &&
    typeof p.date === "string" &&
    typeof p.shiftTemplateId === "string" &&
    typeof p.reason === "string"
  );
}

export async function POST(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: weekId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode;
  if (mode !== "copy_previous" && mode !== "fill_open") {
    return NextResponse.json(
      { error: "mode must be copy_previous or fill_open" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.proposals)) {
    return NextResponse.json({ error: "proposals must be an array" }, { status: 400 });
  }

  const proposals: AutoSchedulerProposal[] = [];
  for (const item of body.proposals) {
    if (!isProposal(item)) {
      return NextResponse.json({ error: "Invalid proposal in list" }, { status: 400 });
    }
    proposals.push({
      staffId: item.staffId,
      date: item.date,
      shiftTemplateId: item.shiftTemplateId,
      reason: item.reason,
      position: typeof item.position === "string" ? item.position : null,
      notes: typeof item.notes === "string" ? item.notes : null,
    });
  }

  const result = await applyAutoScheduler(
    weekId,
    session.orgId,
    mode as AutoSchedulerMode,
    proposals,
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
