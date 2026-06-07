import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import {
  FeedbackValidationError,
  notifyTesterFeedback,
  parseFeedbackBody,
  persistTesterFeedback,
} from "@/lib/feedback/submit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const payload = parseFeedbackBody(body);
    const org = await prisma.organization.findUnique({
      where: { id: session.orgId },
      select: { id: true, name: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const row = await persistTesterFeedback(payload, {
      organizationId: org.id,
      orgName: org.name,
      userEmail: session.email,
    });

    await notifyTesterFeedback(
      payload,
      { organizationId: org.id, orgName: org.name, userEmail: session.email },
      row.id,
    ).catch((err) => {
      console.error("[api:feedback] notify failed", err);
    });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    if (err instanceof FeedbackValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return apiErrorResponse(err, "feedback");
  }
}
