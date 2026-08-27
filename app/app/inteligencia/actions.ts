"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { generateInsights } from "@/lib/intelligence";
import type { CorrectiveActionStatus, RecommendationStatus } from "@/lib/supabase/types";

export type IntelligenceActionState = { error?: string; success?: boolean; created?: number };

const CAN_REFRESH_INSIGHTS: readonly string[] = ["owner", "admin", "superadmin"];

export async function refreshInsights(): Promise<IntelligenceActionState> {
  const { current } = await getCurrentOrganization();
  if (!current || !CAN_REFRESH_INSIGHTS.includes(current.role)) {
    return { error: "No tienes permiso para generar un nuevo análisis." };
  }

  const admin = createAdminClient();
  const created = await generateInsights(admin, current.organization.id);
  revalidatePath("/app/inteligencia");
  return { success: true, created: created.length };
}

export async function updateRecommendationStatus(id: string, status: RecommendationStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("recommendations").update({ status }).eq("id", id);
  if (error) return { error: "No pudimos actualizar la recomendación." };
  revalidatePath("/app/inteligencia");
  return { success: true };
}

export type CorrectiveActionFormState = { error?: string; success?: boolean };

export async function createCorrectiveAction(
  _prev: CorrectiveActionFormState,
  formData: FormData
): Promise<CorrectiveActionFormState> {
  const recommendationId = formData.get("recommendationId");
  const title = formData.get("title");
  const dueDate = formData.get("dueDate");
  if (typeof recommendationId !== "string" || !recommendationId) return { error: "Falta la recomendación." };
  if (typeof title !== "string" || !title.trim()) return { error: "Escribe un título." };

  const { current } = await getCurrentOrganization();
  if (!current) return { error: "Sesión inválida." };

  const supabase = await createClient();
  const { error } = await supabase.from("corrective_actions").insert({
    organization_id: current.organization.id,
    recommendation_id: recommendationId,
    title: title.trim(),
    due_date: typeof dueDate === "string" && dueDate ? dueDate : null,
    status: "planned",
  });
  if (error) return { error: "No pudimos crear la acción correctiva." };

  revalidatePath("/app/inteligencia");
  return { success: true };
}

export async function updateCorrectiveActionStatus(id: string, status: CorrectiveActionStatus) {
  const supabase = await createClient();
  const update: { status: CorrectiveActionStatus; completed_at?: string | null } = { status };
  update.completed_at = status === "done" ? new Date().toISOString() : null;
  const { error } = await supabase.from("corrective_actions").update(update).eq("id", id);
  if (error) return { error: "No pudimos actualizar la acción." };
  revalidatePath("/app/inteligencia");
  return { success: true };
}
