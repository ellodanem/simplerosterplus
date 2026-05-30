import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getOrgPublicAppUrlOverride,
  publicAppUrlHostnameHyphenWarning,
  setOrgPublicAppUrlOverride,
  validatePublicAppUrlInput,
} from "@/lib/public-app-url-settings";
import { resolvePublicAppUrlForOrg } from "@/lib/public-url";

/**
 * GET /api/devices/public-url
 * Per-org public base URL for ADMS pairing (org override + resolved effective URL).
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgPublicAppUrl = await getOrgPublicAppUrlOverride(session.orgId);
  const resolved = await resolvePublicAppUrlForOrg(session.orgId, { request });

  return NextResponse.json({
    orgPublicAppUrl,
    resolvedPublicAppUrl: resolved.url,
    resolvedSource: resolved.source,
    hostnameHyphenWarning: publicAppUrlHostnameHyphenWarning(resolved.url),
  });
}

/**
 * PUT /api/devices/public-url
 * Body: { publicAppUrl: string } — empty string clears the org override.
 */
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.publicAppUrl === "string" ? body.publicAppUrl : "";
  const validation = validatePublicAppUrlInput(raw);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  await setOrgPublicAppUrlOverride(session.orgId, validation.normalized);

  const resolved = await resolvePublicAppUrlForOrg(session.orgId, { request });

  return NextResponse.json({
    orgPublicAppUrl: validation.normalized,
    resolvedPublicAppUrl: resolved.url,
    resolvedSource: resolved.source,
    hostnameHyphenWarning: publicAppUrlHostnameHyphenWarning(resolved.url),
  });
}
