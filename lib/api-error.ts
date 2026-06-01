import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { RequestError } from "@/lib/requests";

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

/** Log server-side; return a safe JSON body for unexpected API failures. */
export function uncaughtApiErrorResponse(
  err: unknown,
  context?: string,
): NextResponse<{ error: string }> {
  const prefix = context ? `[api:${context}]` : "[api]";
  console.error(prefix, err);
  return NextResponse.json({ error: GENERIC_MESSAGE }, { status: 500 });
}

export function apiErrorJson(
  err: unknown,
  context?: string,
): { status: number; body: { error: string } } {
  if (err instanceof RequestError) {
    return { status: err.status, body: { error: err.message } };
  }
  const prisma = mapPrismaClientError(err);
  if (prisma) {
    return prisma;
  }
  const prefix = context ? `[api:${context}]` : "[api]";
  console.error(prefix, err);
  return { status: 500, body: { error: GENERIC_MESSAGE } };
}

export function apiErrorResponse(err: unknown, context?: string): NextResponse {
  const { status, body } = apiErrorJson(err, context);
  return NextResponse.json(body, { status });
}

function mapPrismaClientError(
  err: unknown,
): { status: number; body: { error: string } } | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return null;
  switch (err.code) {
    case "P2002":
      return { status: 409, body: { error: "That record already exists." } };
    case "P2025":
      return { status: 404, body: { error: "Not found" } };
    default:
      return null;
  }
}
