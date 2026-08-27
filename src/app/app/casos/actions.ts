"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CaseStatus, UrgencyLevel } from "@/lib/supabase/types";

export type CaseActionState = { error?: string; success?: boolean };

export async function updateCaseStatus(
  caseId: string,
  status: CaseStatus
): Promise<CaseActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: current } = await supabase
    .from("cases")
    .select("status, first_response_at")
    .eq("id", caseId)
    .single();

  if (!current) return { error: "Caso no encontrado." };

  const now = new Date().toISOString();
  const update: {
    status: CaseStatus;
    first_response_at?: string;
    resolved_at?: string;
    closed_at?: string;
  } = { status };
  if (!current.first_response_at && status !== "new") update.first_response_at = now;
  if (status === "resolved") update.resolved_at = now;
  if (status === "closed") update.closed_at = now;

  const { error } = await supabase.from("cases").update(update).eq("id", caseId);
  if (error) return { error: "No pudimos actualizar el caso." };

  if (current.status !== status) {
    await supabase.from("case_history").insert({
      case_id: caseId,
      actor_id: user?.id ?? null,
      field: "status",
      old_value: current.status,
      new_value: status,
    });
  }

  revalidatePath("/app/casos");
  revalidatePath(`/app/casos/${caseId}`);
  return { success: true };
}

export async function updateCaseUrgency(
  caseId: string,
  urgency: UrgencyLevel
): Promise<CaseActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: current } = await supabase.from("cases").select("urgency").eq("id", caseId).single();
  if (!current) return { error: "Caso no encontrado." };

  const { error } = await supabase.from("cases").update({ urgency }).eq("id", caseId);
  if (error) return { error: "No pudimos actualizar la prioridad." };

  if (current.urgency !== urgency) {
    await supabase.from("case_history").insert({
      case_id: caseId,
      actor_id: user?.id ?? null,
      field: "urgency",
      old_value: current.urgency,
      new_value: urgency,
    });
  }

  revalidatePath(`/app/casos/${caseId}`);
  return { success: true };
}

export async function assignCase(caseId: string, assigneeId: string | null): Promise<CaseActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: current } = await supabase.from("cases").select("assigned_to").eq("id", caseId).single();
  if (!current) return { error: "Caso no encontrado." };

  const { error } = await supabase.from("cases").update({ assigned_to: assigneeId }).eq("id", caseId);
  if (error) return { error: "No pudimos asignar el caso." };

  if (current.assigned_to !== assigneeId) {
    await supabase.from("case_history").insert({
      case_id: caseId,
      actor_id: user?.id ?? null,
      field: "assigned_to",
      old_value: current.assigned_to,
      new_value: assigneeId,
    });
  }

  revalidatePath(`/app/casos/${caseId}`);
  return { success: true };
}

export async function addCaseNote(
  _prev: CaseActionState,
  formData: FormData
): Promise<CaseActionState> {
  const caseId = formData.get("caseId");
  const note = formData.get("note");
  if (typeof caseId !== "string" || !caseId) return { error: "Falta el caso." };
  if (typeof note !== "string" || !note.trim()) return { error: "Escribe una nota." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("case_notes").insert({
    case_id: caseId,
    author_id: user?.id ?? null,
    note: note.trim(),
    is_internal: true,
  });

  if (error) return { error: "No pudimos guardar la nota." };

  revalidatePath(`/app/casos/${caseId}`);
  return { success: true };
}
