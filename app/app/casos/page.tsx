import { Badge } from "@/components/ui/primitives";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER, URGENCY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CaseStatus, UrgencyLevel } from "@/lib/supabase/types";

export const metadata = { title: "Casos" };

function statusBadgeVariant(status: CaseStatus) {
  if (status === "resolved" || status === "closed") return "positive" as const;
  if (status === "new") return "accent" as const;
  return "outline" as const;
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; urgency?: string; locationId?: string }>;
}) {
  const { status, urgency, locationId } = await searchParams;
  const { current } = await getCurrentOrganization();
  if (!current) return null;

  const supabase = await createClient();

  const [{ data: locations }, casesQuery] = await Promise.all([
    supabase.from("locations").select("id, name").eq("organization_id", current.organization.id),
    (async () => {
      let query = supabase
        .from("cases")
        .select("id, folio, rating, urgency, status, created_at, due_at, location_id")
        .eq("organization_id", current.organization.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (status) query = query.eq("status", status as CaseStatus);
      if (urgency) query = query.eq("urgency", urgency as UrgencyLevel);
      if (locationId) query = query.eq("location_id", locationId);
      return query;
    })(),
  ]);

  const cases = casesQuery.data ?? [];
  const locationById = new Map((locations ?? []).map((l) => [l.id, l.name]));

  function filterUrl(params: Record<string, string | undefined>) {
    const merged = { status, urgency, locationId, ...params };
    const sp = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => v && sp.set(k, v));
    const qs = sp.toString();
    return qs ? `/app/casos?${qs}` : "/app/casos";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Casos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evaluaciones negativas y urgentes convertidas en casos accionables.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterPill href={filterUrl({ status: undefined })} active={!status} label="Todos los estados" />
        {CASE_STATUS_ORDER.map((s) => (
          <FilterPill key={s} href={filterUrl({ status: s })} active={status === s} label={CASE_STATUS_LABELS[s]} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterPill href={filterUrl({ urgency: undefined })} active={!urgency} label="Toda urgencia" />
        {(["critical", "high", "medium", "low"] as UrgencyLevel[]).map((u) => (
          <FilterPill key={u} href={filterUrl({ urgency: u })} active={urgency === u} label={URGENCY_LABELS[u]} />
        ))}
        {locations && locations.length > 0 && (
          <>
            <span className="mx-1 text-muted-foreground">·</span>
            <FilterPill href={filterUrl({ locationId: undefined })} active={!locationId} label="Toda sucursal" />
            {locations.map((loc) => (
              <FilterPill
                key={loc.id}
                href={filterUrl({ locationId: loc.id })}
                active={locationId === loc.id}
                label={loc.name}
              />
            ))}
          </>
        )}
      </div>

      {cases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No hay casos con estos filtros.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Folio</th>
                <th className="px-4 py-3 font-medium">Sucursal</th>
                <th className="px-4 py-3 font-medium">Urgencia</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Creado</th>
                <th className="px-4 py-3 font-medium">Vence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cases.map((c) => (
                <tr key={c.id} className="bg-surface hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link href={`/app/casos/${c.id}`} className="font-mono text-xs font-medium text-foreground underline underline-offset-2">
                      {c.folio}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{locationById.get(c.location_id) ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.urgency === "critical" || c.urgency === "high" ? (
                      <Badge variant={c.urgency === "critical" ? "accent" : "warning"}>
                        {URGENCY_LABELS[c.urgency]}
                      </Badge>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">
                        {URGENCY_LABELS[c.urgency]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(c.status)}>{CASE_STATUS_LABELS[c.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("es-MX")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.due_at ? new Date(c.due_at).toLocaleDateString("es-MX") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterPill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface text-muted-foreground hover:bg-surface-2"
      )}
    >
      {label}
    </Link>
  );
}
