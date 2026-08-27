import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = { title: "Configura tu cuenta" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const { current } = await getCurrentOrganization();

  if (current?.organization.onboarding_step === "done") {
    redirect("/app/dashboard");
  }

  let location = null;
  if (current) {
    const { data } = await supabase
      .from("locations")
      .select("*")
      .eq("organization_id", current.organization.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    location = data;
  }

  return (
    <div className="mx-auto min-h-svh max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <span className="text-lg font-semibold tracking-tight">
          TAP<span className="text-accent">nalytics</span>
        </span>
      </div>
      <OnboardingWizard
        organization={current?.organization ?? null}
        location={location}
        userFullName={(user.user_metadata?.full_name as string) ?? ""}
      />
    </div>
  );
}
