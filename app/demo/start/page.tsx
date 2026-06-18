import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { clerkConfigured, tenantSignInPath } from "@/lib/clerk/config";
import { DemoStartClient } from "./demo-start-client";

export const metadata = {
  title: "Demo sandbox | Simple Roster Plus",
};

export default async function DemoStartPage() {
  if (!clerkConfigured()) {
    redirect("/login");
  }

  const { userId } = await auth();
  if (!userId) {
    redirect(`${tenantSignInPath()}?redirect_url=${encodeURIComponent("/demo/start")}`);
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 px-4 py-12">
      <DemoStartClient />
    </div>
  );
}
