import type { AppUserRole, PayrollConfig } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isReadOnlySession } from "@/lib/session";
import { getPayrollCountry } from "./countries";
import type { PayrollCountry } from "./countries/types";

export class PayrollError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type PayrollAccess = {
  organizationId: string;
  appUserId: string;
  email: string;
  role: Extract<AppUserRole, "owner" | "admin">;
  readOnly: boolean;
  config: PayrollConfig;
  country: PayrollCountry;
};

export async function requirePayrollAccess(): Promise<PayrollAccess> {
  const session = await getSession();
  if (!session) throw new PayrollError("Unauthorized", 401);

  const user = await prisma.appUser.findFirst({
    where: { id: session.sub, organizationId: session.orgId },
    select: { role: true },
  });
  if (!user || (user.role !== "owner" && user.role !== "admin")) {
    throw new PayrollError("Not found", 404);
  }

  const config = await prisma.payrollConfig.findUnique({
    where: { organizationId: session.orgId },
  });
  if (!config?.enabled) throw new PayrollError("Not found", 404);

  const country = getPayrollCountry(config.countryCode);
  if (!country) {
    throw new PayrollError("Payroll rules for this country are not available yet.", 409);
  }

  return {
    organizationId: session.orgId,
    appUserId: session.sub,
    email: session.email,
    role: user.role,
    readOnly: isReadOnlySession(session),
    config,
    country,
  };
}

export function payrollErrorResponse(err: unknown): NextResponse {
  if (err instanceof PayrollError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export function assertWritable(access: PayrollAccess) {
  if (access.readOnly) {
    throw new PayrollError("Read-only operator session — changes are not allowed.", 403);
  }
}

export async function gatePayrollPage(): Promise<
  | { kind: "signin" }
  | { kind: "hidden" }
  | { kind: "unsupported"; message: string }
  | { kind: "ready"; access: PayrollAccess; orgName: string }
> {
  try {
    const access = await requirePayrollAccess();
    const org = await prisma.organization.findUnique({
      where: { id: access.organizationId },
      select: { name: true },
    });
    return { kind: "ready", access, orgName: org?.name ?? "Organization" };
  } catch (err) {
    if (err instanceof PayrollError && err.status === 401) return { kind: "signin" };
    if (err instanceof PayrollError && err.status === 409) return { kind: "unsupported", message: err.message };
    return { kind: "hidden" };
  }
}
