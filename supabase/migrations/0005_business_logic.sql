-- TAPnalytics — 0005: business-logic triggers

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Keep nfc_cards.total_taps / last_tap_at in sync with tap_events.
create or replace function public.handle_new_tap_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.nfc_cards
  set total_taps = total_taps + 1,
      last_tap_at = new.occurred_at
  where id = new.card_id;
  return new;
end;
$$;

create trigger trg_tap_events_increment_card
  after insert on public.tap_events
  for each row execute function public.handle_new_tap_event();
