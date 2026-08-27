-- TAPnalytics — 0006: Fase 4 additions
-- The bulk of Fase 4's schema (ai_insights, recommendations, corrective_actions,
-- subscriptions, invoices, integrations, reports, report_schedules,
-- notification_preferences, audit_logs) was already created in 0002/0004 —
-- this migration only adds what was genuinely missing.

-- ---------------------------------------------------------------------------
-- plans — map a plan to real Stripe Price IDs (still no hardcoded amounts;
-- the price itself stays in Stripe/`price_monthly`/`price_yearly`, this only
-- stores which Stripe object to check out against).
-- ---------------------------------------------------------------------------
alter table public.plans
  add column stripe_price_id_monthly text,
  add column stripe_price_id_yearly text;

-- ---------------------------------------------------------------------------
-- push_subscriptions — Web Push (VAPID) endpoints per user/device.
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_all_own" on public.push_subscriptions
  for all using (user_id = auth.uid() and public.is_org_member(organization_id))
  with check (user_id = auth.uid() and public.is_org_member(organization_id));
