import { NextResponse } from "next/server";
import type { OperatorRole } from "@prisma/client";
import { getOperatorContext, operatorCan, type OperatorContext } from "@/lib/ops/context";

// Shared guard for operator API routes. Layer 1+2 (valid JWT is enforced by middleware;
// the OperatorUser allow-list + disabled check here), plus optional RBAC. Returns JSON
// errors (never a redirect) so fetch callers get a usable status. See docs/OPERATOR_CONSOLE.md.

type GuardOk = { ok: true; ctx: OperatorContext };
type GuardErr = { ok: false; response: NextResponse };

export async function guardOperatorApi(minRole?: OperatorRole): Promise<GuardOk | GuardErr> {
  const ctx = await getOperatorContext();
  if (!ctx) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (minRole && !operatorCan(ctx.role, minRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Requires ${minRole} role or higher` },
        { status: 403 },
      ),
    };
  }
  return { ok: true, ctx };
}
