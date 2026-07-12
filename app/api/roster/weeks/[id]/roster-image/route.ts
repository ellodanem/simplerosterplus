import { NextResponse } from "next/server";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { uploadRosterWhatsappPng } from "@/lib/messaging/roster-blob";
import { prisma } from "@/lib/prisma";
import { getSession, isReadOnlySession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/roster/weeks/[id]/roster-image
 * Body: { imageBase64: string }
 *
 * Temp helper for Meta/Twilio media-template sample: upload PNG → public URL.
 * Does not send WhatsApp.
 */
export async function POST(request: Request, { params }: Ctx) {
  try {
    return await postRosterImage(request, params);
  } catch (err) {
    return uncaughtApiErrorResponse(err, "roster week image upload");
  }
}

async function postRosterImage(request: Request, params: Promise<{ id: string }>) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isReadOnlySession(session)) {
    return NextResponse.json({ error: "Read-only session" }, { status: 403 });
  }

  const { id: weekId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  const week = await prisma.rosterWeek.findFirst({
    where: { id: weekId, organizationId: session.orgId },
    select: { id: true },
  });
  if (!week) {
    return NextResponse.json({ error: "Roster week not found" }, { status: 404 });
  }

  try {
    const url = await uploadRosterWhatsappPng(imageBase64);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not upload roster image";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
