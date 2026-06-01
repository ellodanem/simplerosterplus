import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const exists = await prisma.location.findFirst({
    where: { id, organizationId: session.orgId },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.location.updateMany({
      where: { organizationId: session.orgId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.location.update({
      where: { id, organizationId: session.orgId },
      data: { isDefault: true, sortOrder: 0 },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

