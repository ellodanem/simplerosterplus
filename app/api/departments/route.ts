import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  findTaxonomyNameCollision,
  taxonomyCollisionWarning,
} from "@/lib/taxonomy-names";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const departments = await prisma.department.findMany({
    where: { organizationId: session.orgId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sortOrder: true,
      _count: { select: { staff: true } },
    },
  });

  return NextResponse.json({
    departments: departments.map(({ _count, ...department }) => ({
      ...department,
      staffCount: _count.staff,
    })),
  });
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

  const maxSort = await prisma.department.aggregate({
    where: { organizationId: session.orgId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const collision = await findTaxonomyNameCollision(session.orgId, name, "department");
  const warning = collision ? taxonomyCollisionWarning(collision, "department") : null;

  try {
    const department = await prisma.department.create({
      data: { organizationId: session.orgId, name, sortOrder },
      select: { id: true, name: true, sortOrder: true },
    });
    return NextResponse.json({ department, warning }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "That department already exists." }, { status: 409 });
    }
    return uncaughtApiErrorResponse(err, "departments POST");
  }
}
