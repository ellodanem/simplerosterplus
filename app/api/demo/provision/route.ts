import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk/config";
import { provisionDemoSandboxForUser } from "@/lib/demo/provision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function primaryEmail(user: {
  emailAddresses: Array<{ id: string; emailAddress: string }>;
  primaryEmailAddressId: string | null;
}): string | null {
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
}

export async function POST() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Self-serve signup is not configured." }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to explore the demo." }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = primaryEmail(user);
  if (!email) {
    return NextResponse.json({ error: "Your account needs an email address." }, { status: 400 });
  }

  try {
    const result = await provisionDemoSandboxForUser({
      clerkUserId: userId,
      email,
      firstName: user.firstName,
    });

    return NextResponse.json({
      organizationId: result.organizationId,
      clerkOrgId: result.clerkOrgId,
      demoExpiresAt: result.demoExpiresAt.toISOString(),
      redirectPath: "/roster",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create demo sandbox.";
    const status = message.includes("already have") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
