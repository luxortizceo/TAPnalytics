import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes text interpolated into an email's HTML body. Every email this
 * project sends can carry untrusted free text — an anonymous NFC survey
 * comment, a public demo-request form — so any caller building HTML from
 * user input MUST run it through this first, or a crafted comment becomes
 * HTML injection in the recipient's inbox.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!resend || !process.env.RESEND_FROM_EMAIL) {
    // Not configured yet — log instead of failing the request. See
    // .env.example / docs/architecture.md for how to enable Resend.
    console.warn("[email] RESEND_API_KEY/RESEND_FROM_EMAIL not set — skipping send", {
      to: input.to,
      subject: input.subject,
    });
    return { ok: true, skipped: true };
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  return { ok: !error };
}
