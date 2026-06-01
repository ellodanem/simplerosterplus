import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  findTaxonomyNameCollision,
  taxonomyCollisionWarning,
} from "@/lib/taxonomy-names";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Prisma.DepartmentUpdateInput = {};

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
  }

  if ("sortOrder" in body) {
    const raw = body.sortOrder;
    const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (!Number.isFinite(parsed)) {
      return NextResponse.json({ error: "sortOrder must be a number" }, { status: 400 });
    }
    data.sortOrder = Math.trunc(parsed);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true });
  }

  let warning: string | null = null;
  if (typeof data.name === "string") {
    const collision = await findTaxonomyNameCollision(session.orgId, data.name, "department");
    warning = collision ? taxonomyCollisionWarning(collision, "department") : null;
  }

  try {
    const department = await prisma.department.update({
      where: { id, organizationId: session.orgId },
      data,
      select: { id: true, name: true, sortOrder: true },
    });
    return NextResponse.json({ department, warning });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "That department already exists." }, { status: 409 });
    }
    return uncaughtApiErrorResponse(err, "departments PATCH");
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const inUse = await prisma.staff.count({
    where: { organizationId: session.orgId, departmentId: id },
  });
  if (inUse > 0) {
    return NextResponse.json(
      {
        error: `This department is assigned to ${inUse} staff member${inUse === 1 ? "" : "s"} and cannot be deleted. Reassign them first.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.department.delete({ where: { id, organizationId: session.orgId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return uncaughtApiErrorResponse(err, "departments PATCH");
  }
}
