import { NextResponse } from "next/server";
import {
  MapDeviceUserError,
  mapDeviceUserIdToStaff,
} from "@/lib/unmapped-device-punches";
import { getSession } from "@/lib/session";

/**
 * POST /api/attendance/device/map-users
 * Body: { deviceUserId: string, staffId: string }
 *
 * Sets Staff.deviceUserId and backfills unmapped AttendanceLog rows at that location.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deviceUserId = typeof body.deviceUserId === "string" ? body.deviceUserId.trim() : "";
  const staffId = typeof body.staffId === "string" ? body.staffId.trim() : "";

  if (!deviceUserId) {
    return NextResponse.json({ error: "deviceUserId is required" }, { status: 400 });
  }
  if (!staffId) {
    return NextResponse.json({ error: "staffId is required" }, { status: 400 });
  }

  try {
    const result = await mapDeviceUserIdToStaff({
      organizationId: session.orgId,
      deviceUserId,
      staffId,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof MapDeviceUserError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof Error && e.message === "deviceUserId is required") {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[device] map-users POST", e);
    return NextResponse.json({ error: "Failed to map device user ID" }, { status: 500 });
  }
}
