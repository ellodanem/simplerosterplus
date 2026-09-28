import { NextResponse } from "next/server";
import { assertWritable, payrollErrorResponse, requirePayrollAccess } from "@/lib/payroll/access";
import { layoutFromConfig } from "@/lib/payroll/parse";
import { updatePayrollSettings } from "@/lib/payroll/people";
import type { ColumnLayout } from "@/lib/payroll/columns";
import type { OvertimeRule } from "@/lib/payroll/countries/types";

export async function GET() {
  try {
    const access = await requirePayrollAccess();
    return NextResponse.json({
      enabled: true,
      countryCode: access.country.code,
      countryName: access.country.name,
      overtimeRule: access.config.overtimeRule,
      overtimeMultiplier: Number(access.config.overtimeMultiplier),
      legalName: access.config.legalName ?? "",
      addressLine: access.config.addressLine ?? "",
      phone: access.config.phone ?? "",
      glCentre: access.config.glCentre ?? "",
      glDepartment: access.config.glDepartment ?? "",
      columnLayout: layoutFromConfig(access.config.columnLayout),
      readOnly: access.readOnly,
    });
  } catch (err) {
    return payrollErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requirePayrollAccess();
    assertWritable(access);
    const body = (await request.json()) as {
      overtimeRule?: OvertimeRule;
      overtimeMultiplier?: number;
      legalName?: string;
      addressLine?: string;
      phone?: string;
      glCentre?: string;
      glDepartment?: string;
      columnLayout?: ColumnLayout;
    };
    const current = layoutFromConfig(access.config.columnLayout);
    await updatePayrollSettings(access, {
      overtimeRule: body.overtimeRule ?? access.config.overtimeRule,
      overtimeMultiplier: Number(body.overtimeMultiplier ?? access.config.overtimeMultiplier),
      legalName: body.legalName ?? access.config.legalName ?? "",
      addressLine: body.addressLine ?? access.config.addressLine ?? "",
      phone: body.phone ?? access.config.phone ?? "",
      glCentre: body.glCentre ?? access.config.glCentre ?? "",
      glDepartment: body.glDepartment ?? access.config.glDepartment ?? "",
      columnLayout: body.columnLayout ?? current,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return payrollErrorResponse(err);
  }
}
