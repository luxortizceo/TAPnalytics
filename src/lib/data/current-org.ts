import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { OrganizationRow, OrgRole } from "@/lib/supabase/types";

export const ORG_COOKIE = "tapnalytics_org_id";

export interface Membership {
  organization: OrganizationRow;
  role: OrgRole;
}

/**
 * Resolves the signed-in user's current organization: the one selected via
 * the org switcher (cookie), falling back to their first membership.
 * Returns null when the user has no organizations yet (send them to
 * /onboarding).
 */
export async function getCurrentOrganization(): Promise<{
  current: Membership | null;
  memberships: Membership[];
} > {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { current: null, memberships: [] };

  // Cast: this hand-authored Database type carries no FK/Relationships
  // metadata, so postgrest-js can't type embedded resource selects like
  // `organization:organizations(*)` — the actual runtime shape below is
  // correct and covered by the RLS isolation test in
  // supabase/migrations/0004_rls_policies.sql.
  const { data: rows } = (await supabase
    .from("organization_members")
    .select("role, organization:organizations(*)")
    .eq("user_id", user.id)
    .eq("status", "active")) as unknown as {
    data: { role: OrgRole; organization: OrganizationRow | null }[] | null;
  };

  const memberships: Membership[] = (rows ?? [])
    .filter((r) => r.organization)
    .map((r) => ({
      organization: r.organization as OrganizationRow,
      role: r.role,
    }));

  if (memberships.length === 0) return { current: null, memberships: [] };

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(ORG_COOKIE)?.value;

  const current =
    memberships.find((m) => m.organization.id === selectedId) ?? memberships[0];

  return { current, memberships };
}
