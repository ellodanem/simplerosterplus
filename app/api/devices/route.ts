import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  parseConnectionMode,
  parseOptionalPort,
  parseOptionalString,
} from "@/lib/device-input";
import { buildAdmsIclockUrls, resolvePublicAppUrlForOrg } from "@/lib/public-url";

const DEVICE_LIST_SELECT = {
  id: true,
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
  location: { select: { id: true, name: true } },
} as const;

const DEVICE_DETAIL_SELECT = {
  ...DEVICE_LIST_SELECT,
  organizationId: true,
  locationId: true,
  deletedAt: true,
} as const;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const devices = await prisma.device.findMany({
    where: { organizationId: session.orgId, deletedAt: null },
    orderBy: [{ name: "asc" }],
    select: DEVICE_LIST_SELECT,
  });

  return NextResponse.json({ devices });
}

/**
 * Pairing card for the Add device flow.
 * For ADMS push: returns the values the operator types into the device's network/server screen.
 * For pull TCP: pairing is null because the operator already has all the info they need.
 */
type AdmsPairing = {
  publicBaseUrl: string;
  pushUrl: string;
  pollUrl: string;
  /** Optional on many F22 units — SR+ ADMS v1 identifies devices by serial only. */
  commKey: string;
  /** Legacy cloud-server fields (host + /iclock path) for older ZKTeco UI variants. */
  serverHost: string;
  serverPort: number;
  serverPath: string;
};

function deriveOrigin(request: Request): { host: string; port: number } {
  const url = new URL(request.url);
  const fwdHost = request.headers.get("x-forwarded-host");
  const fwdProto = request.headers.get("x-forwarded-proto");
  const host = (fwdHost ?? url.host).split(":")[0];
  const portFromUrl = url.port ? Number(url.port) : null;
  const proto = (fwdProto ?? url.protocol.replace(":", "")) as "http" | "https";
  const port = portFromUrl ?? (proto === "https" ? 443 : 80);
  return { host, port };
}

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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const locationId = typeof body.locationId === "string" ? body.locationId.trim() : "";
  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId: session.orgId },
    select: { id: true },
  });
  if (!location) {
    return NextResponse.json({ error: "Unknown location" }, { status: 400 });
  }

  const connectionMode = parseConnectionMode(body.connectionMode);
  if (!connectionMode) {
    return NextResponse.json(
      { error: "connectionMode must be 'adms_push' or 'pull_tcp'" },
      { status: 400 },
    );
  }

  const notes = parseOptionalString(body.notes) ?? null;

  // Pull-TCP-only fields. Allowed (but optional) on ADMS too — informational.
  const serialFromBody = parseOptionalString(body.serialNumber);
  const ipAddress = parseOptionalString(body.ipAddress) ?? null;
  const port = parseOptionalPort(body.port);
  if (port === undefined && body.port !== undefined && body.port !== null) {
    return NextResponse.json(
      { error: "port must be an integer between 1 and 65535" },
      { status: 400 },
    );
  }

  // For pull_tcp the operator should know the serial up front; ADMS captures it on first
  // contact, so leave it null and let the device populate it.
  const serialNumber =
    connectionMode === "pull_tcp" ? (serialFromBody ?? null) : null;

  // Generate a fresh comm key for ADMS pairing. 16 hex chars (~64 bits) — way stronger than
  // ZKTeco's stock 8-digit key, and any device that supports a long key will accept this.
  // Returned in plaintext exactly once; only the bcrypt hash is persisted.
  let plaintextCommKey: string | null = null;
  let commPasswordHash: string | null = null;
  if (connectionMode === "adms_push") {
    plaintextCommKey = crypto.randomBytes(8).toString("hex");
    commPasswordHash = await hashPassword(plaintextCommKey);
  }

  try {
    const device = await prisma.device.create({
      data: {
        organizationId: session.orgId,
        locationId: location.id,
        name,
        notes,
        connectionMode,
        ipAddress,
        port: port ?? null,
        serialNumber,
        commPasswordHash,
        enabled: true,
      },
      select: DEVICE_DETAIL_SELECT,
    });

    let pairing: AdmsPairing | null = null;
    if (connectionMode === "adms_push" && plaintextCommKey) {
      const origin = deriveOrigin(request);
      const { url: publicBaseUrl } = await resolvePublicAppUrlForOrg(session.orgId, {
        request,
      });
      const { pushUrl, pollUrl } = buildAdmsIclockUrls(publicBaseUrl);
      pairing = {
        publicBaseUrl,
        pushUrl,
        pollUrl,
        commKey: plaintextCommKey,
        serverHost: origin.host,
        serverPort: origin.port,
        serverPath: "/iclock",
      };
    }

    return NextResponse.json({ device, pairing }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "Another device at this location already uses that name (or the serial number is taken in this organization).",
        },
        { status: 409 },
      );
    }
    return uncaughtApiErrorResponse(err, "devices POST");
  }
}
