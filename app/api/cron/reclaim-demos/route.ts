import { NextResponse } from "next/server";
import { reclaimExpiredDemoOrgs } from "@/lib/demo/reclaim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

/** Reclaim expired demo sandboxes. Call from Vercel Cron or `curl -H "Authorization: Bearer $CRON_SECRET"`. */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await reclaimExpiredDemoOrgs();
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
