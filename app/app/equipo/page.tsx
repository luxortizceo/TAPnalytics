import { Badge } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { can } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/labels";
import { InviteForm } from "./invite-form";
import type { OrgRole } from "@/lib/supabase/types";

export const metadata = { title: "Equipo" };

interface MemberRow {
  id: string;
  role: OrgRole;
  status: "invited" | "active" | "suspended";
  joined_at: string | null;
  profile: { full_name: string | null } | null;
}

export default async function TeamPage() {
  const { current } = await getCurrentOrganization();
  if (!current) return null;

  const supabase = await createClient();
  // See the cast note in src/lib/data/current-org.ts — embedded resource
  // selects can't be typed against this hand-authored Database.
  const { data: members } = (await supabase
    .from("organization_members")
    .select("id, role, status, joined_at, profile:profiles(full_name)")
    .eq("organization_id", current.organization.id)
    .order("joined_at", { ascending: true })) as unknown as { data: MemberRow[] | null };

  const canManage = can(current.role, "manage_users");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Miembros de {current.organization.name} y sus roles.
        </p>
      </div>

      {canManage && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <InviteForm organizationId={current.organization.id} />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(members ?? []).map((m) => (
              <tr key={m.id} className="bg-surface">
                <td className="px-4 py-3 font-medium text-foreground">
                  {m.profile?.full_name || "Invitación pendiente"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{ROLE_LABELS[m.role]}</td>
                <td className="px-4 py-3">
                  <Badge variant={m.status === "active" ? "positive" : "outline"}>
                    {m.status === "active" ? "Activo" : m.status === "invited" ? "Invitado" : "Suspendido"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
