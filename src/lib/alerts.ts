import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertSeverity, AlertType, Database, NotificationChannel } from "@/lib/supabase/types";

/**
 * Creates an alert and fans it out as in-app notifications to the
 * organization's owner/admin members. Respects an active alert_rule for
 * the given type if the org configured one (e.g. to disable a type or
 * change channels); with no rule configured, defaults to in_app so alerts
 * work out of the box without setup.
 */
export async function createAlertAndNotify(
  admin: SupabaseClient<Database>,
  input: {
    organizationId: string;
    locationId: string | null;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    relatedCaseId?: string | null;
    relatedTapEventId?: string | null;
  }
) {
  const { data: rule } = await admin
    .from("alert_rules")
    .select("id, is_active, channels")
    .eq("organization_id", input.organizationId)
    .eq("type", input.type)
    .maybeSingle();

  if (rule && !rule.is_active) return null; // org explicitly turned this alert type off

  const channels: NotificationChannel[] = rule?.channels?.length ? rule.channels : ["in_app"];

  const { data: alert, error } = await admin
    .from("alerts")
    .insert({
      organization_id: input.organizationId,
      location_id: input.locationId,
      alert_rule_id: rule?.id ?? null,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      related_case_id: input.relatedCaseId ?? null,
      related_tap_event_id: input.relatedTapEventId ?? null,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !alert) {
    console.error("[alerts] failed to create alert", error);
    return null;
  }

  if (channels.includes("in_app")) {
    const { data: members } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", input.organizationId)
      .in("role", ["owner", "admin"])
      .eq("status", "active");

    if (members?.length) {
      await admin.from("notifications").insert(
        members.map((m) => ({
          user_id: m.user_id,
          organization_id: input.organizationId,
          channel: "in_app" as const,
          type: input.type,
          title: input.title,
          body: input.message,
          related_entity_type: "alert",
          related_entity_id: alert.id,
        }))
      );
    }
  }

  return alert;
}
