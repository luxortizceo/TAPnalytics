-- ---------------------------------------------------------------------------
-- Real Google review count tracking (approximate, not per-tap attribution)
--
-- Google gives no webhook or tracking parameter when someone actually
-- completes a review after opening the "write a review" link — the closest
-- real signal available is the location's public total review count on
-- Google, polled periodically via the Places API and stored as a time
-- series. This lets the dashboard show a real delta ("+7 reseñas este mes")
-- without claiming false per-tap attribution.
-- ---------------------------------------------------------------------------

alter table public.locations
  add column google_place_id text;

create table public.google_review_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  review_count integer not null,
  rating numeric(2, 1),
  captured_at timestamptz not null default now()
);

create index idx_google_review_snapshots_location on public.google_review_snapshots(location_id, captured_at desc);

-- Read-only for org members, same pattern as tap_events: all writes happen
-- server-side (service role) from the cron job, never from the client.
alter table public.google_review_snapshots enable row level security;

create policy "google_review_snapshots_select" on public.google_review_snapshots
  for select using (
    public.is_org_member(organization_id) and public.can_access_location(organization_id, location_id)
  );
