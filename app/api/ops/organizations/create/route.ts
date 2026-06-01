import { NextResponse } from "next/server";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";
import {
  provisionOrganization,
  validateProvisionOrganizationInput,
} from "@/lib/ops/provision-org";

// Create a new tenant (org + default location + admin). Billing+ on the operator plane.
export async function POST(request: Request) {
  const guard = await guardOperatorApi("billing");
  if (!guard.ok) return guard.response;

  let body: {
    name?: string;
    timeZone?: string;
    adminEmail?: string;
    adminPassword?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateProvisionOrganizationInput({
    name: typeof body.name === "string" ? body.name : "",
    timeZone: typeof body.timeZone === "string" ? body.timeZone : "",
    adminEmail: typeof body.adminEmail === "string" ? body.adminEmail : "",
    adminPassword:
      typeof body.adminPassword === "string" && body.adminPassword.trim()
        ? body.adminPassword
        : undefined,
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const created = await provisionOrganization(validated.data);
    const origin = new URL(request.url).origin;
    const loginUrl = `${origin}/login`;

    await recordOperatorAudit({
      operatorUserId: guard.ctx.operatorUserId,
      action: "org.create",
      targetType: "organization",
      targetId: created.organizationId,
      organizationId: created.organizationId,
      metadata: {
        organizationName: created.organizationName,
        timeZone: validated.data.timeZone,
        adminEmail: created.adminEmail,
        locationName: created.locationName,
        passwordGenerated: created.passwordGenerated,
      },
    });

    return NextResponse.json({
      ok: true,
      loginUrl,
      setupUrl: `${origin}/setup`,
      orgId: created.organizationId,
      orgName: created.organizationName,
      adminEmail: created.adminEmail,
      adminPassword: created.adminPassword,
      passwordGenerated: created.passwordGenerated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Provisioning failed";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
