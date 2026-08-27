import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Progress } from "@/components/ui/primitives";
import { SUBSCRIPTION_STATUS_LABELS } from "@/lib/labels";
import { isStripeConfigured } from "@/lib/stripe";
import type { InvoiceRow, PlanRow, SubscriptionRow } from "@/lib/supabase/types";
import { CheckoutForm, PortalButton } from "./billing-ui";

export const metadata = { title: "Facturación" };

function UsageBar({ label, used, max }: { label: string; used: number; max: number | null }) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {used} {max === null ? "" : `/ ${max}`}
        </span>
      </div>
      {max !== null && <Progress value={pct} className="mt-1.5" />}
    </div>
  );
}

export default async function BillingPage() {
  const { current } = await getCurrentOrganization();
  if (!current) return null;

  const canManage = can(current.role, "manage_billing");
  const supabase = await createClient();
  const organizationId = current.organization.id;

  const [{ data: subscription }, { data: plans }, { data: invoices }, locationCount, cardCount, userCount] =
    await Promise.all([
      supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as unknown as Promise<{ data: SubscriptionRow | null }>,
      supabase.from("plans").select("*").eq("is_active", true).order("sort_order") as unknown as Promise<{
        data: PlanRow[] | null;
      }>,
      supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(10) as unknown as Promise<{ data: InvoiceRow[] | null }>,
      supabase.from("locations").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).is("deleted_at", null),
      supabase.from("nfc_cards").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).is("deleted_at", null),
      supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
    ]);

  const currentPlan = plans?.find((p) => p.id === current.organization.plan_id) ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tu plan, uso y suscripción con Stripe.</p>
      </div>

      {!isStripeConfigured() && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Stripe todavía no está configurado en este entorno (falta <code>STRIPE_SECRET_KEY</code>).
            El plan y el uso se muestran igual; el checkout y el portal se habilitan al configurarlo.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Plan actual</CardTitle>
          {subscription && (
            <Badge variant={subscription.status === "active" ? "positive" : "outline"}>
              {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-lg font-medium text-foreground">{currentPlan?.name ?? "Sin plan asignado"}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <UsageBar label="Sucursales" used={locationCount.count ?? 0} max={currentPlan?.max_locations ?? null} />
            <UsageBar label="Tarjetas NFC" used={cardCount.count ?? 0} max={currentPlan?.max_cards ?? null} />
            <UsageBar label="Usuarios" used={userCount.count ?? 0} max={currentPlan?.max_users ?? null} />
          </div>
          {canManage && subscription?.provider_customer_id && <PortalButton />}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Cambiar de plan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {(plans ?? []).map((plan) => (
              <div key={plan.id} className="flex flex-col gap-3 rounded-md border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.price_monthly === null
                      ? "Precio personalizado"
                      : `${plan.currency} ${plan.price_monthly}/mes`}
                  </p>
                </div>
                {plan.stripe_price_id_monthly ? (
                  <CheckoutForm planId={plan.id} cycle="monthly" label="Suscribirme" />
                ) : (
                  <p className="text-xs text-muted-foreground">Contacta a ventas para este plan.</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin facturas todavía.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between border-t border-border pt-2 text-sm first:border-t-0 first:pt-0">
                  <span className="text-foreground">
                    {inv.period_start ?? "—"} → {inv.period_end ?? "—"}
                  </span>
                  <span className="text-muted-foreground">
                    {inv.currency} {inv.amount_paid || inv.amount_due}
                  </span>
                  <Badge variant={inv.status === "paid" ? "positive" : "outline"}>{inv.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
