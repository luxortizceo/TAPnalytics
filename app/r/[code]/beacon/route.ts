import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickRandomPositiveComment } from "@/lib/positive-comments";
import { resolveSession } from "../actions";

// Handles the "excellent" rating's side effects: setRating, completeSession
// and markReviewOpened used to be fired as unawaited Server Action calls
// right before the client navigated to the Google review link — but the
// browser can (and, tested live, reliably does) cancel whatever's still in
// flight once that navigation starts. navigator.sendBeacon is the browser
// API built for exactly this — "send this, then leave the page" — and,
// unlike fetch, it's guaranteed delivery even mid-unload. See survey-flow.tsx.
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const resolved = await resolveSession(code);
  if (!resolved) return NextResponse.json({ ok: false }, { status: 404 });

  const admin = createAdminClient();
  const now = new Date().toISOString();

  await Promise.all([
    admin
      .from("feedback_sessions")
      .update({ rating: "excellent", status: "completed", completed_at: now })
      .eq("id", resolved.session.id),
    resolved.session.tap_event_id
      ? admin
          .from("tap_events")
          .update({ rating: "excellent", survey_completed: true, google_reviews_opened: true })
          .eq("id", resolved.session.tap_event_id)
      : Promise.resolve(),
    admin.from("feedback_responses").insert({
      feedback_session_id: resolved.session.id,
      question_key: "auto_positive",
      answer_text: pickRandomPositiveComment(resolved.card.sector),
      urgency_level: null,
      contact_requested: false,
      consent_contact: false,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
