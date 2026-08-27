"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/validations/zod-helpers";
import { generatePublicCode } from "@/lib/utils";
import type { CardStatus, ContactPointType } from "@/lib/supabase/types";

export type CardActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

const CONTACT_POINT_VALUES = [
  "reception",
  "checkout",
  "table",
  "room",
  "counter",
  "exit",
  "employee_badge",
  "receipt",
  "other",
] as const;

const cardSchema = z.object({
  locationId: z.string().trim().min(1, "Elige una sucursal"),
  alias: z.string().trim().max(120).optional().or(z.literal("")),
  contactPointType: z.enum(CONTACT_POINT_VALUES),
  areaLabel: z.string().trim().max(120).optional().or(z.literal("")),
});

export async function createCard(
  _prev: CardActionState,
  formData: FormData
): Promise<CardActionState> {
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !organizationId) return { error: "Falta la empresa." };

  const parsed = cardSchema.safeParse({
    locationId: formData.get("locationId"),
    alias: formData.get("alias") ?? "",
    contactPointType: formData.get("contactPointType"),
    areaLabel: formData.get("areaLabel") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("nfc_cards").insert({
    organization_id: organizationId,
    location_id: parsed.data.locationId,
    public_code: generatePublicCode(),
    alias: parsed.data.alias || null,
    contact_point_type: parsed.data.contactPointType as ContactPointType,
    area_label: parsed.data.areaLabel || null,
    status: "unconfigured",
    created_by: user?.id ?? null,
  });

  if (error) return { error: "No pudimos crear la tarjeta. Verifica tus permisos." };

  revalidatePath("/app/tarjetas");
  return { success: true };
}

export async function updateCard(
  _prev: CardActionState,
  formData: FormData
): Promise<CardActionState> {
  const cardId = formData.get("cardId");
  if (typeof cardId !== "string" || !cardId) return { error: "Falta la tarjeta." };

  const parsed = cardSchema.safeParse({
    locationId: formData.get("locationId"),
    alias: formData.get("alias") ?? "",
    contactPointType: formData.get("contactPointType"),
    areaLabel: formData.get("areaLabel") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const statusRaw = formData.get("status");
  const status = typeof statusRaw === "string" ? (statusRaw as CardStatus) : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: before } = await supabase
    .from("nfc_cards")
    .select("status, location_id, alias")
    .eq("id", cardId)
    .single();

  const { error } = await supabase
    .from("nfc_cards")
    .update({
      location_id: parsed.data.locationId,
      alias: parsed.data.alias || null,
      contact_point_type: parsed.data.contactPointType as ContactPointType,
      area_label: parsed.data.areaLabel || null,
      ...(status ? { status } : {}),
      ...(status === "active" && before?.status !== "active"
        ? { activated_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", cardId);

  if (error) return { error: "No pudimos actualizar la tarjeta. Verifica tus permisos." };

  if (before && status && before.status !== status) {
    await supabase.from("nfc_card_history").insert({
      card_id: cardId,
      changed_by: user?.id ?? null,
      field: "status",
      old_value: before.status,
      new_value: status,
    });
  }

  revalidatePath("/app/tarjetas");
  return { success: true };
}
