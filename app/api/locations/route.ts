import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locations = await prisma.location.findMany({
    where: { organizationId: session.orgId },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, isDefault: true, sortOrder: true, timeZone: true },
  });

  return NextResponse.json({ locations });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const maxSort = await prisma.location.aggregate({
    where: { organizationId: session.orgId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const timeZone =
    typeof body.timeZone === "string" && body.timeZone.trim() ? body.timeZone.trim() : null;

  try {
    const location = await prisma.location.create({
      data: { organizationId: session.orgId, name, sortOrder, timeZone, isDefault: false },
      select: { id: true, name: true, isDefault: true, sortOrder: true, timeZone: true },
    });
    return NextResponse.json({ location }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "That location already exists." }, { status: 409 });
    }
    return uncaughtApiErrorResponse(err, "locations POST");
  }
}

