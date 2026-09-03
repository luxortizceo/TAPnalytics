"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SECTORS } from "@/lib/validations/organization";
import { zodFieldErrors } from "@/lib/validations/zod-helpers";
import type { Sector } from "@/lib/supabase/types";

export type SettingsState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre de la empresa"),
  sector: z.enum(SECTORS.map((s) => s.value) as [string, ...string[]]),
  logoUrl: z.string().trim().url("Ingresa una URL válida").optional().or(z.literal("")),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal, ej. #1f6feb")
    .optional()
    .or(z.literal("")),
  googleReviewsUrl: z.string().trim().url("Ingresa una URL válida").optional().or(z.literal("")),
  timezone: z.string().trim().min(1),
  currency: z.string().trim().min(1),
  language: z.string().trim().min(1),
});

export async function updateOrganizationSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !organizationId) return { error: "Falta la empresa." };

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    sector: formData.get("sector"),
    logoUrl: formData.get("logoUrl") ?? "",
    brandColor: formData.get("brandColor") ?? "",
    googleReviewsUrl: formData.get("googleReviewsUrl") ?? "",
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
    language: formData.get("language"),
  });
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      sector: parsed.data.sector as Sector,
      logo_url: parsed.data.logoUrl || null,
      brand_color: parsed.data.brandColor || null,
      google_reviews_url: parsed.data.googleReviewsUrl || null,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
      language: parsed.data.language,
    })
    .eq("id", organizationId);

  if (error) return { error: "No pudimos guardar los cambios. Verifica tus permisos." };

  revalidatePath("/app/configuracion");
  return { success: "Cambios guardados." };
}

export async function setNotificationPreference(
  organizationId: string,
  category: string,
  channel: "email" | "push" | "whatsapp",
  enabled: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      organization_id: organizationId,
      category,
      channel,
      enabled,
    },
    { onConflict: "user_id,organization_id,category,channel" }
  );
  if (error) return { error: "No pudimos guardar la preferencia." };

  revalidatePath("/app/configuracion");
  return { success: true };
}
