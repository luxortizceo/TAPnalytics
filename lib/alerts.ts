import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertSeverity, AlertType, Database, NotificationChannel } from "@/lib/supabase/types";
import { sendEmailAlert, sendPushAlert, sendWhatsAppAlert } from "@/lib/notify";

/**
 * Creates an alert and fans it out to the organization's owner/admin
 * members across whichever channels the org's alert_rule configured (or
 * just in_app with no rule, so alerts work out of the box). Each channel
 * beyond in_app calls the real sender in lib/notify.ts — which itself
 * degrades to a no-op when its provider isn't configured — and records the
 * outcome (delivered_at/delivery_error) on the notification row, so
 * delivery is auditable per user per channel, not just "sent or not".
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

  const { data: members } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .in("role", ["owner", "admin"])
    .eq("status", "active");

  if (!members?.length) return alert;
  const userIds = members.map((m) => m.user_id);

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("user_id, channel, enabled, frequency")
    .eq("organization_id", input.organizationId)
    .eq("category", input.type)
    .in("user_id", userIds);

  function shouldSend(userId: string, channel: NotificationChannel) {
    const pref = prefs?.find((p) => p.user_id === userId && p.channel === channel);
    if (!pref) return true; // no row = defaults (enabled, immediate)
    return pref.enabled && pref.frequency === "immediate";
  }

  for (const channel of channels) {
    if (channel === "in_app") {
      const recipients = userIds.filter((id) => shouldSend(id, "in_app"));
      if (recipients.length) {
        await admin.from("notifications").insert(
          recipients.map((userId) => ({
            user_id: userId,
            organization_id: input.organizationId,
            channel: "in_app" as const,
            type: input.type,
            title: input.title,
            body: input.message,
            related_entity_type: "alert",
            related_entity_id: alert.id,
            delivered_at: new Date().toISOString(),
          }))
        );
      }
      continue;
    }

    if (channel === "email") {
      for (const userId of userIds) {
        if (!shouldSend(userId, "email")) continue;
        const { data: authUser } = await admin.auth.admin.getUserById(userId);
        const email = authUser?.user?.email;
        if (!email) continue;
        const result = await sendEmailAlert({ to: email, title: input.title, body: input.message });
        await admin.from("notifications").insert({
          user_id: userId,
          organization_id: input.organizationId,
          channel: "email",
          type: input.type,
          title: input.title,
          body: input.message,
          related_entity_type: "alert",
          related_entity_id: alert.id,
          delivered_at: result.ok ? new Date().toISOString() : null,
          delivery_error: result.ok ? null : "No pudimos enviar el correo.",
        });
      }
      continue;
    }

    if (channel === "whatsapp") {
      for (const userId of userIds) {
        if (!shouldSend(userId, "whatsapp")) continue;
        const { data: profile } = await admin.from("profiles").select("phone").eq("id", userId).maybeSingle();
        if (!profile?.phone) continue;
        const result = await sendWhatsAppAlert({ to: profile.phone, body: `${input.title}: ${input.message}` });
        await admin.from("notifications").insert({
          user_id: userId,
          organization_id: input.organizationId,
          channel: "whatsapp",
          type: input.type,
          title: input.title,
          body: input.message,
          related_entity_type: "alert",
          related_entity_id: alert.id,
          delivered_at: result.ok ? new Date().toISOString() : null,
          delivery_error: result.ok ? null : "No pudimos enviar el WhatsApp.",
        });
      }
      continue;
    }

    if (channel === "push") {
      for (const userId of userIds) {
        if (!shouldSend(userId, "push")) continue;
        const { data: subscriptions } = await admin
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", userId)
          .eq("organization_id", input.organizationId);
        for (const sub of subscriptions ?? []) {
          const result = await sendPushAlert(sub, { title: input.title, body: input.message });
          if (result.gone) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
            continue;
          }
          await admin.from("notifications").insert({
            user_id: userId,
            organization_id: input.organizationId,
            channel: "push",
            type: input.type,
            title: input.title,
            body: input.message,
            related_entity_type: "alert",
            related_entity_id: alert.id,
            delivered_at: result.ok ? new Date().toISOString() : null,
            delivery_error: result.ok ? null : "No pudimos enviar el push.",
          });
        }
      }
    }
  }

  return alert;
}
