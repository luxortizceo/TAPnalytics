import { Badge, Label } from "@/components/ui/primitives";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertRuleSwitch, AlertRowActions } from "./alert-controls";
import type { AlertStatus, AlertType } from "@/lib/supabase/types";

export const metadata = { title: "Alertas" };

const WIRED_ALERT_TYPES: { type: AlertType; name: string; description: string }[] = [
  {
    type: "new_bad_experience",
    name: "Nueva experiencia mala",
    description: "Se dispara cada vez que un cliente califica su visita como \"Mala\".",
  },
  {
    type: "urgent_comment",
    name: "Comentario urgente",
    description: "Se dispara cuando un cliente marca su comentario con urgencia alta o crítica.",
  },
];

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { current } = await getCurrentOrganization();
  if (!current) return null;

  const supabase = await createClient();
  const canManage = can(current.role, "edit");

  const [{ data: rules }, alertsQuery] = await Promise.all([
    supabase
      .from("alert_rules")
      .select("type, is_active")
      .eq("organization_id", current.organization.id),
    (async () => {
      let query = supabase
        .from("alerts")
        .select("id, type, severity, title, message, status, created_at, location_id")
        .eq("organization_id", current.organization.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (status) query = query.eq("status", status as AlertStatus);
      return query;
    })(),
  ]);

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", current.organization.id);
  const locationById = new Map((locations ?? []).map((l) => [l.id, l.name]));

  const ruleByType = new Map((rules ?? []).map((r) => [r.type, r.is_active]));
  const alerts = alertsQuery.data ?? [];

  function filterUrl(newStatus: string | undefined) {
    return newStatus ? `/app/alertas?status=${newStatus}` : "/app/alertas";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alertas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reglas activas y alertas generadas para {current.organization.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reglas de alerta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {WIRED_ALERT_TYPES.map((t) => {
            const active = ruleByType.has(t.type) ? ruleByType.get(t.type)! : true;
            return (
              <div key={t.type} className="flex items-center justify-between gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
                <div>
                  <Label className="text-sm">{t.name}</Label>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
                {canManage ? (
                  <AlertRuleSwitch organizationId={current.organization.id} type={t.type} name={t.name} active={active} />
                ) : (
                  <Badge variant={active ? "positive" : "outline"}>{active ? "Activa" : "Inactiva"}</Badge>
                )}
              </div>
            );
          })}
          <p className="border-t border-border pt-4 text-xs text-muted-foreground">
            Tipos de alerta que requieren analizar tendencias en el tiempo (racha de quejas,
            problema recurrente, tarjeta sin actividad) no se disparan como <em>alerts</em> nuevas
            todavía — ese análisis lo hace{" "}
            <Link href="/app/inteligencia" className="underline underline-offset-4">
              TAP Intelligence
            </Link>{" "}
            como hallazgos y recomendaciones.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {[undefined, "active", "acknowledged", "resolved"].map((s) => (
          <Link
            key={s ?? "all"}
            href={filterUrl(s)}
            aria-current={status === s || (!status && !s) ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              status === s || (!status && !s)
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-surface text-muted-foreground hover:bg-surface-2"
            )}
          >
            {s === "active" ? "Activas" : s === "acknowledged" ? "Reconocidas" : s === "resolved" ? "Resueltas" : "Todas"}
          </Link>
        ))}
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No hay alertas con este filtro.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={alert.severity === "critical" ? "accent" : alert.severity === "warning" ? "warning" : "outline"}>
                    {alert.severity === "critical" ? "Crítica" : alert.severity === "warning" ? "Advertencia" : "Info"}
                  </Badge>
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {alert.location_id && locationById.get(alert.location_id)} ·{" "}
                  {new Date(alert.created_at).toLocaleString("es-MX")}
                </p>
              </div>
              {canManage && <AlertRowActions alertId={alert.id} status={alert.status} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
