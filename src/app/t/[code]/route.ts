import { NextResponse, type NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseUserAgent, isLikelyBot, hashIp, getClientIp, getApproxGeo } from "@/lib/tracking";

// Public NFC/QR entry point: https://<site>/t/<public_code>
//
// Validates the card, records a tap_event and starts an anonymous
// feedback_session, then redirects to the survey landing (/r/<code>).
// Writes go through the service role client because there is no
// authenticated user here — RLS intentionally has no client-writable
// policy for these tables (see supabase/migrations/0004_rls_policies.sql).
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const siteUrl = request.nextUrl.origin;

  if (!code || code.length > 32) {
    return NextResponse.redirect(new URL("/t/no-disponible", siteUrl));
  }

  const admin = createAdminClient();

  const { data: card } = await admin
    .from("nfc_cards")
    .select("id, organization_id, location_id, status")
    .eq("public_code", code.toUpperCase())
    .is("deleted_at", null)
    .maybeSingle();

  if (!card || card.status === "deactivated" || card.status === "lost") {
    return NextResponse.redirect(new URL("/t/no-disponible", siteUrl));
  }

  const userAgent = request.headers.get("user-agent");

  // Bots/crawlers: don't pollute analytics or spend a feedback session on
  // them. Send them somewhere real but record nothing.
  if (isLikelyBot(userAgent)) {
    return NextResponse.redirect(new URL("/", siteUrl));
  }

  const ip = getClientIp(request);
  const ipHash = ip === "unknown" ? null : hashIp(ip);
  const { device_type, os, browser } = parseUserAgent(userAgent);
  const geo = getApproxGeo(request);
  const nowIso = new Date().toISOString();

  // Basic abuse guard: too many taps from the same hashed IP in a short
  // window, regardless of card. Not a CAPTCHA — just enough to blunt a
  // scripted hammer without blocking a real customer tapping twice.
  if (ipHash) {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count } = await admin
      .from("tap_events")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("occurred_at", oneMinuteAgo);
    if ((count ?? 0) >= 20) {
      return new NextResponse("Demasiadas solicitudes. Intenta de nuevo en un momento.", {
        status: 429,
      });
    }
  }

  // Duplicate heuristic: same card + same hashed IP within 20 seconds is
  // almost certainly a double-tap, not two different customers.
  let isPossibleDuplicate = false;
  if (ipHash) {
    const twentySecondsAgo = new Date(Date.now() - 20_000).toISOString();
    const { count } = await admin
      .from("tap_events")
      .select("id", { count: "exact", head: true })
      .eq("card_id", card.id)
      .eq("ip_hash", ipHash)
      .gte("occurred_at", twentySecondsAgo);
    isPossibleDuplicate = (count ?? 0) > 0;
  }

  const { data: tapEvent } = await admin
    .from("tap_events")
    .insert({
      card_id: card.id,
      organization_id: card.organization_id,
      location_id: card.location_id,
      occurred_at: nowIso,
      timezone: request.headers.get("x-vercel-ip-timezone"),
      source: request.nextUrl.searchParams.get("src") === "qr" ? "qr" : "nfc",
      device_type,
      os,
      browser,
      language: request.headers.get("accept-language")?.split(",")[0] ?? null,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      referrer: request.headers.get("referer"),
      ip_hash: ipHash,
      is_possible_duplicate: isPossibleDuplicate,
      survey_started: true,
    })
    .select("id")
    .single();

  // A card that hasn't been configured yet still gets its tap recorded
  // (useful signal for the admin), but customers see a neutral "not ready"
  // page instead of a half-built survey.
  if (card.status === "unconfigured") {
    return NextResponse.redirect(new URL("/t/no-disponible", siteUrl));
  }

  const sessionToken = nanoid(24);
  await admin.from("feedback_sessions").insert({
    tap_event_id: tapEvent?.id ?? null,
    card_id: card.id,
    organization_id: card.organization_id,
    location_id: card.location_id,
    session_token: sessionToken,
    status: "started",
    started_at: nowIso,
  });

  const response = NextResponse.redirect(new URL(`/r/${code}`, siteUrl));
  response.cookies.set(`tap_session_${code}`, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 30, // 30 minutes — long enough to finish a short survey
    path: `/r/${code}`,
  });
  return response;
}
