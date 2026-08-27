import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ExperienceRating, UrgencyLevel } from "@/lib/supabase/types";

// Default response-time SLA by urgency, used to set cases.due_at when a
// case is auto-created from a bad review. Configurable per-org SLAs are a
// later phase; these are sane, documented defaults.
const DUE_HOURS_BY_URGENCY: Record<UrgencyLevel, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 120,
};

export async function createCaseFromFeedback(
  admin: SupabaseClient<Database>,
  input: {
    organizationId: string;
    locationId: string;
    feedbackSessionId: string;
    rating: ExperienceRating;
    summary: string | null;
    urgency: UrgencyLevel;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  }
) {
  const dueAt = new Date(
    Date.now() + DUE_HOURS_BY_URGENCY[input.urgency] * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("cases")
    .insert({
      organization_id: input.organizationId,
      location_id: input.locationId,
      feedback_session_id: input.feedbackSessionId,
      rating: input.rating,
      summary: input.summary?.slice(0, 240) || null,
      urgency: input.urgency,
      status: "new",
      due_at: dueAt,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
    })
    .select("id, folio")
    .single();

  if (error) {
    console.error("[cases] failed to auto-create case from feedback", error);
    return null;
  }
  return data;
}
