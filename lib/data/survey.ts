import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SurveyCard {
  cardId: string;
  organizationId: string;
  locationId: string;
  organizationName: string;
  logoUrl: string | null;
  sector: string;
  locationName: string;
  googleReviewsUrl: string | null;
  landing: {
    welcomeMessage: string;
    mainQuestion: string;
    thankYouMessage: string;
  };
}

const DEFAULT_LANDING = {
  welcomeMessage: "Gracias por tu visita",
  mainQuestion: "¿Cómo fue tu experiencia?",
  thankYouMessage: "Gracias por compartir tu opinión con nosotros.",
};

/** Resolves everything the public survey landing needs from a card's public_code. */
export async function getSurveyCard(publicCode: string): Promise<SurveyCard | null> {
  const admin = createAdminClient();

  const { data: card } = await admin
    .from("nfc_cards")
    .select("id, organization_id, location_id, status")
    .eq("public_code", publicCode.toUpperCase())
    .is("deleted_at", null)
    .maybeSingle();

  if (!card || card.status === "deactivated" || card.status === "lost" || card.status === "unconfigured") {
    return null;
  }

  const [{ data: org }, { data: location }] = await Promise.all([
    admin
      .from("organizations")
      .select("name, logo_url, sector, google_reviews_url")
      .eq("id", card.organization_id)
      .single(),
    admin
      .from("locations")
      .select("name, google_reviews_url, settings")
      .eq("id", card.location_id)
      .single(),
  ]);

  if (!org || !location) return null;

  const landingSettings = (location.settings as { landing?: Partial<typeof DEFAULT_LANDING> } | null)
    ?.landing;

  return {
    cardId: card.id,
    organizationId: card.organization_id,
    locationId: card.location_id,
    organizationName: org.name,
    logoUrl: org.logo_url,
    sector: org.sector,
    locationName: location.name,
    googleReviewsUrl: location.google_reviews_url ?? org.google_reviews_url,
    landing: { ...DEFAULT_LANDING, ...landingSettings },
  };
}

export interface SurveyCategory {
  id: string;
  code: string;
  label: string;
  kind: "positive" | "negative";
}

/** Global catalog + this org's own categories, scoped to its sector. */
export async function getFeedbackCategories(
  organizationId: string,
  sector: string
): Promise<SurveyCategory[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("feedback_categories")
    .select("id, code, label, kind, sector, organization_id")
    .eq("is_active", true)
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .or(`sector.is.null,sector.eq.${sector}`)
    .order("sort_order", { ascending: true });

  return (data ?? []).map((c) => ({ id: c.id, code: c.code, label: c.label, kind: c.kind }));
}

export async function getFeedbackSessionByToken(sessionToken: string, cardId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("feedback_sessions")
    .select("id, tap_event_id, status, rating")
    .eq("session_token", sessionToken)
    .eq("card_id", cardId)
    .maybeSingle();
  return data;
}
