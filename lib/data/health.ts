import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, UrgencyLevel } from "@/lib/supabase/types";

/**
 * Operational health metrics for the dashboard — how well the team is
 * actually working the cases that TAP Intelligence and the survey flow
 * surface, not just how customers are rating their experience.
 */

const URGENCY_ORDER: UrgencyLevel[] = ["critical", "high", "medium", "low"];

export interface HealthData {
  sla: { urgency: UrgencyLevel; resolved: number; onTime: number; pct: number | null }[];
  contactCapture: { withContact: number; total: number; pct: number | null };
  recurrence: { recurred: number; eligible: number; pct: number | null };
}

export interface HealthFilters {
  organizationId: string;
  locationId?: string;
  startDate: Date;
  endDate: Date;
  client?: SupabaseClient<Database>;
}

export async function getHealthData(filters: HealthFilters): Promise<HealthData> {
  const supabase = filters.client ?? (await createClient());
  const { organizationId, locationId, startDate, endDate } = filters;
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  // Cases resolved within the period — used for both SLA compliance and
  // contact-capture rate, so fetch once.
  let resolvedQuery = supabase
    .from("cases")
    .select("id, urgency, due_at, resolved_at, contact_name, contact_email, contact_phone")
    .eq("organization_id", organizationId)
    .not("resolved_at", "is", null)
    .gte("resolved_at", startIso)
    .lt("resolved_at", endIso);
  if (locationId) resolvedQuery = resolvedQuery.eq("location_id", locationId);
  const { data: resolvedCases } = await resolvedQuery;

  const sla: HealthData["sla"] = URGENCY_ORDER.map((urgency) => {
    const cases = (resolvedCases ?? []).filter((c) => c.urgency === urgency);
    const withDueDate = cases.filter((c) => c.due_at);
    const onTime = withDueDate.filter(
      (c) => new Date(c.resolved_at!).getTime() <= new Date(c.due_at!).getTime()
    ).length;
    return {
      urgency,
      resolved: cases.length,
      onTime,
      pct: withDueDate.length > 0 ? Math.round((onTime / withDueDate.length) * 100) : null,
    };
  });

  // Contact-capture rate — all cases created in the period (not just
  // resolved ones), since capturing contact info happens at case creation.
  let createdQuery = supabase
    .from("cases")
    .select("id, contact_name, contact_email, contact_phone")
    .eq("organization_id", organizationId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  if (locationId) createdQuery = createdQuery.eq("location_id", locationId);
  const { data: createdCases } = await createdQuery;
  const withContact = (createdCases ?? []).filter(
    (c) => c.contact_name || c.contact_email || c.contact_phone
  ).length;
  const totalCreated = createdCases?.length ?? 0;

  // Recurrence — of the cases resolved in this period with contact info
  // captured, how many of those same contacts (matched by email or phone)
  // opened another case afterward? A real "did the fix stick" signal
  // without needing customer identity on every anonymous tap.
  const resolvedWithContact = (resolvedCases ?? []).filter(
    (c) => (c.contact_email || c.contact_phone) && c.resolved_at
  );
  let recurred = 0;
  if (resolvedWithContact.length > 0) {
    // Pull every case with contact info for the org and match in JS rather
    // than building an .in()/.or() filter out of user-submitted email/phone
    // text — those can contain commas or quotes that would corrupt a
    // hand-built PostgREST filter string.
    const { data: allContactCases } = await supabase
      .from("cases")
      .select("id, contact_email, contact_phone, created_at")
      .eq("organization_id", organizationId)
      .or("contact_email.not.is.null,contact_phone.not.is.null");

    for (const original of resolvedWithContact) {
      const hasLaterCase = (allContactCases ?? []).some(
        (other) =>
          other.id !== original.id &&
          new Date(other.created_at).getTime() > new Date(original.resolved_at!).getTime() &&
          ((original.contact_email && other.contact_email === original.contact_email) ||
            (original.contact_phone && other.contact_phone === original.contact_phone))
      );
      if (hasLaterCase) recurred++;
    }
  }

  return {
    sla,
    contactCapture: {
      withContact,
      total: totalCreated,
      pct: totalCreated > 0 ? Math.round((withContact / totalCreated) * 100) : null,
    },
    recurrence: {
      recurred,
      eligible: resolvedWithContact.length,
      pct: resolvedWithContact.length > 0 ? Math.round((recurred / resolvedWithContact.length) * 100) : null,
    },
  };
}
