import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrganizationRow, PlanRow } from "@/lib/supabase/types";
import { OrgPlanSelect, OrgStatusSelect } from "./admin-ui";

export const metadata = { title: "Organizaciones — Superadmin" };

export default async function AdminOrganizationsPage() {
  const admin = createAdminClient();

  const [{ data: organizations }, { data: plans }] = await Promise.all([
    admin.from("organizations").select("*").is("deleted_at", null).order("created_at", { ascending: false }) as unknown as Promise<{
      data: OrganizationRow[] | null;
    }>,
    admin.from("plans").select("*").order("sort_order") as unknown as Promise<{ data: PlanRow[] | null }>,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organizaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {organizations?.length ?? 0} organizaciones registradas en la plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las organizaciones</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(organizations ?? []).map((org) => (
            <div
              key={org.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0"
            >
              <div>
                <p className="font-medium text-foreground">{org.name}</p>
                <p className="text-xs text-muted-foreground">
                  {org.slug} · creada {new Date(org.created_at).toLocaleDateString("es-MX")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <OrgPlanSelect organizationId={org.id} value={org.plan_id} plans={plans ?? []} />
                <OrgStatusSelect organizationId={org.id} value={org.status} />
              </div>
            </div>
          ))}
          {(!organizations || organizations.length === 0) && (
            <p className="text-sm text-muted-foreground">Sin organizaciones todavía.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
