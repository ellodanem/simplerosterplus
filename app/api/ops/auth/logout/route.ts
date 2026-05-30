import { NextResponse } from "next/server";
import {
  OPERATOR_SESSION_COOKIE,
  operatorSessionCookieOptions,
} from "@/lib/ops/auth-cookie";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OPERATOR_SESSION_COOKIE, "", {
    ...operatorSessionCookieOptions(0),
    maxAge: 0,
  });
  return res;
}
