import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { getPunctualityData } from "@/lib/data/punctuality";
import { resolvePeriod, PERIOD_LABELS } from "@/lib/date-ranges";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PeriodFilter } from "../../dashboard/period-filter";

export const metadata = { title: "Reportes de puntualidad" };

export default async function PunctualityReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; locationId?: string }>;
}) {
  const { period, from, to, locationId } = await searchParams;
  const { current } = await getCurrentOrganization();
  if (!current) return null;
  if (!can(current.role, "manage_users")) {
    return <p className="text-sm text-muted-foreground">No tienes permiso para ver esta sección.</p>;
  }

  const { key, start, end } = resolvePeriod(period, from, to);

  const supabase = await createClient();
  const [{ data: locations }, data] = await Promise.all([
    supabase.from("locations").select("id, name").eq("organization_id", current.organization.id).order("name"),
    getPunctualityData({
      organizationId: current.organization.id,
      locationId,
      startDate: start,
      endDate: end,
    }),
  ]);

  const exportParams = new URLSearchParams();
  exportParams.set("from", start.toISOString());
  exportParams.set("to", end.toISOString());
  if (locationId) exportParams.set("locationId", locationId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes de puntualidad</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quién llega a tiempo, quién no, y cuánto — por persona y por sucursal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter period={key} from={from} to={to} locations={locations ?? []} locationId={locationId} />
          <Button asChild variant="secondary">
            <a href={`/app/asistencia/reportes/export?${exportParams.toString()}`}>
              <Download className="size-4" />
              Exportar CSV
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href={`/app/asistencia/reportes/export?${exportParams.toString()}&format=xlsx`}>
              <Download className="size-4" />
              Exportar Excel
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Check-ins totales" value={data.totalCheckins} />
        <StatCard label="A tiempo" value={data.onTimeCount} />
        <StatCard label="Tarde" value={data.lateCount} valueClassName={data.lateCount > 0 ? "text-warning" : ""} />
        <StatCard
          label="% de puntualidad"
          value={data.totalCheckins === 0 ? "Sin datos" : `${data.onTimeRate}%`}
        />
      </div>

      {data.avgMinutesLate > 0 && (
        <p className="text-sm text-muted-foreground">
          En promedio, quien llega tarde lo hace{" "}
          <strong className="text-warning">{data.avgMinutesLate} min</strong> después de su hora — {PERIOD_LABELS[key]}
          {locationId && locations ? ` · ${locations.find((l) => l.id === locationId)?.name}` : ""}.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Por persona</CardTitle>
        </CardHeader>
        <CardContent>
          {data.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay check-ins registrados en este periodo.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Persona</th>
                    <th className="px-4 py-3 font-medium">Sucursal</th>
                    <th className="px-4 py-3 font-medium">Check-ins</th>
                    <th className="px-4 py-3 font-medium">A tiempo</th>
                    <th className="px-4 py-3 font-medium">Tarde</th>
                    <th className="px-4 py-3 font-medium">% Puntualidad</th>
                    <th className="px-4 py-3 font-medium">Prom. min. tarde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.members.map((m) => (
                    <tr key={m.teamMemberId} className="bg-surface">
                      <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.locationName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.totalCheckins}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.onTimeCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.lateCount}</td>
                      <td className="px-4 py-3">
                        <Badge variant={m.onTimeRate >= 90 ? "positive" : m.onTimeRate >= 70 ? "warning" : "outline"}>
                          {m.onTimeRate}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.lateCount === 0 ? "—" : `${m.avgMinutesLate} min`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data.dailyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Por día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">A tiempo</th>
                    <th className="px-4 py-3 font-medium">Tarde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.dailyTrend.map((d) => (
                    <tr key={d.date} className="bg-surface">
                      <td className="px-4 py-3 text-foreground">
                        {new Date(`${d.date}T00:00:00`).toLocaleDateString("es-MX", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{d.onTime}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.late}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-semibold tracking-tight ${valueClassName ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
