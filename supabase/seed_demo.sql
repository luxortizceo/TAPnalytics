-- TAPnalytics — optional DEMO data (Fase 5)
--
-- Creates one clearly-labeled demo organization with two branches, four NFC
-- cards, and ~30 days of synthetic tap/survey history, so a fresh instance
-- has something to look at in the dashboard, casos, alertas and TAP
-- Intelligence right away. Nothing here is presented as real anywhere in
-- the app: the organization name says "(Demo)" and this file is never run
-- automatically (unlike supabase/seed.sql, which is safe in any
-- environment) — you run it on purpose, once, against a project you're
-- fine seeding with fake data.
--
-- Requires an existing Supabase Auth user to own the demo organization —
-- sign up normally through /registro (any email works), then find that
-- user's id (Supabase Dashboard → Authentication → Users, or
-- `select id from auth.users where email = '...'`), and run:
--
--   psql "<connection string>" \
--     -v demo_owner_user_id="<paste-the-uuid-here, no quotes>" \
--     -f supabase/seed_demo.sql
--
-- Safe to re-run: it always creates a NEW demo organization (a fresh
-- slug/timestamp each time) rather than upserting, so re-running just adds
-- another one instead of erroring — delete the ones you don't want from
-- the superadmin panel (/admin) or with a plain `delete from
-- organizations where slug = '...'`.

\if :{?demo_owner_user_id}
\else
  \echo 'Missing -v demo_owner_user_id="''<uuid>''" — see the header of this file.'
  \quit
\endif

-- psql doesn't substitute :variables inside a dollar-quoted DO block body,
-- so hand the value in via a session-local GUC instead of interpolating it
-- directly into the PL/pgSQL text.
select set_config('tapnalytics.demo_owner_user_id', :'demo_owner_user_id', false);

do $$
declare
  demo_owner_user_id uuid := current_setting('tapnalytics.demo_owner_user_id')::uuid;
  org_id uuid := gen_random_uuid();
  loc_centro_id uuid := gen_random_uuid();
  loc_norte_id uuid := gen_random_uuid();
  card1_id uuid := gen_random_uuid();
  card2_id uuid := gen_random_uuid();
  card3_id uuid := gen_random_uuid();
  card4_id uuid := gen_random_uuid();
  starter_plan_id uuid;
  slug_suffix text := substr(md5(random()::text), 1, 6);

  cat_poor_service uuid;
  cat_slow_service uuid;
  cat_cleanliness_neg uuid;
  cat_friendliness uuid;
  cat_quality uuid;
  cat_other_negative uuid;

  location_ids uuid[];
  card_ids uuid[];
  comments_bad text[] := array[
    'La atención tardó demasiado y el pedido llegó frío.',
    'El lugar estaba sucio, sobre todo los baños.',
    'El mesero fue grosero cuando pregunté por mi cuenta.',
    'Cobraron mal la cuenta y tardaron en corregirlo.'
  ];
  comments_good text[] := array[
    'Todo bien, sin problemas.',
    'Buen servicio, aunque tardó un poco.',
    'Rico, volveré pronto.'
  ];
  comments_excellent text[] := array[
    'Excelente atención, el mejor café de la zona.',
    'Personal muy amable, ambiente muy agradable.',
    'Rapidísimo y delicioso, felicidades al equipo.',
    'Como siempre, una gran experiencia.'
  ];

  day_offset int;
  taps_today int;
  i int;
  occurred timestamptz;
  roll numeric;
  chosen_rating experience_rating;
  chosen_card uuid;
  chosen_location uuid;
  new_tap_id uuid;
  new_session_id uuid;
  new_response_id uuid;
  chosen_comment text;
  bad_case_count int := 0;
begin
  select id into starter_plan_id from public.plans where code = 'starter' limit 1;

  select id into cat_poor_service from public.feedback_categories where code = 'poor_service' and organization_id is null limit 1;
  select id into cat_slow_service from public.feedback_categories where code = 'slow_service' and organization_id is null limit 1;
  select id into cat_cleanliness_neg from public.feedback_categories where code = 'cleanliness' and kind = 'negative' and organization_id is null limit 1;
  select id into cat_other_negative from public.feedback_categories where code = 'other' and organization_id is null and kind = 'negative' limit 1;
  select id into cat_friendliness from public.feedback_categories where code = 'friendliness' and organization_id is null limit 1;
  select id into cat_quality from public.feedback_categories where code = 'quality' and organization_id is null limit 1;

  -- Organization — the trg_organizations_bootstrap_owner trigger (see
  -- 0004_rls_policies.sql) auto-creates the owner's organization_members
  -- row from created_by, same as the real onboarding flow.
  insert into public.organizations (id, name, slug, sector, status, plan_id, created_by, onboarding_step, onboarding_completed_at)
  values (org_id, 'Café Aurora (Demo)', 'cafe-aurora-demo-' || slug_suffix, 'cafe', 'active', starter_plan_id, demo_owner_user_id, 'done', now());

  -- Locations -----------------------------------------------------------------
  insert into public.locations (id, organization_id, name, status, city, state, country)
  values
    (loc_centro_id, org_id, 'Sucursal Centro', 'active', 'Ciudad de México', 'CDMX', 'MX'),
    (loc_norte_id, org_id, 'Sucursal Norte', 'active', 'Ciudad de México', 'CDMX', 'MX');
  location_ids := array[loc_centro_id, loc_norte_id];

  -- NFC cards -------------------------------------------------------------
  insert into public.nfc_cards (id, organization_id, location_id, public_code, alias, contact_point_type, status, activated_at, created_by)
  values
    (card1_id, org_id, loc_centro_id, upper(substr(md5(random()::text), 1, 10)), 'Mesa 1 — Centro', 'table', 'active', now() - interval '30 days', demo_owner_user_id),
    (card2_id, org_id, loc_centro_id, upper(substr(md5(random()::text), 1, 10)), 'Caja — Centro', 'checkout', 'active', now() - interval '30 days', demo_owner_user_id),
    (card3_id, org_id, loc_norte_id, upper(substr(md5(random()::text), 1, 10)), 'Mesa 1 — Norte', 'table', 'active', now() - interval '30 days', demo_owner_user_id),
    (card4_id, org_id, loc_norte_id, upper(substr(md5(random()::text), 1, 10)), 'Recepción — Norte', 'reception', 'active', now() - interval '30 days', demo_owner_user_id);
  card_ids := array[card1_id, card2_id, card3_id, card4_id];

  -- 30 days of synthetic taps/surveys ----------------------------------------
  -- Weighted roughly 55% excellent / 30% good / 15% bad — a healthy-looking
  -- demo, not a perfect one, so the dashboard/TAP Intelligence/casos pages
  -- all have something real to show instead of empty states everywhere.
  for day_offset in 0..29 loop
    taps_today := 2 + floor(random() * 6)::int; -- 2-7 taps/day
    for i in 1..taps_today loop
      occurred := now() - (day_offset || ' days')::interval - (floor(random() * 12) || ' hours')::interval;
      chosen_card := card_ids[1 + floor(random() * array_length(card_ids, 1))::int];
      chosen_location := case when chosen_card in (card1_id, card2_id) then loc_centro_id else loc_norte_id end;

      roll := random();
      if roll < 0.15 then
        chosen_rating := 'bad';
        chosen_comment := comments_bad[1 + floor(random() * array_length(comments_bad, 1))::int];
      elsif roll < 0.45 then
        chosen_rating := 'good';
        chosen_comment := comments_good[1 + floor(random() * array_length(comments_good, 1))::int];
      else
        chosen_rating := 'excellent';
        chosen_comment := comments_excellent[1 + floor(random() * array_length(comments_excellent, 1))::int];
      end if;

      insert into public.tap_events (
        id, card_id, organization_id, location_id, occurred_at, source, device_type, os, browser,
        survey_started, survey_completed, rating, google_reviews_opened
      ) values (
        gen_random_uuid(), chosen_card, org_id, chosen_location, occurred, 'nfc', 'mobile', 'iOS', 'Safari',
        true, true, chosen_rating, chosen_rating = 'excellent' and random() < 0.4
      ) returning id into new_tap_id;

      insert into public.feedback_sessions (
        id, tap_event_id, card_id, organization_id, location_id, session_token, status, rating, started_at, completed_at
      ) values (
        gen_random_uuid(), new_tap_id, chosen_card, org_id, chosen_location,
        'demo-' || gen_random_uuid()::text, 'completed', chosen_rating, occurred, occurred + interval '90 seconds'
      ) returning id into new_session_id;

      insert into public.feedback_responses (id, feedback_session_id, question_key, answer_text, urgency_level)
      values (
        gen_random_uuid(), new_session_id, 'what_happened', chosen_comment,
        case when chosen_rating = 'bad' then (array['low','medium','high'])[1 + floor(random() * 3)::int]::urgency_level else null end
      ) returning id into new_response_id;

      if chosen_rating = 'bad' then
        insert into public.response_categories (feedback_response_id, category_id)
        values (new_response_id, coalesce(
          (array[cat_poor_service, cat_slow_service, cat_cleanliness_neg, cat_other_negative])[1 + floor(random() * 4)::int],
          cat_other_negative
        ))
        on conflict do nothing;

        -- Mirror what the app itself does when a real "bad" survey comes in
        -- (see lib/cases.ts) — a handful of open cases for /app/casos.
        if bad_case_count < 6 then
          insert into public.cases (organization_id, location_id, feedback_session_id, rating, summary, urgency, status, created_at)
          values (
            org_id, chosen_location, new_session_id, 'bad', chosen_comment,
            'medium', (case when random() < 0.5 then 'new' else 'resolved' end)::case_status, occurred
          );
          bad_case_count := bad_case_count + 1;
        end if;
      elsif chosen_rating = 'excellent' and cat_friendliness is not null then
        insert into public.response_categories (feedback_response_id, category_id)
        values (new_response_id, (array[cat_friendliness, cat_quality])[1 + floor(random() * 2)::int])
        on conflict do nothing;
      end if;

      -- nfc_cards.total_taps/last_tap_at update themselves via the
      -- handle_new_tap_event trigger on this insert (0005_business_logic.sql)
      -- — no need to touch them here too.
    end loop;
  end loop;

  raise notice 'Demo organization created: % (id=%)', 'Café Aurora (Demo)', org_id;
end $$;
