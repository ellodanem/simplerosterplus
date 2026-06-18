import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";
import { validateOperatorCredentials } from "@/lib/ops/provision-operator";

export async function POST(request: Request) {
  const guard = await guardOperatorApi();
  if (!guard.ok) return guard.response;

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = (await request.json()) as { currentPassword?: string; newPassword?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current password and new password are required" },
      { status: 400 },
    );
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from the current password" },
      { status: 400 },
    );
  }

  const validated = validateOperatorCredentials(guard.ctx.email, newPassword);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const operator = await prisma.operatorUser.findUnique({
    where: { id: guard.ctx.operatorUserId },
    select: { id: true, passwordHash: true },
  });
  if (!operator?.passwordHash) {
    return NextResponse.json({ error: "Password change is not available" }, { status: 400 });
  }

  const currentOk = await verifyPassword(currentPassword, operator.passwordHash);
  if (!currentOk) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.operatorUser.update({
    where: { id: operator.id },
    data: { passwordHash },
  });
  await recordOperatorAudit({
    operatorUserId: guard.ctx.operatorUserId,
    action: "auth.password_change",
    targetType: "session",
    targetId: guard.ctx.operatorUserId,
  });

  return NextResponse.json({ ok: true });
}
