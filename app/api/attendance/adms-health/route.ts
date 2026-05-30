import { NextResponse } from "next/server";
import { getAdmsHealth } from "@/lib/adms-health";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/attendance/adms-health
 * Org-scoped ADMS ingest diagnostics for operators and field testing.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const health = await getAdmsHealth(session.orgId);
    return NextResponse.json(health);
  } catch (e) {
    console.error("[ADMS] adms-health GET", e);
    return NextResponse.json({ error: "Failed to load ADMS health" }, { status: 500 });
  }
}
