import "server-only";
import webpush from "web-push";
import { sendTransactionalEmail, escapeHtml } from "@/lib/email";
import type { PushSubscriptionRow } from "@/lib/supabase/types";

/**
 * Real per-channel senders for alerts/notifications (Fase 4). Each function
 * degrades to `{ ok: true, skipped: true }` when its provider isn't
 * configured, same convention as lib/email.ts — a missing credential logs a
 * warning instead of failing the request that triggered the alert.
 */

export async function sendEmailAlert(input: { to: string; title: string; body: string }) {
  return sendTransactionalEmail({
    to: input.to,
    subject: input.title,
    html: `<p>${escapeHtml(input.body)}</p>`,
  });
}

// Real Web Push endpoints only ever come from browser-vendor push services.
// An endpoint is client-supplied (POST /api/push/subscribe), and the server
// later makes an HTTP request to it (webpush.sendNotification below) — an
// unvalidated endpoint would let an authenticated user point the server at
// an internal/private URL (SSRF). Allowlisting known push-service hosts
// closes that off.
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com", // Chrome, Edge, other Chromium browsers
  "updates.push.services.mozilla.com", // Firefox
  "push.apple.com", // Safari (and *.push.apple.com)
  "notify.windows.com", // legacy Edge/WNS (and wns2-*.notify.windows.com)
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return ALLOWED_PUSH_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return true;
  if (!process.env.WEB_PUSH_PUBLIC_KEY || !process.env.WEB_PUSH_PRIVATE_KEY) return false;
  webpush.setVapidDetails(
    `mailto:${process.env.RESEND_FROM_EMAIL || "notificaciones@tapnalytics.com"}`,
    process.env.WEB_PUSH_PUBLIC_KEY,
    process.env.WEB_PUSH_PRIVATE_KEY
  );
  vapidConfigured = true;
  return true;
}

export async function sendPushAlert(
  subscription: PushSubscriptionRow,
  input: { title: string; body: string }
): Promise<{ ok: boolean; skipped?: boolean; gone?: boolean }> {
  if (!ensureVapid()) {
    console.warn("[notify] WEB_PUSH_PUBLIC_KEY/WEB_PUSH_PRIVATE_KEY not set — skipping push");
    return { ok: true, skipped: true };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({ title: input.title, body: input.body })
    );
    return { ok: true };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    // 404/410 mean the browser subscription no longer exists — the caller
    // should delete the row instead of retrying it.
    if (statusCode === 404 || statusCode === 410) return { ok: false, gone: true };
    console.error("[notify] push send failed", err);
    return { ok: false };
  }
}

export async function sendWhatsAppAlert(input: {
  to: string;
  body: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.warn("[notify] WHATSAPP_CLOUD_API_TOKEN/WHATSAPP_CLOUD_PHONE_NUMBER_ID not set — skipping WhatsApp");
    return { ok: true, skipped: true };
  }

  // Plain text only works inside WhatsApp's 24h customer-service window; a
  // production deployment sending unprompted alerts needs an approved
  // message template instead. Documented limit — see docs/architecture.md.
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "text",
      text: { body: input.body },
    }),
  });

  if (!response.ok) {
    console.error("[notify] WhatsApp send failed", await response.text());
    return { ok: false };
  }
  return { ok: true };
}
