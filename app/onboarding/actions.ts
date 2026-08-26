"use server";

import { z } from "zod";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createOrganizationSchema, createLocationSchema } from "@/lib/validations/organization";
import { zodFieldErrors } from "@/lib/validations/zod-helpers";
import { ORG_COOKIE } from "@/lib/data/current-org";
import { generatePublicCode } from "@/lib/nfc";
import type { Sector } from "@/lib/supabase/types";

export type OnboardingState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  organizationId?: string;
  locationId?: string;
  publicCode?: string;
};

const fieldErrorsOf = zodFieldErrors;

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "empresa"
  );
}

export async function createOrganizationAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    sector: formData.get("sector"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Inicia sesión de nuevo." };

  const baseSlug = slugify(parsed.data.name);
  const slug = `${baseSlug}-${nanoid(6).toLowerCase()}`;

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: parsed.data.name,
      slug,
      sector: parsed.data.sector as Sector,
      onboarding_step: "location",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !org) {
    return { error: "No pudimos crear tu empresa. Intenta de nuevo." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, org.id, { httpOnly: true, sameSite: "lax", path: "/" });

  revalidatePath("/onboarding");
  return { success: true, organizationId: org.id };
}

export async function createLocationAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !organizationId) {
    return { error: "No encontramos tu empresa. Vuelve al paso anterior." };
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
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { data: location, error } = await supabase
    .from("locations")
    .insert({
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
    })
    .select("id")
    .single();

  if (error || !location) return { error: "No pudimos crear la sucursal. Intenta de nuevo." };

  await supabase
    .from("organizations")
    .update({ onboarding_step: "branding" })
    .eq("id", organizationId);

  revalidatePath("/onboarding");
  return { success: true, organizationId, locationId: location.id };
}

const brandingSchema = z.object({
  logoUrl: z.string().trim().url("Ingresa una URL válida").optional().or(z.literal("")),
  googleReviewsUrl: z.string().trim().url("Ingresa una URL válida").optional().or(z.literal("")),
});

export async function updateBrandingAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !organizationId) {
    return { error: "No encontramos tu empresa. Vuelve al paso anterior." };
  }

  const parsed = brandingSchema.safeParse({
    logoUrl: formData.get("logoUrl") ?? "",
    googleReviewsUrl: formData.get("googleReviewsUrl") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      logo_url: parsed.data.logoUrl || null,
      google_reviews_url: parsed.data.googleReviewsUrl || null,
      onboarding_step: "landing",
    })
    .eq("id", organizationId);

  if (error) return { error: "No pudimos guardar tu marca. Intenta de nuevo." };

  revalidatePath("/onboarding");
  return { success: true, organizationId };
}

const landingSchema = z.object({
  welcomeMessage: z.string().trim().min(1, "Escribe un mensaje de bienvenida").max(240),
  mainQuestion: z.string().trim().min(1).max(160),
  thankYouMessage: z.string().trim().min(1, "Escribe un mensaje de agradecimiento").max(240),
});

export async function updateLandingAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const organizationId = formData.get("organizationId");
  const locationId = formData.get("locationId");
  if (typeof organizationId !== "string" || typeof locationId !== "string" || !organizationId || !locationId) {
    return { error: "No encontramos tu sucursal. Vuelve al paso anterior." };
  }

  const parsed = landingSchema.safeParse({
    welcomeMessage: formData.get("welcomeMessage"),
    mainQuestion: formData.get("mainQuestion") || "¿Cómo fue tu experiencia?",
    thankYouMessage: formData.get("thankYouMessage"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("locations")
    .update({ settings: { landing: parsed.data } })
    .eq("id", locationId);

  if (error) return { error: "No pudimos guardar la configuración de tu landing." };

  await supabase
    .from("organizations")
    .update({ onboarding_step: "card" })
    .eq("id", organizationId);

  revalidatePath("/onboarding");
  return { success: true, organizationId, locationId };
}

export async function createFirstCardAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const organizationId = formData.get("organizationId");
  const locationId = formData.get("locationId");
  const alias = formData.get("alias");
  if (typeof organizationId !== "string" || typeof locationId !== "string" || !organizationId || !locationId) {
    return { error: "No encontramos tu sucursal. Vuelve al paso anterior." };
  }

  const supabase = await createClient();
  const publicCode = generatePublicCode();
  const { error } = await supabase.from("nfc_cards").insert({
    organization_id: organizationId,
    location_id: locationId,
    public_code: publicCode,
    alias: typeof alias === "string" && alias ? alias : "Tarjeta principal",
    status: "active",
    activated_at: new Date().toISOString(),
  });

  if (error) return { error: "No pudimos crear tu tarjeta NFC. Intenta de nuevo." };

  await supabase
    .from("organizations")
    .update({ onboarding_step: "test", onboarding_completed_at: new Date().toISOString() })
    .eq("id", organizationId);

  revalidatePath("/onboarding");
  return { success: true, organizationId, locationId, publicCode };
}

export async function finishOnboardingAction() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const organizationId = cookieStore.get(ORG_COOKIE)?.value;
  if (organizationId) {
    await supabase
      .from("organizations")
      .update({ onboarding_step: "done" })
      .eq("id", organizationId);
  }
}
