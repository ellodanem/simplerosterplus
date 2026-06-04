import { prisma } from "@/lib/prisma";

/** Next manual punch direction after the staff member's most recent punch at a location. */
export function suggestedPunchTypeAfter(last: "in" | "out" | null): "in" | "out" {
  if (last === "in") return "out";
  return "in";
}

/** Latest punch by `punchAt` for this staff at this location (any source). */
export async function getLatestStaffPunchType(params: {
  organizationId: string;
  locationId: string;
  staffId: string;
}): Promise<"in" | "out" | null> {
  const row = await prisma.attendanceLog.findFirst({
    where: {
      organizationId: params.organizationId,
      locationId: params.locationId,
      staffId: params.staffId,
    },
    orderBy: { punchAt: "desc" },
    select: { punchType: true },
  });
  return row?.punchType ?? null;
}
