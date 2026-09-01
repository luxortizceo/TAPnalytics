import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ExperienceRating } from "@/lib/supabase/types";

export interface ResolutionFeedbackCase {
  id: string;
  folio: string;
  organizationName: string;
  contactFirstName: string | null;
  alreadyRated: boolean;
  resolutionRating: ExperienceRating | null;
}

/** Resolves everything the public "¿cómo quedó la solución?" page needs from its one-time token. */
export async function getCaseByResolutionToken(token: string): Promise<ResolutionFeedbackCase | null> {
  const admin = createAdminClient();

  const { data: caseRow } = await admin
    .from("cases")
    .select("id, folio, organization_id, contact_name, resolution_rating")
    .eq("resolution_feedback_token", token)
    .maybeSingle();

  if (!caseRow) return null;

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", caseRow.organization_id)
    .single();

  return {
    id: caseRow.id,
    folio: caseRow.folio,
    organizationName: org?.name ?? "",
    contactFirstName: caseRow.contact_name?.trim().split(/\s+/)[0] ?? null,
    alreadyRated: caseRow.resolution_rating !== null,
    resolutionRating: caseRow.resolution_rating,
  };
}
