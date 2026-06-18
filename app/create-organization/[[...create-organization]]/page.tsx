import { CreateOrganization } from "@clerk/nextjs";

export const metadata = {
  title: "Create organization | Simple Roster Plus",
};

export default function CreateOrganizationPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 px-4 py-12">
      <CreateOrganization
        routing="path"
        path="/create-organization"
        afterCreateOrganizationUrl="/setup"
        skipInvitationScreen
      />
    </div>
  );
}
