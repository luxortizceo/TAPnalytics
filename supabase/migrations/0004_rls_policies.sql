-- TAPnalytics — 0004: Row Level Security policies
--
-- Design:
--  * Every business table is scoped by organization_id (directly or via a
--    join) and RLS is the enforcement boundary — never the frontend.
--  * Public/anonymous write paths (NFC tap, survey) have NO client-side
--    insert policy at all: they are written exclusively by trusted
--    server-side code using the Supabase service role key, which bypasses
--    RLS. This keeps tap_events/feedback_* fully closed to direct client
--    writes while still readable by authenticated org members.
--  * "Ver información sensible" (contact data on cases) is coarse-grained
--    at the row level for Phase 1: owner/admin/manager/analyst can read
--    full case rows. A column-masking view for employee/viewer is a
--    documented follow-up (see docs/architecture.md).

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_superadmin" on public.profiles
  for select using (id = auth.uid() or public.is_superadmin());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- plans — publicly readable (active plans), superadmin-managed
-- ---------------------------------------------------------------------------
alter table public.plans enable row level security;

create policy "plans_select_active_or_superadmin" on public.plans
  for select using (is_active or public.is_superadmin());

create policy "plans_write_superadmin" on public.plans
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

-- created_by = auth.uid() is included so the creator can see the row
-- immediately (e.g. via INSERT ... RETURNING) before the AFTER INSERT
-- trigger below has finished bootstrapping their owner membership.
create policy "organizations_select_member" on public.organizations
  for select using (public.is_org_member(id) or created_by = auth.uid());

create policy "organizations_insert_self" on public.organizations
  for insert with check (created_by = auth.uid());

create policy "organizations_update_admin" on public.organizations
  for update using (public.has_org_role(id, array['owner','admin']::org_role[]))
  with check (public.has_org_role(id, array['owner','admin']::org_role[]));

-- Bootstrap: whoever creates an organization automatically becomes its owner.
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role, status, joined_at)
  values (new.id, new.created_by, 'owner', 'active', now())
  on conflict (organization_id, user_id) do nothing;
  return new;
end;
$$;

create trigger trg_organizations_bootstrap_owner
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
alter table public.organization_members enable row level security;

create policy "org_members_select" on public.organization_members
  for select using (public.is_org_member(organization_id));

create policy "org_members_insert_admin" on public.organization_members
  for insert with check (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

create policy "org_members_update_admin" on public.organization_members
  for update using (public.has_org_role(organization_id, array['owner','admin']::org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

create policy "org_members_delete_admin" on public.organization_members
  for delete using (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

-- ---------------------------------------------------------------------------
-- member_locations
-- ---------------------------------------------------------------------------
alter table public.member_locations enable row level security;

create policy "member_locations_select" on public.member_locations
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.id = organization_member_id and public.is_org_member(m.organization_id)
    )
  );

create policy "member_locations_write_admin" on public.member_locations
  for all using (
    exists (
      select 1 from public.organization_members m
      where m.id = organization_member_id
        and public.has_org_role(m.organization_id, array['owner','admin']::org_role[])
    )
  ) with check (
    exists (
      select 1 from public.organization_members m
      where m.id = organization_member_id
        and public.has_org_role(m.organization_id, array['owner','admin']::org_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------------
alter table public.brands enable row level security;

create policy "brands_select" on public.brands
  for select using (public.is_org_member(organization_id));

create policy "brands_write_admin" on public.brands
  for all using (public.has_org_role(organization_id, array['owner','admin']::org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

-- ---------------------------------------------------------------------------
-- locations
-- ---------------------------------------------------------------------------
alter table public.locations enable row level security;

create policy "locations_select" on public.locations
  for select using (public.is_org_member(organization_id) and public.can_access_location(organization_id, id));

create policy "locations_insert_admin" on public.locations
  for insert with check (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

create policy "locations_update_manager" on public.locations
  for update using (public.has_org_role(organization_id, array['owner','admin','manager']::org_role[]) and public.can_access_location(organization_id, id))
  with check (public.has_org_role(organization_id, array['owner','admin','manager']::org_role[]));

create policy "locations_delete_admin" on public.locations
  for delete using (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

-- ---------------------------------------------------------------------------
-- nfc_cards / nfc_card_history
-- ---------------------------------------------------------------------------
alter table public.nfc_cards enable row level security;

create policy "nfc_cards_select" on public.nfc_cards
  for select using (public.is_org_member(organization_id) and public.can_access_location(organization_id, location_id));

create policy "nfc_cards_insert_manager" on public.nfc_cards
  for insert with check (public.has_org_role(organization_id, array['owner','admin','manager']::org_role[]));

create policy "nfc_cards_update_manager" on public.nfc_cards
  for update using (public.has_org_role(organization_id, array['owner','admin','manager']::org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','manager']::org_role[]));

create policy "nfc_cards_delete_admin" on public.nfc_cards
  for delete using (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

alter table public.nfc_card_history enable row level security;

create policy "nfc_card_history_select" on public.nfc_card_history
  for select using (
    exists (select 1 from public.nfc_cards c where c.id = card_id and public.is_org_member(c.organization_id))
  );

create policy "nfc_card_history_insert" on public.nfc_card_history
  for insert with check (
    exists (
      select 1 from public.nfc_cards c
      where c.id = card_id and public.has_org_role(c.organization_id, array['owner','admin','manager']::org_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- tap_events / feedback_sessions / feedback_responses / response_categories
-- Read-only for org members. All writes happen server-side (service role)
-- from the public NFC/survey flow.
-- ---------------------------------------------------------------------------
alter table public.tap_events enable row level security;

create policy "tap_events_select" on public.tap_events
  for select using (public.is_org_member(organization_id) and public.can_access_location(organization_id, location_id));

alter table public.feedback_sessions enable row level security;

create policy "feedback_sessions_select" on public.feedback_sessions
  for select using (public.is_org_member(organization_id) and public.can_access_location(organization_id, location_id));

alter table public.feedback_responses enable row level security;

create policy "feedback_responses_select" on public.feedback_responses
  for select using (
    exists (
      select 1 from public.feedback_sessions s
      where s.id = feedback_session_id
        and public.is_org_member(s.organization_id)
        and public.can_access_location(s.organization_id, s.location_id)
    )
  );

alter table public.response_categories enable row level security;

create policy "response_categories_select" on public.response_categories
  for select using (
    exists (
      select 1 from public.feedback_responses r
      join public.feedback_sessions s on s.id = r.feedback_session_id
      where r.id = feedback_response_id and public.is_org_member(s.organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- feedback_categories
-- ---------------------------------------------------------------------------
alter table public.feedback_categories enable row level security;

create policy "feedback_categories_select" on public.feedback_categories
  for select using (organization_id is null or public.is_org_member(organization_id));

create policy "feedback_categories_write_admin" on public.feedback_categories
  for all using (organization_id is not null and public.has_org_role(organization_id, array['owner','admin']::org_role[]))
  with check (organization_id is not null and public.has_org_role(organization_id, array['owner','admin']::org_role[]));

-- ---------------------------------------------------------------------------
-- cases / case_notes / case_history
-- ---------------------------------------------------------------------------
alter table public.cases enable row level security;

create policy "cases_select" on public.cases
  for select using (public.is_org_member(organization_id) and public.can_access_location(organization_id, location_id));

create policy "cases_insert_staff" on public.cases
  for insert with check (public.has_org_role(organization_id, array['owner','admin','manager','analyst']::org_role[]));

create policy "cases_update_staff" on public.cases
  for update using (public.has_org_role(organization_id, array['owner','admin','manager','analyst']::org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','analyst']::org_role[]));

create policy "cases_delete_admin" on public.cases
  for delete using (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

alter table public.case_notes enable row level security;

create policy "case_notes_select" on public.case_notes
  for select using (
    exists (select 1 from public.cases c where c.id = case_id and public.is_org_member(c.organization_id))
  );

create policy "case_notes_insert_staff" on public.case_notes
  for insert with check (
    exists (
      select 1 from public.cases c
      where c.id = case_id and public.has_org_role(c.organization_id, array['owner','admin','manager','analyst']::org_role[])
    )
  );

alter table public.case_history enable row level security;

create policy "case_history_select" on public.case_history
  for select using (
    exists (select 1 from public.cases c where c.id = case_id and public.is_org_member(c.organization_id))
  );

create policy "case_history_insert_staff" on public.case_history
  for insert with check (
    exists (
      select 1 from public.cases c
      where c.id = case_id and public.has_org_role(c.organization_id, array['owner','admin','manager','analyst']::org_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- alert_rules / alerts
-- ---------------------------------------------------------------------------
alter table public.alert_rules enable row level security;

create policy "alert_rules_select" on public.alert_rules
  for select using (public.is_org_member(organization_id));

create policy "alert_rules_write_admin" on public.alert_rules
  for all using (public.has_org_role(organization_id, array['owner','admin']::org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

alter table public.alerts enable row level security;

create policy "alerts_select" on public.alerts
  for select using (public.is_org_member(organization_id));

create policy "alerts_update_staff" on public.alerts
  for update using (public.has_org_role(organization_id, array['owner','admin','manager','analyst']::org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','analyst']::org_role[]));

-- ---------------------------------------------------------------------------
-- notifications / notification_preferences
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_all_own" on public.notification_preferences
  for all using (user_id = auth.uid() and public.is_org_member(organization_id))
  with check (user_id = auth.uid() and public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- reports / report_schedules
-- ---------------------------------------------------------------------------
alter table public.reports enable row level security;

create policy "reports_select" on public.reports
  for select using (public.is_org_member(organization_id));

create policy "reports_write_staff" on public.reports
  for all using (public.has_org_role(organization_id, array['owner','admin','analyst']::org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']::org_role[]));

alter table public.report_schedules enable row level security;

create policy "report_schedules_select" on public.report_schedules
  for select using (public.is_org_member(organization_id));

create policy "report_schedules_write_staff" on public.report_schedules
  for all using (public.has_org_role(organization_id, array['owner','admin','analyst']::org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']::org_role[]));

-- ---------------------------------------------------------------------------
-- ai_insights / recommendations / corrective_actions
-- ---------------------------------------------------------------------------
alter table public.ai_insights enable row level security;

create policy "ai_insights_select" on public.ai_insights
  for select using (public.is_org_member(organization_id));

alter table public.recommendations enable row level security;

create policy "recommendations_select" on public.recommendations
  for select using (public.is_org_member(organization_id));

create policy "recommendations_update_staff" on public.recommendations
  for update using (public.has_org_role(organization_id, array['owner','admin','manager','analyst']::org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','analyst']::org_role[]));

alter table public.corrective_actions enable row level security;

create policy "corrective_actions_select" on public.corrective_actions
  for select using (public.is_org_member(organization_id));

create policy "corrective_actions_write_staff" on public.corrective_actions
  for all using (public.has_org_role(organization_id, array['owner','admin','manager','analyst']::org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','analyst']::org_role[]));

-- ---------------------------------------------------------------------------
-- subscriptions / invoices — billing, owner/admin only, no client writes
-- (managed exclusively via Stripe webhooks using the service role)
-- ---------------------------------------------------------------------------
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_billing" on public.subscriptions
  for select using (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

alter table public.invoices enable row level security;

create policy "invoices_select_billing" on public.invoices
  for select using (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

-- ---------------------------------------------------------------------------
-- integrations
-- ---------------------------------------------------------------------------
alter table public.integrations enable row level security;

create policy "integrations_select_admin" on public.integrations
  for select using (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

create policy "integrations_write_admin" on public.integrations
  for all using (public.has_org_role(organization_id, array['owner','admin']::org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

-- ---------------------------------------------------------------------------
-- audit_logs — readable by org admins, written only by server-side code
-- ---------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

create policy "audit_logs_select_admin" on public.audit_logs
  for select using (
    organization_id is not null and public.has_org_role(organization_id, array['owner','admin']::org_role[])
  );

-- ---------------------------------------------------------------------------
-- consent_records — no client policies at all: written and read only by
-- trusted server-side code (service role), since consent is tied to
-- anonymous feedback sessions with no authenticated user.
-- ---------------------------------------------------------------------------
alter table public.consent_records enable row level security;
