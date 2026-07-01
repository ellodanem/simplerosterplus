import { formatYmdInZone } from "@/lib/datetime-policy";
import { isRosterDayLocked, rosterLockFromShareToken } from "@/lib/roster-week-lock";
import { prisma } from "@/lib/prisma";
import { ymdFromDate } from "@/lib/staff-input";

export async function getRoleDeleteBlockReason(
  organizationId: string,
  roleId: string,
): Promise<string | null> {
  const role = await prisma.staffRole.findFirst({
    where: { id: roleId, organizationId },
    select: { name: true },
  });
  if (!role) return "Role not found.";

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timeZone: true },
  });
  if (!org) return "Organization not found.";

  const staff = await prisma.staff.findMany({
    where: { organizationId, roleId, archivedAt: null },
    select: {
      firstName: true,
      lastName: true,
      rosterEntries: {
        select: {
          date: true,
          rosterWeek: {
            select: {
              weekStart: true,
              shareToken: true,
              location: { select: { timeZone: true } },
            },
          },
        },
      },
    },
  });

  const blockedNames: string[] = [];
  for (const person of staff) {
    let onUnlockedSchedule = false;
    for (const entry of person.rosterEntries) {
      const anchorYmd = ymdFromDate(entry.rosterWeek.weekStart);
      const entryYmd = ymdFromDate(entry.date);
      if (!anchorYmd || !entryYmd) continue;
      const timeZone = entry.rosterWeek.location.timeZone ?? org.timeZone;
      const todayForLoc = formatYmdInZone(new Date(), timeZone);
      const rosterLock = rosterLockFromShareToken(entry.rosterWeek.shareToken);
      if (!isRosterDayLocked(entryYmd, anchorYmd, todayForLoc, rosterLock)) {
        onUnlockedSchedule = true;
        break;
      }
    }
    if (onUnlockedSchedule) {
      blockedNames.push(`${person.firstName} ${person.lastName}`.trim());
    }
  }

  if (blockedNames.length === 0) return null;

  const preview =
    blockedNames.length <= 3
      ? blockedNames.join(", ")
      : `${blockedNames.slice(0, 3).join(", ")} and ${blockedNames.length - 3} more`;

  return `Cannot delete "${role.name}" — ${blockedNames.length} staff with this role are scheduled on upcoming shifts (${preview}). Remove them from unlocked roster days first.`;
}
