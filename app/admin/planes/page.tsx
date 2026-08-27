import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/primitives";
import type { PlanRow } from "@/lib/supabase/types";
import { CreatePlanForm, PlanActiveSwitch, PlanPricingForm } from "../admin-ui";

export const metadata = { title: "Planes — Superadmin" };

export default async function AdminPlansPage() {
  const admin = createAdminClient();
  const { data: plans } = (await admin.from("plans").select("*").order("sort_order")) as unknown as {
    data: PlanRow[] | null;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Los precios que ve el sitio público y el checkout de Stripe salen de aquí — nunca están
          hardcodeados en el código.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crear plan</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatePlanForm />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {(plans ?? []).map((plan) => (
          <Card key={plan.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>{plan.name}</CardTitle>
                <Badge variant="outline">{plan.code}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{plan.is_active ? "Activo" : "Inactivo"}</span>
                <PlanActiveSwitch planId={plan.id} isActive={plan.is_active} />
              </div>
            </CardHeader>
            <CardContent>
              <PlanPricingForm plan={plan} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
