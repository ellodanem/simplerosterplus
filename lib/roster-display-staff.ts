import { isStaffArchived } from "@/lib/staff-archive";
import { ymdForDbDate } from "@/lib/roster-week";

export type RosterMembershipStaff = {
  id: string;
  startDate: Date | null;
  archivedAt: Date | null;
  excludeFromRoster: boolean;
};

/** Past week: today is on or after the week's last calendar day (anchor + 6). */
export function isPastRosterWeek(weekEndYmd: string, todayYmd: string): boolean {
  return todayYmd >= weekEndYmd;
}

function isPlannableForRoster(s: RosterMembershipStaff): boolean {
  return !isStaffArchived(s);
}

/**
 * Who may appear as rows on the roster grid for a given week.
 * Order: exclude from roster → start-date gate → archived vs past-with-entries.
 */
export function filterRosterStaffForWeek<T extends RosterMembershipStaff>(
  staff: T[],
  args: {
    weekEndYmd: string;
    todayYmd: string;
    staffIdsWithEntries: Set<string>;
  },
): T[] {
  const past = isPastRosterWeek(args.weekEndYmd, args.todayYmd);

  return staff.filter((s) => {
    if (s.excludeFromRoster) return false;

    if (s.startDate) {
      const startYmd = ymdForDbDate(s.startDate);
      if (startYmd > args.weekEndYmd) return false;
    }

    if (past) {
      if (isPlannableForRoster(s)) return true;
      return args.staffIdsWithEntries.has(s.id);
    }

    return isPlannableForRoster(s);
  });
}

export function staffEligibleForRosterWeek(
  staff: RosterMembershipStaff,
  args: {
    weekEndYmd: string;
    todayYmd: string;
    staffIdsWithEntries: Set<string>;
  },
): boolean {
  return filterRosterStaffForWeek([staff], args).length > 0;
}

export function staffIdsWithRosterEntries(
  entries: { staffId: string; shiftTemplateId: string | null }[],
): Set<string> {
  const ids = new Set<string>();
  for (const e of entries) {
    if (e.shiftTemplateId) ids.add(e.staffId);
  }
  return ids;
}
