"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createLocationSchema } from "@/lib/validations/organization";
import { zodFieldErrors } from "@/lib/validations/zod-helpers";

export type LocationActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

const fieldErrorsOf = zodFieldErrors;

export async function createLocation(
  _prev: LocationActionState,
  formData: FormData
): Promise<LocationActionState> {
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !organizationId) {
    return { error: "Falta la empresa." };
  }

  const parsed = createLocationSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    timezone: formData.get("timezone") || "America/Mexico_City",
    currency: formData.get("currency") || "MXN",
    googleReviewsUrl: formData.get("googleReviewsUrl") ?? "",
    latitude: formData.get("latitude") || "",
    longitude: formData.get("longitude") || "",
    checkinRadiusMeters: formData.get("checkinRadiusMeters") || 150,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  // RLS enforces that only owner/admin may insert — this is the UX-level
  // error path when a lower-privileged member somehow reaches the form.
  const { error } = await supabase.from("locations").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    address: parsed.data.address || null,
    city: parsed.data.city || null,
    state: parsed.data.state || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    timezone: parsed.data.timezone,
    currency: parsed.data.currency,
    google_reviews_url: parsed.data.googleReviewsUrl || null,
    latitude: parsed.data.latitude === "" ? null : parsed.data.latitude,
    longitude: parsed.data.longitude === "" ? null : parsed.data.longitude,
    checkin_radius_meters: parsed.data.checkinRadiusMeters,
  });

  if (error) return { error: "No pudimos crear la sucursal. Verifica tus permisos." };

  revalidatePath("/app/sucursales");
  return { success: true };
}

export async function updateLocation(
  _prev: LocationActionState,
  formData: FormData
): Promise<LocationActionState> {
  const locationId = formData.get("locationId");
  if (typeof locationId !== "string" || !locationId) return { error: "Falta la sucursal." };

  const parsed = createLocationSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    timezone: formData.get("timezone") || "America/Mexico_City",
    currency: formData.get("currency") || "MXN",
    googleReviewsUrl: formData.get("googleReviewsUrl") ?? "",
    latitude: formData.get("latitude") || "",
    longitude: formData.get("longitude") || "",
    checkinRadiusMeters: formData.get("checkinRadiusMeters") || 150,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const status = formData.get("status");
  const { error } = await supabase
    .from("locations")
    .update({
      name: parsed.data.name,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
      google_reviews_url: parsed.data.googleReviewsUrl || null,
      latitude: parsed.data.latitude === "" ? null : parsed.data.latitude,
      longitude: parsed.data.longitude === "" ? null : parsed.data.longitude,
      checkin_radius_meters: parsed.data.checkinRadiusMeters,
      ...(status === "active" || status === "inactive" ? { status } : {}),
    })
    .eq("id", locationId);

  if (error) return { error: "No pudimos actualizar la sucursal. Verifica tus permisos." };

  revalidatePath("/app/sucursales");
  return { success: true };
}

export async function archiveLocation(formData: FormData) {
  const locationId = formData.get("locationId");
  if (typeof locationId !== "string" || !locationId) return;

  const supabase = await createClient();
  await supabase.from("locations").update({ deleted_at: new Date().toISOString() }).eq("id", locationId);
  revalidatePath("/app/sucursales");
}
