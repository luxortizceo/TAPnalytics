import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { can } from "@/lib/permissions";
import type { LocationRow, TeamMemberRow } from "@/lib/supabase/types";
import { CheckinWidget } from "./checkin-widget";
import { TeamRoster, AttendanceReport, type AttendanceReportRow } from "./roster-ui";

export const metadata = { title: "Asistencia" };

export default async function AsistenciaPage() {
  const { current } = await getCurrentOrganization();
  if (!current) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const canManage = can(current.role, "manage_users");

  const [{ data: ownTeamMember }, { data: locations }] = await Promise.all([
    user
      ? supabase
          .from("team_members")
          .select("id")
          .eq("organization_id", current.organization.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("locations")
      .select("*")
      .eq("organization_id", current.organization.id)
      .order("name", { ascending: true }) as unknown as Promise<{ data: LocationRow[] | null }>,
  ]);

  let openRecord: { checkedInAt: string; status: "on_time" | "late" } | null = null;
  if (ownTeamMember) {
    const { data } = await supabase
      .from("attendance_records")
      .select("checked_in_at, status")
      .eq("team_member_id", ownTeamMember.id)
      .is("checked_out_at", null)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) openRecord = { checkedInAt: data.checked_in_at, status: data.status };
  }

  let members: TeamMemberRow[] = [];
  let reportRows: AttendanceReportRow[] = [];

  if (canManage) {
    const { data: teamMembers } = (await supabase
      .from("team_members")
      .select("*")
      .eq("organization_id", current.organization.id)
      .order("name", { ascending: true })) as unknown as { data: TeamMemberRow[] | null };
    members = teamMembers ?? [];

    const memberNameById = new Map(members.map((m) => [m.id, m.name]));
    const locationNameById = new Map((locations ?? []).map((l) => [l.id, l.name]));

    const { data: records } = await supabase
      .from("attendance_records")
      .select("id, team_member_id, location_id, checked_in_at, checked_out_at, status, checkin_distance_meters")
      .eq("organization_id", current.organization.id)
      .order("checked_in_at", { ascending: false })
      .limit(50);

    reportRows = (records ?? []).map((r) => ({
      id: r.id,
      memberName: memberNameById.get(r.team_member_id) ?? "—",
      locationName: locationNameById.get(r.location_id) ?? "—",
      checkedInAt: r.checked_in_at,
      checkedOutAt: r.checked_out_at,
      status: r.status,
      distanceMeters: r.checkin_distance_meters,
    }));
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asistencia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra tu entrada y salida, o revisa la puntualidad del equipo.
        </p>
      </div>

      {ownTeamMember && <CheckinWidget openRecord={openRecord} />}

      {!ownTeamMember && !canManage && (
        <p className="text-sm text-muted-foreground">
          Tu cuenta todavía no está vinculada a un perfil de asistencia. Pide a tu gerente que te
          dé acceso desde esta misma pantalla.
        </p>
      )}

      {canManage && (
        <>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Equipo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Asigna sucursal y hora esperada de entrada, o dale acceso a alguien para que pueda
              marcar su propia asistencia.
            </p>
            <div className="mt-4">
              <TeamRoster organizationId={current.organization.id} locations={locations ?? []} members={members} />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold tracking-tight">Registros recientes</h2>
            <div className="mt-4">
              <AttendanceReport rows={reportRows} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
