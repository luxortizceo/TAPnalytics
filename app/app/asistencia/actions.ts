"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { distanceMeters } from "@/lib/geo";
import { zodFieldErrors } from "@/lib/validations/zod-helpers";
import { createAlertAndNotify } from "@/lib/alerts";

export type AttendanceActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string | boolean;
};

// Cuánto margen (en minutos) después de la hora esperada se sigue
// contando como "a tiempo" antes de marcarse "late" y disparar la alerta
// employee_late.
const LATE_GRACE_MINUTES = 5;

async function findOwnTeamMember(organizationId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("id, name, location_id, shift_start_time, status")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

function computeStatus(
  shiftStartTime: string | null,
  timezone: string
): { status: "on_time" | "late"; minutesLate: number } {
  if (!shiftStartTime) return { status: "on_time", minutesLate: 0 };
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const nowMinutes = hh * 60 + mm;

  const [sh, sm] = shiftStartTime.split(":").map(Number);
  const shiftMinutes = sh * 60 + sm;
  const minutesLate = Math.max(0, nowMinutes - shiftMinutes);

  return { status: minutesLate <= LATE_GRACE_MINUTES ? "on_time" : "late", minutesLate };
}

const coordsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function checkIn(
  _prev: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  const parsed = coordsSchema.safeParse({ lat: formData.get("lat"), lng: formData.get("lng") });
  if (!parsed.success) return { error: "No pudimos leer tu ubicación." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró." };

  const { current } = await getCurrentOrganization();
  if (!current) return { error: "No encontramos tu empresa." };

  const teamMember = await findOwnTeamMember(current.organization.id, user.id);
  if (!teamMember) {
    return { error: "Tu cuenta no está vinculada a un perfil de asistencia. Pide a tu gerente que te dé acceso." };
  }
  if (teamMember.status !== "active") {
    return { error: "Tu perfil de asistencia está inactivo." };
  }
  if (!teamMember.location_id) {
    return { error: "Tu perfil no tiene una sucursal asignada." };
  }

  const { data: location } = await supabase
    .from("locations")
    .select("name, latitude, longitude, checkin_radius_meters, timezone")
    .eq("id", teamMember.location_id)
    .single();

  if (!location || location.latitude == null || location.longitude == null) {
    return { error: "Tu sucursal todavía no tiene una ubicación GPS configurada." };
  }

  const { data: openRecord } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("team_member_id", teamMember.id)
    .is("checked_out_at", null)
    .maybeSingle();
  if (openRecord) {
    return { error: "Ya tienes una entrada abierta. Marca tu salida antes de volver a entrar." };
  }

  const distance = distanceMeters(parsed.data.lat, parsed.data.lng, location.latitude, location.longitude);
  if (distance > location.checkin_radius_meters) {
    return {
      error: `Estás a ${Math.round(distance)} m de la sucursal (máximo ${location.checkin_radius_meters} m). Acércate para marcar tu entrada.`,
    };
  }

  const { status, minutesLate } = computeStatus(teamMember.shift_start_time, location.timezone);

  const { error } = await supabase.from("attendance_records").insert({
    organization_id: current.organization.id,
    location_id: teamMember.location_id,
    team_member_id: teamMember.id,
    checkin_lat: parsed.data.lat,
    checkin_lng: parsed.data.lng,
    checkin_distance_meters: distance,
    status,
  });
  if (error) return { error: "No pudimos registrar tu entrada." };

  if (status === "late") {
    const admin = createAdminClient();
    await createAlertAndNotify(admin, {
      organizationId: current.organization.id,
      locationId: teamMember.location_id,
      type: "employee_late",
      severity: "warning",
      title: `${teamMember.name} llegó tarde a ${location.name}`,
      message: `Se esperaba a las ${teamMember.shift_start_time?.slice(0, 5)} — marcó entrada ${minutesLate} min tarde.`,
    });
  }

  revalidatePath("/app/asistencia");
  return { success: status === "late" ? "Entrada registrada (llegaste tarde)." : "Entrada registrada a tiempo." };
}

export async function checkOut(): Promise<AttendanceActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró." };

  const { current } = await getCurrentOrganization();
  if (!current) return { error: "No encontramos tu empresa." };

  const teamMember = await findOwnTeamMember(current.organization.id, user.id);
  if (!teamMember) return { error: "Tu cuenta no está vinculada a un perfil de asistencia." };

  const { data: openRecord } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("team_member_id", teamMember.id)
    .is("checked_out_at", null)
    .order("checked_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!openRecord) return { error: "No tienes una entrada abierta." };

  const { error } = await supabase
    .from("attendance_records")
    .update({ checked_out_at: new Date().toISOString() })
    .eq("id", openRecord.id);
  if (error) return { error: "No pudimos registrar tu salida." };

  revalidatePath("/app/asistencia");
  return { success: "Salida registrada." };
}

const grantAccessSchema = z.object({
  teamMemberId: z.string().trim().min(1),
  email: z.string().trim().email("Correo inválido"),
});

export async function grantTeamMemberAccess(
  _prev: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !organizationId) return { error: "Falta la empresa." };

  const parsed = grantAccessSchema.safeParse({
    teamMemberId: formData.get("teamMemberId"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró." };

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("id, user_id, organization_id")
    .eq("id", parsed.data.teamMemberId)
    .eq("organization_id", organizationId)
    .single();
  if (!teamMember) return { error: "No encontramos a esa persona en el equipo." };
  if (teamMember.user_id) return { error: "Esa persona ya tiene acceso." };

  // Mismo flujo que la invitación de Equipo (app/app/equipo/actions.ts):
  // Supabase entrega el session token en el fragmento de la URL, por eso
  // se redirige a /auth/confirm en vez de directo a /onboarding.
  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/onboarding` }
  );
  if (inviteError || !invited.user) {
    return { error: "No pudimos invitar a ese correo. Verifica que sea válido." };
  }

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: invited.user.id,
    role: "employee",
    status: "invited",
    invited_by: user.id,
    invited_at: new Date().toISOString(),
  });
  if (memberError) {
    return { error: "El usuario ya pertenece a esta empresa o no pudimos agregarlo." };
  }

  const { error: linkError } = await supabase
    .from("team_members")
    .update({ user_id: invited.user.id })
    .eq("id", teamMember.id);
  if (linkError) return { error: "Invitamos al usuario pero no pudimos vincularlo con el roster." };

  revalidatePath("/app/asistencia");
  return { success: `Invitación enviada a ${parsed.data.email}.` };
}

const shiftSchema = z.object({
  teamMemberId: z.string().trim().min(1),
  shiftStartTime: z.string().trim().optional().or(z.literal("")),
  locationId: z.string().trim().optional().or(z.literal("")),
});

export async function updateTeamMemberSchedule(
  _prev: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  const parsed = shiftSchema.safeParse({
    teamMemberId: formData.get("teamMemberId"),
    shiftStartTime: formData.get("shiftStartTime") ?? "",
    locationId: formData.get("locationId") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .update({
      shift_start_time: parsed.data.shiftStartTime || null,
      location_id: parsed.data.locationId && parsed.data.locationId !== "unassigned" ? parsed.data.locationId : null,
    })
    .eq("id", parsed.data.teamMemberId);
  if (error) return { error: "No pudimos actualizar el horario. Verifica tus permisos." };

  revalidatePath("/app/asistencia");
  return { success: true };
}
