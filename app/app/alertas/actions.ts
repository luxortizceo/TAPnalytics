"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AlertStatus, AlertType } from "@/lib/supabase/types";

export async function setAlertStatus(alertId: string, status: AlertStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const update: { status: AlertStatus; acknowledged_by?: string; acknowledged_at?: string; resolved_at?: string } = {
    status,
  };
  if (status === "acknowledged") {
    update.acknowledged_by = user?.id;
    update.acknowledged_at = new Date().toISOString();
  }
  if (status === "resolved") {
    update.resolved_at = new Date().toISOString();
  }

  await supabase.from("alerts").update(update).eq("id", alertId);
  revalidatePath("/app/alertas");
}

export async function toggleAlertRule(
  organizationId: string,
  type: AlertType,
  name: string,
  isActive: boolean
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("alert_rules")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("type", type)
    .maybeSingle();

  if (existing) {
    await supabase.from("alert_rules").update({ is_active: isActive }).eq("id", existing.id);
  } else {
    await supabase.from("alert_rules").insert({
      organization_id: organizationId,
      type,
      name,
      channels: ["in_app"],
      is_active: isActive,
    });
  }

  revalidatePath("/app/alertas");
}
