"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrgStatus } from "@/lib/supabase/types";

export type AdminActionState = { error?: string; success?: boolean };

async function requireSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("is_superadmin").eq("id", user.id).single();
  return !!profile?.is_superadmin;
}

export async function updateOrganizationPlan(organizationId: string, planId: string) {
  if (!(await requireSuperadmin())) return { error: "No autorizado." };
  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update({ plan_id: planId }).eq("id", organizationId);
  if (error) return { error: "No pudimos actualizar el plan." };
  revalidatePath("/admin");
  return { success: true };
}

export async function updateOrganizationStatus(organizationId: string, status: OrgStatus) {
  if (!(await requireSuperadmin())) return { error: "No autorizado." };
  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update({ status }).eq("id", organizationId);
  if (error) return { error: "No pudimos actualizar el estado." };
  revalidatePath("/admin");
  return { success: true };
}

export async function createPlan(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  if (!(await requireSuperadmin())) return { error: "No autorizado." };

  const code = formData.get("code");
  const name = formData.get("name");
  const priceMonthly = formData.get("priceMonthly");
  if (typeof code !== "string" || !code.trim()) return { error: "Falta el código del plan." };
  if (typeof name !== "string" || !name.trim()) return { error: "Falta el nombre del plan." };

  const admin = createAdminClient();
  const { error } = await admin.from("plans").insert({
    code: code.trim(),
    name: name.trim(),
    price_monthly: typeof priceMonthly === "string" && priceMonthly ? Number(priceMonthly) : null,
    is_active: true,
  });
  if (error) return { error: "No pudimos crear el plan (¿código repetido?)." };

  revalidatePath("/admin/planes");
  return { success: true };
}

export async function togglePlanActive(planId: string, isActive: boolean) {
  if (!(await requireSuperadmin())) return { error: "No autorizado." };
  const admin = createAdminClient();
  const { error } = await admin.from("plans").update({ is_active: isActive }).eq("id", planId);
  if (error) return { error: "No pudimos actualizar el plan." };
  revalidatePath("/admin/planes");
  return { success: true };
}

export async function updatePlanPricing(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  if (!(await requireSuperadmin())) return { error: "No autorizado." };

  const planId = formData.get("planId");
  const priceMonthly = formData.get("priceMonthly");
  const priceYearly = formData.get("priceYearly");
  const stripeMonthly = formData.get("stripePriceIdMonthly");
  const stripeYearly = formData.get("stripePriceIdYearly");
  if (typeof planId !== "string" || !planId) return { error: "Plan inválido." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("plans")
    .update({
      price_monthly: typeof priceMonthly === "string" && priceMonthly ? Number(priceMonthly) : null,
      price_yearly: typeof priceYearly === "string" && priceYearly ? Number(priceYearly) : null,
      stripe_price_id_monthly: typeof stripeMonthly === "string" && stripeMonthly ? stripeMonthly : null,
      stripe_price_id_yearly: typeof stripeYearly === "string" && stripeYearly ? stripeYearly : null,
    })
    .eq("id", planId);
  if (error) return { error: "No pudimos guardar los cambios." };

  revalidatePath("/admin/planes");
  return { success: true };
}
