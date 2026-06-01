import { NextRequest, NextResponse } from "next/server";
import { zkPushCDATAGET, zkPushPOST } from "@/lib/zk-iclock-push";

export const dynamic = "force-dynamic";

const OK = new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });

/** ZKTeco standard: GET options handshake; POST attendance and other tables (table=ATTLOG for punches). */
export async function GET(request: NextRequest) {
  try {
    return await zkPushCDATAGET(request);
  } catch (err) {
    console.error("[ADMS] cdata GET error:", err);
    return OK;
  }
}

export async function POST(request: NextRequest) {
  try {
    return await zkPushPOST(request);
  } catch (err) {
    console.error("[ADMS] cdata POST error:", err);
    return OK;
  }
}
