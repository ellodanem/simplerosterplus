import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function parseNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * PUT /api/setup/business
 * Body: { organizationName: string, timeZone: string, defaultLocationName?: string }
 *
 * Ensures there is a default location so downstream flows (staff, devices, attendance) can work.
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

  const organizationName = parseNonEmptyString(body.organizationName);
  const timeZone = parseNonEmptyString(body.timeZone);
  const defaultLocationName = parseOptionalString(body.defaultLocationName) ?? "Main";

  if (!organizationName) {
    return NextResponse.json({ error: "organizationName is required" }, { status: 400 });
  }
  if (!timeZone) {
    return NextResponse.json({ error: "timeZone is required" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: session.orgId },
        data: { name: organizationName, timeZone },
        select: { id: true, name: true, timeZone: true },
      });

      const existingDefault = await tx.location.findFirst({
        where: { organizationId: session.orgId, isDefault: true },
        orderBy: [{ sortOrder: "asc" }],
        select: { id: true, name: true, timeZone: true },
      });

      const loc = existingDefault
        ? await tx.location.update({
            where: { id: existingDefault.id, organizationId: session.orgId },
            data: { name: defaultLocationName, isDefault: true, sortOrder: 0 },
            select: { id: true, name: true, timeZone: true },
          })
        : await tx.location.create({
            data: {
              organizationId: session.orgId,
              name: defaultLocationName,
              isDefault: true,
              sortOrder: 0,
            },
            select: { id: true, name: true, timeZone: true },
          });

      return { organization: org, defaultLocation: loc };
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "That location name is already used in this organization." },
        { status: 409 },
      );
    }
    return uncaughtApiErrorResponse(err, "setup business");
  }
}

