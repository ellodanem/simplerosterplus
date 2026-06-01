import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  parseConnectionMode,
  parseOptionalPort,
  parseOptionalString,
} from "@/lib/device-input";
import { isValidTimeZone } from "@/lib/timezone";

const DEVICE_SELECT = {
  id: true,
  organizationId: true,
  locationId: true,
  name: true,
  serialNumber: true,
  model: true,
  firmwareVersion: true,
  connectionMode: true,
  ipAddress: true,
  port: true,
  enabled: true,
  lastSeenAt: true,
  timeZone: true,
  lastUserCount: true,
  lastFingerprintCount: true,
  lastPunchCount: true,
  notes: true,
  deletedAt: true,
} as const;

type Ctx = { params: Promise<{ id: string }> };

async function loadDevice(orgId: string, id: string) {
  return prisma.device.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    select: DEVICE_SELECT,
  });
}

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const device = await loadDevice(session.orgId, id);
  if (!device) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ device });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await loadDevice(session.orgId, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Prisma.DeviceUpdateInput = {};

  if ("name" in body) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    data.name = body.name.trim();
  }

  if ("locationId" in body) {
    if (typeof body.locationId !== "string" || !body.locationId.trim()) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }
    const loc = await prisma.location.findFirst({
      where: { id: body.locationId, organizationId: session.orgId },
      select: { id: true },
    });
    if (!loc) {
      return NextResponse.json({ error: "Unknown location" }, { status: 400 });
    }
    data.location = { connect: { id: loc.id } };
  }

  if ("connectionMode" in body) {
    const mode = parseConnectionMode(body.connectionMode);
    if (!mode) {
      return NextResponse.json(
        { error: "connectionMode must be 'adms_push' or 'pull_tcp'" },
        { status: 400 },
      );
    }
    data.connectionMode = mode;
  }

  if ("ipAddress" in body) {
    const v = parseOptionalString(body.ipAddress);
    if (v !== undefined) data.ipAddress = v;
  }

  if ("port" in body) {
    const v = parseOptionalPort(body.port);
    if (v === undefined && body.port !== undefined) {
      return NextResponse.json(
        { error: "port must be an integer between 1 and 65535" },
        { status: 400 },
      );
    }
    if (v !== undefined) data.port = v;
  }

  if ("timeZone" in body) {
    const v = parseOptionalString(body.timeZone);
    if (v !== undefined) {
      if (v !== null && !isValidTimeZone(v)) {
        return NextResponse.json(
          { error: `'${v}' is not a recognized IANA time zone.` },
          { status: 400 },
        );
      }
      data.timeZone = v;
    }
  }

  if ("notes" in body) {
    const v = parseOptionalString(body.notes);
    if (v !== undefined) data.notes = v;
  }

  if ("enabled" in body) {
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 });
    }
    data.enabled = body.enabled;
  }

  if ("serialNumber" in body) {
    const v = parseOptionalString(body.serialNumber);
    if (v !== undefined) {
      const next = v ?? null;
      const current = existing.serialNumber ?? null;
      if (next !== current) {
        if (existing.lastSeenAt !== null) {
          return NextResponse.json(
            {
              error:
                "Serial number is locked once a device has reported in. Soft-delete and re-add if the hardware actually changed.",
            },
            { status: 409 },
          );
        }
        data.serialNumber = next;
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ device: existing });
  }

  try {
    const device = await prisma.device.update({
      where: { id, organizationId: session.orgId },
      data,
      select: DEVICE_SELECT,
    });
    return NextResponse.json({ device });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "Another device at this location already uses that name (or serial number is taken in this organization).",
        },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await loadDevice(session.orgId, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.device.update({
    where: { id, organizationId: session.orgId },
    data: { deletedAt: new Date(), enabled: false },
  });

  return NextResponse.json({ ok: true });
}
