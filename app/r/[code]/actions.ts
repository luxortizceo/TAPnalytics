"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeedbackSessionByToken, getSurveyCard } from "@/lib/data/survey";
import { createCaseFromFeedback, generateCaseAiSuggestion } from "@/lib/cases";
import { createAlertAndNotify } from "@/lib/alerts";
import type { ExperienceRating, UrgencyLevel } from "@/lib/supabase/types";

export async function resolveSession(code: string) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(`tap_session_${code}`)?.value;
  if (!sessionToken) return null;

  const card = await getSurveyCard(code);
  if (!card) return null;

  const session = await getFeedbackSessionByToken(sessionToken, card.cardId);
  if (!session) return null;

  return { session, card };
}

export async function setRating(code: string, rating: ExperienceRating): Promise<boolean> {
  const resolved = await resolveSession(code);
  if (!resolved) return false;

  const admin = createAdminClient();
  await admin
    .from("feedback_sessions")
    .update({ rating })
    .eq("id", resolved.session.id);

  if (resolved.session.tap_event_id) {
    await admin.from("tap_events").update({ rating }).eq("id", resolved.session.tap_event_id);
  }

  return true;
}

export async function markReviewOpened(code: string) {
  const resolved = await resolveSession(code);
  if (!resolved?.session.tap_event_id) return;

  const admin = createAdminClient();
  await admin
    .from("tap_events")
    .update({ google_reviews_opened: true })
    .eq("id", resolved.session.tap_event_id);
}

const feedbackSchema = z.object({
  answerText: z.string().trim().max(2000).optional().or(z.literal("")),
  categories: z.array(z.string()).max(20).default([]),
  urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
  contactName: z.string().trim().max(120).optional().or(z.literal("")),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  consentContact: z.boolean().default(false),
});

export type FeedbackFormState = {
  error?: string;
  success?: boolean;
};

export async function submitFeedback(
  code: string,
  formData: FormData
): Promise<FeedbackFormState> {
  const resolved = await resolveSession(code);
  if (!resolved) return { error: "Tu sesión expiró. Vuelve a intentarlo." };

  const contactRequested = formData.get("wantsContact") === "on";

  const parsed = feedbackSchema.safeParse({
    answerText: formData.get("answerText") ?? "",
    categories: formData.getAll("categories").map(String),
    urgency: formData.get("urgency") || undefined,
    contactName: formData.get("contactName") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
    consentContact: formData.get("consentContact") === "on",
  });
  if (!parsed.success) return { error: "Revisa la información e intenta de nuevo." };

  // Contact info is only ever stored if the customer opted in AND
  // explicitly consented — never inferred from filling in a field alone.
  const canStoreContact = contactRequested && parsed.data.consentContact;

  const admin = createAdminClient();

  const questionKey = resolved.session.rating === "bad" ? "what_happened" : "what_went_well";

  const { data: response, error } = await admin
    .from("feedback_responses")
    .insert({
      feedback_session_id: resolved.session.id,
      question_key: questionKey,
      answer_text: parsed.data.answerText || null,
      urgency_level: (parsed.data.urgency as UrgencyLevel | undefined) ?? null,
      contact_requested: contactRequested,
      contact_name: canStoreContact ? parsed.data.contactName || null : null,
      contact_email: canStoreContact ? parsed.data.contactEmail || null : null,
      contact_phone: canStoreContact ? parsed.data.contactPhone || null : null,
      consent_contact: parsed.data.consentContact,
    })
    .select("id")
    .single();

  if (error || !response) return { error: "No pudimos guardar tu respuesta. Intenta de nuevo." };

  if (parsed.data.categories.length > 0) {
    await admin.from("response_categories").insert(
      parsed.data.categories.map((categoryId) => ({
        feedback_response_id: response.id,
        category_id: categoryId,
      }))
    );
  }

  if (contactRequested) {
    await admin.from("consent_records").insert({
      subject_type: "feedback_session",
      subject_id: resolved.session.id,
      consent_type: "contact_me",
      granted: parsed.data.consentContact,
      text_shown:
        "Acepto que TAPnalytics comparta mis datos de contacto con el establecimiento para dar seguimiento a mi comentario.",
    });
  }

  await admin
    .from("feedback_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", resolved.session.id);

  if (resolved.session.tap_event_id) {
    await admin
      .from("tap_events")
      .update({ survey_completed: true })
      .eq("id", resolved.session.tap_event_id);
  }

  // A bad experience becomes an actionable case immediately, with an alert
  // fanned out to the org's owner/admin — this is what "detecta problemas
  // antes de que se conviertan en malas reseñas" means in practice.
  if (resolved.session.rating === "bad") {
    const urgency = (parsed.data.urgency as UrgencyLevel | undefined) ?? "medium";
    const createdCase = await createCaseFromFeedback(admin, {
      organizationId: resolved.card.organizationId,
      locationId: resolved.card.locationId,
      feedbackSessionId: resolved.session.id,
      rating: "bad",
      summary: parsed.data.answerText || null,
      urgency,
      contactName: canStoreContact ? parsed.data.contactName || null : null,
      contactEmail: canStoreContact ? parsed.data.contactEmail || null : null,
      contactPhone: canStoreContact ? parsed.data.contactPhone || null : null,
    });

    // No bloquea la respuesta al cliente: la sugerencia de IA se genera
    // después de enviar la página de "gracias" (ver next/server `after`).
    if (createdCase) {
      after(() => generateCaseAiSuggestion(admin, createdCase.id));
    }

    await createAlertAndNotify(admin, {
      organizationId: resolved.card.organizationId,
      locationId: resolved.card.locationId,
      type: "new_bad_experience",
      severity: urgency === "critical" || urgency === "high" ? "critical" : "warning",
      title: `Nueva experiencia mala en ${resolved.card.locationName}`,
      message: createdCase
        ? `Caso ${createdCase.folio} creado. ${parsed.data.answerText || "Sin comentario adicional."}`
        : parsed.data.answerText || "Un cliente calificó su experiencia como mala.",
      relatedCaseId: createdCase?.id ?? null,
      relatedTapEventId: resolved.session.tap_event_id,
    });

    if (urgency === "high" || urgency === "critical") {
      await createAlertAndNotify(admin, {
        organizationId: resolved.card.organizationId,
        locationId: resolved.card.locationId,
        type: "urgent_comment",
        severity: "critical",
        title: `Comentario urgente en ${resolved.card.locationName}`,
        message: parsed.data.answerText || "Un cliente reportó un problema urgente.",
        relatedCaseId: createdCase?.id ?? null,
        relatedTapEventId: resolved.session.tap_event_id,
      });
    }
  }

  return { success: true };
}
