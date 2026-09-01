import { Badge } from "@/components/ui/primitives";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { getDashboardData } from "@/lib/data/dashboard";
import { getTrendData } from "@/lib/data/trends";
import { getHealthData } from "@/lib/data/health";
import { resolvePeriod } from "@/lib/date-ranges";
import { URGENCY_LABELS } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodFilter, RatingChart } from "./period-filter";
import {
  SatisfactionTrendChart,
  LocationTrendChart,
  CategoryTrendChart,
  GoogleRatingTrendChart,
} from "./trend-charts";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; locationId?: string }>;
}) {
  const { period, from, to, locationId } = await searchParams;
  const { current } = await getCurrentOrganization();
  if (!current) return null;

  const { key, start, end } = resolvePeriod(period, from, to);

  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", current.organization.id)
    .order("name");

  const [data, trends, health] = await Promise.all([
    getDashboardData({
      organizationId: current.organization.id,
      locationId,
      startDate: start,
      endDate: end,
    }),
    getTrendData(current.organization.id),
    getHealthData({
      organizationId: current.organization.id,
      locationId,
      startDate: start,
      endDate: end,
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hola, {current.organization.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Resumen ejecutivo de la experiencia de tus clientes.</p>
        </div>
        <PeriodFilter period={key} from={from} to={to} locations={locations ?? []} locationId={locationId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Taps totales" value={data.totalTaps} />
        <Kpi label="Taps únicos (estimado)" value={data.uniqueTaps} />
        <Kpi label="Encuestas iniciadas" value={data.surveysStarted} />
        <Kpi label="Encuestas completadas" value={data.surveysCompleted} />
        <Kpi label="Tasa de conversión" value={`${data.conversionRate}%`} />
        <Kpi
          label="Índice de satisfacción"
          value={data.satisfactionIndex === null ? "—" : `${data.satisfactionIndex}%`}
          trend={data.satisfactionTrendPct}
        />
        <Kpi label="Alertas activas" value={data.activeAlerts} href="/app/alertas" tone={data.activeAlerts > 0 ? "accent" : undefined} />
        <Kpi label="Casos sin resolver" value={data.openCases} href="/app/casos" tone={data.openCases > 0 ? "accent" : undefined} />
        <Kpi
          label="Reseñas de Google generadas"
          value={data.googleReviewsOpenedAllTime}
          subtext={
            data.googleReviewsOpenedInPeriod > 0
              ? `+${data.googleReviewsOpenedInPeriod} en este periodo`
              : "Sin nuevas en este periodo"
          }
        />
        <Kpi
          label="Captura de contacto"
          value={health.contactCapture.pct === null ? "—" : `${health.contactCapture.pct}%`}
          subtext={`${health.contactCapture.withContact} de ${health.contactCapture.total} casos con datos de contacto`}
        />
        <Kpi
          label="Reincidencia de casos"
          value={health.recurrence.pct === null ? "—" : `${health.recurrence.pct}%`}
          subtext={
            health.recurrence.eligible > 0
              ? `${health.recurrence.recurred} de ${health.recurrence.eligible} clientes con contacto volvieron a abrir un caso`
              : "Aún no hay suficientes casos con contacto para medirlo"
          }
          tone={health.recurrence.pct !== null && health.recurrence.pct > 0 ? "accent" : undefined}
        />
      </div>
      <p className="-mt-4 text-xs text-muted-foreground">
        &ldquo;Reseñas de Google generadas&rdquo; cuenta a las personas que calificaron su experiencia
        como Excelente y abrieron el link para dejar reseña — no es el número de reseñas
        publicadas (Google no nos avisa cuando alguien la envía), pero es un antes/ahora real de
        lo que Tapnalytics está generando. &ldquo;Reincidencia&rdquo; cuenta, de los clientes que
        dejaron sus datos en un caso ya resuelto, cuántos volvieron a abrir otro caso después —
        alto = la solución no está funcionando de verdad.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Cumplimiento de SLA por urgencia</CardTitle>
        </CardHeader>
        <CardContent>
          {health.sla.every((s) => s.resolved === 0) ? (
            <EmptyState text="Sin casos resueltos en este periodo." />
          ) : (
            <div className="flex flex-col gap-3">
              {health.sla
                .filter((s) => s.resolved > 0)
                .map((s) => (
                  <div key={s.urgency} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-sm text-foreground">{URGENCY_LABELS[s.urgency]}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`h-full rounded-full ${
                          s.pct !== null && s.pct >= 80 ? "bg-positive" : "bg-accent"
                        }`}
                        style={{ width: `${s.pct ?? 0}%` }}
                      />
                    </div>
                    <span className="w-40 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {s.pct === null ? "sin fecha límite" : `${s.pct}% a tiempo`} · {s.resolved} resueltos
                    </span>
                  </div>
                ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            % de casos resueltos antes de su fecha límite (calculada según la urgencia al crearse el
            caso), sobre el total de casos resueltos en este periodo con esa urgencia.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolución de la satisfacción (12 semanas)</CardTitle>
          </CardHeader>
          <CardContent>
            <SatisfactionTrendChart data={trends.satisfactionTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolución por sucursal (12 semanas)</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.locationNames.length === 0 ? (
              <EmptyState text="Sin sucursales activas." />
            ) : (
              <LocationTrendChart data={trends.locationTrend} locationNames={trends.locationNames} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolución de categorías negativas (12 semanas)</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.topCategoryLabels.length === 0 ? (
              <EmptyState text="Sin categorías negativas registradas en las últimas 12 semanas." />
            ) : (
              <CategoryTrendChart data={trends.categoryTrend} categoryLabels={trends.topCategoryLabels} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reseñas de Google en el tiempo</CardTitle>
          </CardHeader>
          <CardContent>
            {!trends.hasGoogleData ? (
              <p className="text-sm text-muted-foreground">
                Sin historial todavía. Esto requiere que la sucursal tenga configurado su Google
                Place ID y que la captura automática diaria ya haya corrido al menos una vez —
                puede tardar hasta 24 horas después de configurarlo.
              </p>
            ) : (
              <GoogleRatingTrendChart data={trends.googleTrend} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Experiencias por calificación</CardTitle>
          </CardHeader>
          <CardContent>
            <RatingChart counts={data.ratingCounts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparativa entre sucursales</CardTitle>
          </CardHeader>
          <CardContent>
            {data.locationPerformance.length === 0 ? (
              <EmptyState text="Sin sucursales." />
            ) : (
              <div className="flex flex-col gap-3">
                {data.locationPerformance
                  .slice()
                  .sort((a, b) => (b.satisfactionIndex ?? -1) - (a.satisfactionIndex ?? -1))
                  .map((loc) => (
                    <div key={loc.locationId} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-sm text-foreground">{loc.name}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-positive"
                          style={{ width: `${loc.satisfactionIndex ?? 0}%` }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {loc.satisfactionIndex === null ? "sin datos" : `${loc.satisfactionIndex}%`}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Principales problemas y fortalezas</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCategories.length === 0 ? (
              <EmptyState text="Sin categorías registradas en este periodo." />
            ) : (
              <div className="flex flex-col gap-2">
                {data.topCategories.map((cat) => (
                  <div key={`${cat.kind}:${cat.label}`} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{cat.label}</span>
                    <Badge variant={cat.kind === "negative" ? "outline" : "positive"}>{cat.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarjetas con mayor actividad</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCards.length === 0 ? (
              <EmptyState text="Sin taps en este periodo." />
            ) : (
              <div className="flex flex-col gap-2">
                {data.topCards.map((c) => (
                  <div key={c.cardId} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{c.alias}</span>
                    <span className="tabular-nums text-muted-foreground">{c.taps} taps</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horarios con más problemas</CardTitle>
          </CardHeader>
          <CardContent>
            {data.hourlyBadCounts.length === 0 ? (
              <EmptyState text="Sin experiencias malas en este periodo." />
            ) : (
              <div className="flex flex-col gap-2">
                {data.hourlyBadCounts.map((h) => (
                  <div key={h.hour} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">
                      {h.hour.toString().padStart(2, "0")}:00 – {((h.hour + 1) % 24).toString().padStart(2, "0")}:00
                    </span>
                    <span className="tabular-nums text-muted-foreground">{h.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comentarios recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentComments.length === 0 ? (
              <EmptyState text="Sin comentarios en este periodo." />
            ) : (
              <div className="flex flex-col gap-3">
                {data.recentComments.map((c, i) => (
                  <div key={i} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <p className="text-sm text-foreground">{c.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.rating === "bad" ? "Mala" : c.rating === "good" ? "Buena" : "Excelente"} ·{" "}
                      {c.locationName} · {new Date(c.createdAt).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>TAP Intelligence</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Ya está activo: detecta picos en categorías negativas, cambios en tu índice de
          satisfacción y sucursales por debajo del promedio, con evidencia y recomendaciones de
          seguimiento.{" "}
          <Link href="/app/inteligencia" className="text-foreground underline underline-offset-4">
            Ver TAP Intelligence
          </Link>
          . La mayoría de los hallazgos son por reglas; el análisis de sentimiento sobre
          comentarios de texto libre sí usa inteligencia artificial (Claude) cuando está
          configurado.
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  trend,
  href,
  tone,
  subtext,
}: {
  label: string;
  value: string | number;
  trend?: number | null;
  href?: string;
  tone?: "accent";
  subtext?: string;
}) {
  const content = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-semibold tracking-tight ${tone === "accent" ? "text-accent" : ""}`}>{value}</p>
        {typeof trend === "number" && (
          <p className={`mt-1 text-xs ${trend >= 0 ? "text-positive" : "text-accent"}`}>
            {trend >= 0 ? "+" : ""}
            {trend}% vs. periodo anterior
          </p>
        )}
        {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
