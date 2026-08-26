import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { can } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { LocationDialog } from "./location-dialog";
import { ArchiveLocationButton } from "./archive-button";

export const metadata = { title: "Sucursales" };

export default async function LocationsPage() {
  const { current } = await getCurrentOrganization();
  if (!current) return null;

  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("organization_id", current.organization.id)
    .order("created_at", { ascending: true });

  const canEdit = can(current.role, "edit");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sucursales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra las sucursales de {current.organization.name}.
          </p>
        </div>
        {canEdit && <LocationDialog organizationId={current.organization.id} />}
      </div>

      {!locations || locations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Aún no tienes sucursales registradas.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Ciudad</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Google Reviews</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {locations.map((loc) => (
                <tr key={loc.id} className="bg-surface">
                  <td className="px-4 py-3 font-medium text-foreground">{loc.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{loc.city || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={loc.status === "active" ? "positive" : "outline"}>
                      {loc.status === "active" ? "Activa" : "Inactiva"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {loc.google_reviews_url ? "Configurada" : "Sin configurar"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEdit && (
                      <div className="flex justify-end gap-1">
                        <LocationDialog organizationId={current.organization.id} location={loc} />
                        <ArchiveLocationButton locationId={loc.id} locationName={loc.name} />
                      </div>
                    )}
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
