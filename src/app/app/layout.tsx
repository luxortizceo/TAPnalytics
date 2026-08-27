import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { current, memberships } = await getCurrentOrganization();

  if (!current) {
    redirect("/onboarding");
  }

  if (current.organization.onboarding_step !== "done") {
    redirect("/onboarding");
  }

  return (
    <AppShell current={current} memberships={memberships}>
      {children}
    </AppShell>
  );
}
