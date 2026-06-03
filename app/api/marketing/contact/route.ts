import { NextResponse } from "next/server";
import {
  ContactValidationError,
  marketingAllowedOrigins,
  notifyMarketingInquiry,
  parseMarketingContactBody,
  persistMarketingInquiry,
} from "@/lib/marketing/contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get("origin");
  if (!origin) return headers;

  const allowed = marketingAllowedOrigins();
  const normalizedOrigin = origin.replace(/\/$/, "");
  const ok = allowed.some((a) => a.replace(/\/$/, "") === normalizedOrigin);
  if (!ok) return headers;

  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Vary", "Origin");
  return headers;
}

function jsonWithCors(
  request: Request,
  body: unknown,
  init?: { status?: number },
): NextResponse {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json");
  return NextResponse.json(body, { status: init?.status ?? 200, headers });
}

export async function OPTIONS(request: Request) {
  const headers = corsHeaders(request);
  if (!headers.get("Access-Control-Allow-Origin")) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(request: Request) {
  const cors = corsHeaders(request);
  const origin = request.headers.get("origin");
  if (origin && !cors.get("Access-Control-Allow-Origin")) {
    return jsonWithCors(request, { error: "Origin not allowed" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonWithCors(request, { error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const payload = parseMarketingContactBody(body);
    const row = await persistMarketingInquiry(payload);
    await notifyMarketingInquiry(payload, row.id).catch((err) => {
      console.error("[api:marketing:contact] notify failed", err);
    });
    return jsonWithCors(request, { ok: true, id: row.id });
  } catch (err) {
    if (err instanceof ContactValidationError) {
      return jsonWithCors(request, { error: err.message }, { status: 400 });
    }
    console.error("[api:marketing:contact]", err);
    return jsonWithCors(request, { error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
