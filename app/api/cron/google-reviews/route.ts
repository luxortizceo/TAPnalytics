import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function isAuthorized(request: Request, secret: string) {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type PlaceDetailsResponse = {
  status: string;
  result?: { user_ratings_total?: number; rating?: number };
};

/**
 * Google never tells us when a specific tap turns into a submitted review —
 * there's no webhook or tracking parameter for that. The closest real
 * signal is the location's public total review count on Google, polled
 * here and stored as a time series (google_review_snapshots) so the
 * dashboard can show an honest delta over time instead of false per-tap
 * attribution. Meant to be called daily by Vercel Cron (see vercel.json).
 */
async function handleCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isAuthorized(request, secret)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GOOGLE_PLACES_API_KEY no está configurada." }, { status: 500 });
  }

  const admin = createAdminClient();

  const { data: locations, error } = await admin
    .from("locations")
    .select("id, organization_id, google_place_id")
    .not("google_place_id", "is", null)
    .is("deleted_at", null);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let captured = 0;
  let failed = 0;

  for (const location of locations ?? []) {
    if (!location.google_place_id) continue;

    try {
      const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      url.searchParams.set("place_id", location.google_place_id);
      url.searchParams.set("fields", "user_ratings_total,rating");
      url.searchParams.set("key", apiKey);

      const response = await fetch(url, { cache: "no-store" });
      const body = (await response.json()) as PlaceDetailsResponse;

      if (body.status !== "OK" || typeof body.result?.user_ratings_total !== "number") {
        failed++;
        continue;
      }

      await admin.from("google_review_snapshots").insert({
        organization_id: location.organization_id,
        location_id: location.id,
        review_count: body.result.user_ratings_total,
        rating: body.result.rating ?? null,
      });
      captured++;
    } catch {
      failed++;
    }
  }

  return Response.json({ captured, failed });
}

export const GET = handleCronRequest;
export const POST = handleCronRequest;
