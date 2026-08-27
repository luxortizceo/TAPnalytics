"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { can } from "@/lib/permissions";
import type { ReportFormat, ReportType } from "@/lib/supabase/types";

export type ScheduleActionState = { error?: string; success?: boolean };

function nextRunAt(frequency: "daily" | "weekly" | "monthly") {
  const now = new Date();
  if (frequency === "daily") return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (frequency === "weekly") return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}

export async function createReportSchedule(
  _prev: ScheduleActionState,
  formData: FormData
): Promise<ScheduleActionState> {
  const { current } = await getCurrentOrganization();
  if (!current || !can(current.role, "export")) return { error: "No tienes permiso para programar reportes." };

  const frequency = formData.get("frequency");
  const format = formData.get("format");
  const recipientsRaw = formData.get("recipients");
  if (frequency !== "daily" && frequency !== "weekly" && frequency !== "monthly") {
    return { error: "Selecciona una frecuencia válida." };
  }
  if (typeof recipientsRaw !== "string" || !recipientsRaw.trim()) {
    return { error: "Agrega al menos un correo destinatario." };
  }
  const recipients = recipientsRaw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  if (recipients.some((r) => !/^\S+@\S+\.\S+$/.test(r))) {
    return { error: "Uno de los correos no es válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("report_schedules").insert({
    organization_id: current.organization.id,
    report_type: "executive" as ReportType,
    frequency,
    format: (typeof format === "string" && format ? format : "pdf") as ReportFormat,
    recipients,
    is_active: true,
    next_run_at: nextRunAt(frequency).toISOString(),
  });
  if (error) return { error: "No pudimos crear el reporte programado." };

  revalidatePath("/app/reportes");
  return { success: true };
}

export async function toggleReportSchedule(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("report_schedules").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: "No pudimos actualizar el reporte programado." };
  revalidatePath("/app/reportes");
  return { success: true };
}

export async function deleteReportSchedule(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("report_schedules").delete().eq("id", id);
  if (error) return { error: "No pudimos eliminar el reporte programado." };
  revalidatePath("/app/reportes");
  return { success: true };
}
