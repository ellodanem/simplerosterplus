import { prisma } from "@/lib/prisma";
import { getGraceMinutes } from "@/lib/attendance-week";
import { getOvertimeSettings } from "@/lib/overtime-settings";
import { getRosterWeekStartWeekday } from "@/lib/roster-week-settings";

export type SetupState = {
  organization: { id: string; name: string; timeZone: string };
  defaultLocation: { id: string; name: string; timeZone: string | null } | null;
  staffCount: number;
  roleCount: number;
  shiftTemplateCount: number;
  rosterWeekStartWeekday: number;
  attendanceGraceMinutes: number;
  overtime: { enabled: boolean; weeklyThresholdHours: number };
};

export type SetupCompleteness = {
  complete: boolean;
  missing: Array<"location" | "roles" | "staff" | "shiftTemplates">;
};

export async function getSetupState(organizationId: string): Promise<SetupState> {
  const [org, defaultLocation, staffCount, roleCount, shiftTemplateCount, rosterWeekStartWeekday, grace, ot] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, timeZone: true },
      }),
      prisma.location.findFirst({
        where: { organizationId, isDefault: true },
        orderBy: [{ sortOrder: "asc" }],
        select: { id: true, name: true, timeZone: true },
      }),
      prisma.staff.count({ where: { organizationId } }),
      prisma.staffRole.count({ where: { organizationId } }),
      prisma.shiftTemplate.count({ where: { organizationId } }),
      getRosterWeekStartWeekday(organizationId),
      getGraceMinutes(organizationId),
      getOvertimeSettings(organizationId),
    ]);

  if (!org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  return {
    organization: org,
    defaultLocation: defaultLocation ?? null,
    staffCount,
    roleCount,
    shiftTemplateCount,
    rosterWeekStartWeekday,
    attendanceGraceMinutes: grace,
    overtime: ot,
  };
}

export function getSetupCompleteness(state: Pick<
  SetupState,
  "defaultLocation" | "roleCount" | "staffCount" | "shiftTemplateCount"
>): SetupCompleteness {
  const missing: SetupCompleteness["missing"] = [];
  if (!state.defaultLocation) missing.push("location");
  if (state.shiftTemplateCount <= 0) missing.push("shiftTemplates");
  if (state.roleCount <= 0) missing.push("roles");
  if (state.staffCount <= 0) missing.push("staff");
  return { complete: missing.length === 0, missing };
}
