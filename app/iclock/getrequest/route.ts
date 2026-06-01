import { NextRequest, NextResponse } from "next/server";
import { zkPushGET } from "@/lib/zk-iclock-push";

export const dynamic = "force-dynamic";

const OK = new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });

/** ZKTeco standard: device polls for remote commands. */
export async function GET(request: NextRequest) {
  try {
    return await zkPushGET(request);
  } catch (err) {
    console.error("[ADMS] getrequest GET error:", err);
    return OK;
  }
}
