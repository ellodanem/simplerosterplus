import { NextResponse } from "next/server";
import {
  getStaffOptionsForUnmappedMapping,
  listUnmappedDeviceUsers,
} from "@/lib/unmapped-device-punches";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/attendance/device/unmapped
 * Org-scoped queue of terminal user IDs with punches but no staff match.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await listUnmappedDeviceUsers(session.orgId);
    const locationIds = [...new Set(rows.map((r) => r.locationId))];
    const staffByLocationId = await getStaffOptionsForUnmappedMapping(
      session.orgId,
      locationIds,
    );

    return NextResponse.json({
      rows,
      staffByLocationId,
      totalPunches: rows.reduce((n, r) => n + r.punchCount, 0),
    });
  } catch (e) {
    console.error("[device] unmapped GET", e);
    return NextResponse.json({ error: "Failed to load unmapped device user IDs" }, { status: 500 });
  }
}
