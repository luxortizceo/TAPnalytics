import { Badge } from "@/components/ui/primitives";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { getDashboardData } from "@/lib/data/dashboard";
import { resolvePeriod, PERIOD_LABELS } from "@/lib/date-ranges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PeriodFilter } from "../dashboard/period-filter";
import { PrintButton, SavePdfButton } from "./print-button";
import { CreateScheduleForm, ScheduleList } from "./schedule-ui";
import type { ReportScheduleRow } from "@/lib/supabase/types";

export const metadata = { title: "Reportes" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; locationId?: string }>;
}) {
  const { period, from, to, locationId } = await searchParams;
  const { current } = await getCurrentOrganization();
  if (!current) return null;

  const { key, start, end } = resolvePeriod(period, from, to);

  const supabase = await createClient();
  const [{ data: locations }, data, { data: schedules }] = await Promise.all([
    supabase.from("locations").select("id, name").eq("organization_id", current.organization.id).order("name"),
    getDashboardData({
      organizationId: current.organization.id,
      locationId,
      startDate: start,
      endDate: end,
    }),
    supabase
      .from("report_schedules")
      .select("*")
      .eq("organization_id", current.organization.id)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: ReportScheduleRow[] | null }>,
  ]);

  const exportParams = new URLSearchParams();
  exportParams.set("from", start.toISOString());
  exportParams.set("to", end.toISOString());
  if (locationId) exportParams.set("locationId", locationId);

  const totalRated = data.ratingCounts.bad + data.ratingCounts.good + data.ratingCounts.excellent;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reporte ejecutivo del periodo seleccionado, listo para imprimir o exportar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter period={key} from={from} to={to} locations={locations ?? []} locationId={locationId} />
          <Button asChild variant="secondary">
            <a href={`/app/reportes/export?${exportParams.toString()}`}>
              <Download className="size-4" />
              Exportar CSV
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href={`/app/reportes/export?${exportParams.toString()}&format=xlsx`}>
              <Download className="size-4" />
              Exportar Excel
            </a>
          </Button>
          <PrintButton />
          <SavePdfButton />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-8 print:border-none print:p-0">
        <header className="mb-8 flex items-start justify-between border-b border-border pb-6">
          <div>
            <h2 className="text-xl font-semibold">{current.organization.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reporte ejecutivo · {PERIOD_LABELS[key]}
              {locationId && locations ? ` · ${locations.find((l) => l.id === locationId)?.name}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {start.toLocaleDateString("es-MX")} – {end.toLocaleDateString("es-MX")}
            </p>
          </div>
          <span className="text-lg font-semibold tracking-tight">
            TAP<span className="text-accent">nalytics</span>
          </span>
        </header>

        <section className="mb-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Resumen ejecutivo
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ReportStat label="Taps totales" value={data.totalTaps} />
            <ReportStat label="Encuestas completadas" value={data.surveysCompleted} />
            <ReportStat label="Tasa de conversión" value={`${data.conversionRate}%`} />
            <ReportStat
              label="Índice de satisfacción"
              value={data.satisfactionIndex === null ? "Sin datos" : `${data.satisfactionIndex}%`}
            />
          </div>
          {data.satisfactionTrendPct !== null && (
            <p className="mt-3 text-sm text-muted-foreground">
              El índice de satisfacción {data.satisfactionTrendPct >= 0 ? "subió" : "bajó"}{" "}
              <strong className="text-foreground">{Math.abs(data.satisfactionTrendPct)}%</strong> respecto
              al periodo anterior de igual duración.
            </p>
          )}
        </section>

        <section className="mb-8 grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Distribución de calificaciones ({totalRated} respuestas)
            </h3>
            <div className="flex flex-col gap-2 text-sm">
              <p>Mala: {data.ratingCounts.bad}</p>
              <p>Buena: {data.ratingCounts.good}</p>
              <p>Excelente: {data.ratingCounts.excellent}</p>
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Principales problemas y fortalezas
            </h3>
            {data.topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin categorías registradas.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {data.topCategories.map((cat) => (
                  <div key={`${cat.kind}:${cat.label}`} className="flex items-center justify-between text-sm">
                    <span>{cat.label}</span>
                    <Badge variant={cat.kind === "negative" ? "outline" : "positive"}>{cat.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Comparativa entre sucursales
          </h3>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2">Sucursal</th>
                <th className="py-2">Respuestas</th>
                <th className="py-2">Índice de satisfacción</th>
              </tr>
            </thead>
            <tbody>
              {data.locationPerformance.map((loc) => (
                <tr key={loc.locationId} className="border-t border-border">
                  <td className="py-2">{loc.name}</td>
                  <td className="py-2">{loc.responses}</td>
                  <td className="py-2">{loc.satisfactionIndex === null ? "Sin datos" : `${loc.satisfactionIndex}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Comentarios representativos (anonimizados)
          </h3>
          {data.recentComments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin comentarios en este periodo.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.recentComments.slice(0, 6).map((c, i) => (
                <blockquote key={i} className="border-l-2 border-border pl-3 text-sm text-foreground">
                  “{c.text}”
                  <footer className="mt-1 text-xs text-muted-foreground">
                    {c.rating === "bad" ? "Mala" : c.rating === "good" ? "Buena" : "Excelente"} · {c.locationName}
                  </footer>
                </blockquote>
              ))}
            </div>
          )}
        </section>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Reportes programados</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            Envío automático por correo de este mismo reporte ejecutivo. El envío real lo dispara
            un cron externo (Vercel Cron u otro programador) llamando a{" "}
            <code>/api/cron/reports</code> — no hay cola ni worker propio en este entorno.
          </p>
          <CreateScheduleForm />
          <ScheduleList schedules={schedules ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
