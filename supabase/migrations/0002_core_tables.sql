-- TAPnalytics — 0002: core tables
-- Naming: snake_case, uuid primary keys, soft delete via deleted_at where the
-- spec calls for it, created_at/updated_at on every mutable table.

-- ---------------------------------------------------------------------------
-- profiles — 1:1 extension of auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  locale text not null default 'es-MX',
  timezone text not null default 'America/Mexico_City',
  is_superadmin boolean not null default false,
  two_factor_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- plans — pricing lives in the database, never hardcoded in app code
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  max_locations int,              -- null = unlimited/custom (Enterprise)
  max_cards int,                  -- null = unlimited/custom
  max_users int,
  features jsonb not null default '[]'::jsonb,
  price_monthly numeric(12,2),    -- null = "contact us" / custom pricing
  price_yearly numeric(12,2),
  currency text not null default 'MXN',
  trial_days int not null default 14,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sector sector not null default 'other',
  logo_url text,
  status org_status not null default 'trial',
  plan_id uuid references public.plans(id),
  currency text not null default 'MXN',
  language text not null default 'es',
  timezone text not null default 'America/Mexico_City',
  google_reviews_url text,
  privacy_notice_url text,
  onboarding_step text not null default 'create_company',
  onboarding_completed_at timestamptz,
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_organizations_slug on public.organizations(slug) where deleted_at is null;
create trigger trg_organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_members — links auth users to organizations with a role
-- ---------------------------------------------------------------------------
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'employee',
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  invited_by uuid references auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index idx_org_members_user on public.organization_members(user_id);
create index idx_org_members_org on public.organization_members(organization_id);
create trigger trg_org_members_updated_at before update on public.organization_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- brands — an organization can operate one or more commercial brands
-- ---------------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  logo_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_brands_org on public.brands(organization_id) where deleted_at is null;
create trigger trg_brands_updated_at before update on public.brands
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- locations — sucursales
-- ---------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  name text not null,
  status location_status not null default 'active',
  address text,
  city text,
  state text,
  country text default 'MX',
  postal_code text,
  phone text,
  email text,
  timezone text not null default 'America/Mexico_City',
  currency text not null default 'MXN',
  language text not null default 'es',
  google_reviews_url text,
  opening_hours jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_locations_org on public.locations(organization_id) where deleted_at is null;
create trigger trg_locations_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

-- Scopes a member (e.g. manager/employee) to specific locations.
-- Empty = access to all locations in the organization (owner/admin/analyst typical).
create table public.member_locations (
  id uuid primary key default gen_random_uuid(),
  organization_member_id uuid not null references public.organization_members(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (organization_member_id, location_id)
);

-- ---------------------------------------------------------------------------
-- nfc_cards
-- ---------------------------------------------------------------------------
create table public.nfc_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  public_code text not null unique,     -- non-sequential short code, e.g. "ABC123XYZ"
  alias text,
  contact_point_type contact_point_type not null default 'other',
  area_label text,                       -- "Mesa 12", "Habitación 204"...
  employee_id uuid references auth.users(id),
  status card_status not null default 'unconfigured',
  activated_at timestamptz,
  last_tap_at timestamptz,
  total_taps bigint not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_nfc_cards_org on public.nfc_cards(organization_id) where deleted_at is null;
create index idx_nfc_cards_location on public.nfc_cards(location_id);
create index idx_nfc_cards_public_code on public.nfc_cards(public_code);
create trigger trg_nfc_cards_updated_at before update on public.nfc_cards
  for each row execute function public.set_updated_at();

create table public.nfc_card_history (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.nfc_cards(id) on delete cascade,
  changed_by uuid references auth.users(id),
  field text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);
create index idx_nfc_card_history_card on public.nfc_card_history(card_id);

-- ---------------------------------------------------------------------------
-- tap_events — every NFC/QR tap. Written server-side only (service role).
-- ---------------------------------------------------------------------------
create table public.tap_events (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.nfc_cards(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  timezone text,
  source tap_source not null default 'unknown',
  device_type device_type not null default 'other',
  os text,
  browser text,
  language text,
  country text,
  region text,
  city text,
  referrer text,
  session_id uuid not null default gen_random_uuid(),
  ip_hash text,                    -- salted/rotated hash, never raw IP
  survey_started boolean not null default false,
  survey_completed boolean not null default false,
  rating experience_rating,
  google_reviews_opened boolean not null default false,
  is_possible_duplicate boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_tap_events_org on public.tap_events(organization_id);
create index idx_tap_events_location on public.tap_events(location_id);
create index idx_tap_events_card on public.tap_events(card_id);
create index idx_tap_events_occurred_at on public.tap_events(occurred_at);

-- ---------------------------------------------------------------------------
-- feedback_sessions / feedback_responses
-- ---------------------------------------------------------------------------
create table public.feedback_sessions (
  id uuid primary key default gen_random_uuid(),
  tap_event_id uuid references public.tap_events(id) on delete set null,
  card_id uuid not null references public.nfc_cards(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  session_token text not null unique,
  status feedback_session_status not null default 'started',
  rating experience_rating,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_feedback_sessions_org on public.feedback_sessions(organization_id);
create index idx_feedback_sessions_location on public.feedback_sessions(location_id);
create trigger trg_feedback_sessions_updated_at before update on public.feedback_sessions
  for each row execute function public.set_updated_at();

create table public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  feedback_session_id uuid not null references public.feedback_sessions(id) on delete cascade,
  question_key text not null,       -- e.g. 'what_happened', 'what_could_improve'
  answer_text text,
  urgency_level urgency_level,
  contact_requested boolean not null default false,
  contact_name text,
  contact_email text,
  contact_phone text,
  consent_contact boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_feedback_responses_session on public.feedback_responses(feedback_session_id);

-- ---------------------------------------------------------------------------
-- feedback_categories (catalog, adaptable per sector) / response_categories
-- ---------------------------------------------------------------------------
create table public.feedback_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade, -- null = global default catalog
  sector sector,                    -- null = applies to all sectors
  kind category_kind not null,
  code text not null,
  label text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_feedback_categories_org on public.feedback_categories(organization_id);
create trigger trg_feedback_categories_updated_at before update on public.feedback_categories
  for each row execute function public.set_updated_at();

create table public.response_categories (
  id uuid primary key default gen_random_uuid(),
  feedback_response_id uuid not null references public.feedback_responses(id) on delete cascade,
  category_id uuid not null references public.feedback_categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (feedback_response_id, category_id)
);

-- ---------------------------------------------------------------------------
-- cases — feedback center
-- ---------------------------------------------------------------------------
create sequence public.case_folio_seq;

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  feedback_session_id uuid references public.feedback_sessions(id) on delete set null,
  folio text not null unique default ('C-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.case_folio_seq')::text, 5, '0')),
  rating experience_rating,
  summary text,
  urgency urgency_level not null default 'medium',
  status case_status not null default 'new',
  assigned_to uuid references auth.users(id),
  due_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_cases_org on public.cases(organization_id) where deleted_at is null;
create index idx_cases_location on public.cases(location_id);
create index idx_cases_status on public.cases(status);
create trigger trg_cases_updated_at before update on public.cases
  for each row execute function public.set_updated_at();

create table public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  author_id uuid references auth.users(id),
  note text not null,
  is_internal boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_case_notes_case on public.case_notes(case_id);

create table public.case_history (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  actor_id uuid references auth.users(id),
  field text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);
create index idx_case_history_case on public.case_history(case_id);

-- ---------------------------------------------------------------------------
-- alert_rules / alerts
-- ---------------------------------------------------------------------------
create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type alert_type not null,
  name text not null,
  config jsonb not null default '{}'::jsonb,   -- thresholds, windows, keywords...
  channels notification_channel[] not null default '{in_app}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_alert_rules_org on public.alert_rules(organization_id);
create trigger trg_alert_rules_updated_at before update on public.alert_rules
  for each row execute function public.set_updated_at();

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  alert_rule_id uuid references public.alert_rules(id) on delete set null,
  type alert_type not null,
  severity alert_severity not null default 'info',
  title text not null,
  message text not null,
  related_case_id uuid references public.cases(id) on delete set null,
  related_tap_event_id uuid references public.tap_events(id) on delete set null,
  status alert_status not null default 'active',
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_alerts_org on public.alerts(organization_id);
create index idx_alerts_status on public.alerts(status);
create trigger trg_alerts_updated_at before update on public.alerts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications / notification_preferences
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  channel notification_channel not null default 'in_app',
  type text not null,
  title text not null,
  body text,
  related_entity_type text,
  related_entity_id uuid,
  dedupe_key text,
  read_at timestamptz,
  delivered_at timestamptz,
  delivery_error text,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_dedupe on public.notifications(dedupe_key);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,           -- maps to alert_type or 'report' etc.
  channel notification_channel not null,
  enabled boolean not null default true,
  quiet_hours jsonb default '{}'::jsonb,
  frequency text not null default 'immediate' check (frequency in ('immediate', 'hourly_digest', 'daily_digest', 'weekly_digest')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organization_id, category, channel)
);
create trigger trg_notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reports / report_schedules
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  type report_type not null,
  format report_format not null default 'web',
  period_start date not null,
  period_end date not null,
  status report_status not null default 'pending',
  file_url text,
  generated_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_reports_org on public.reports(organization_id);

create table public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_type report_type not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  format report_format not null default 'pdf',
  recipients jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_report_schedules_org on public.report_schedules(organization_id);
create trigger trg_report_schedules_updated_at before update on public.report_schedules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_insights / recommendations / corrective_actions — TAP Intelligence
-- ---------------------------------------------------------------------------
create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  type insight_type not null,
  title text not null,
  description text not null,
  evidence jsonb not null default '{}'::jsonb,
  period_start date,
  period_end date,
  sample_size int,
  confidence numeric(4,3),          -- 0.000–1.000
  created_at timestamptz not null default now()
);
create index idx_ai_insights_org on public.ai_insights(organization_id);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_insight_id uuid references public.ai_insights(id) on delete set null,
  title text not null,
  description text not null,
  suggested_action text,
  responsible_id uuid references auth.users(id),
  follow_up_date date,
  status recommendation_status not null default 'open',
  impact_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_recommendations_org on public.recommendations(organization_id);
create trigger trg_recommendations_updated_at before update on public.recommendations
  for each row execute function public.set_updated_at();

create table public.corrective_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  recommendation_id uuid references public.recommendations(id) on delete cascade,
  title text not null,
  description text,
  responsible_id uuid references auth.users(id),
  due_date date,
  status corrective_action_status not null default 'planned',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (case_id is not null or recommendation_id is not null)
);
create index idx_corrective_actions_org on public.corrective_actions(organization_id);
create trigger trg_corrective_actions_updated_at before update on public.corrective_actions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- subscriptions / invoices
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status subscription_status not null default 'trialing',
  provider text not null default 'stripe' check (provider in ('stripe', 'mercado_pago')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_subscriptions_org_active on public.subscriptions(organization_id)
  where status in ('trialing', 'active', 'past_due');
create trigger trg_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider_invoice_id text,
  amount_due numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  currency text not null default 'MXN',
  status invoice_status not null default 'draft',
  invoice_pdf_url text,
  period_start date,
  period_end date,
  created_at timestamptz not null default now()
);
create index idx_invoices_org on public.invoices(organization_id);

-- ---------------------------------------------------------------------------
-- integrations
-- ---------------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type integration_type not null,
  status integration_status not null default 'not_connected',
  config jsonb not null default '{}'::jsonb,   -- non-secret config only; secrets stay in env/secret manager
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, type)
);
create trigger trg_integrations_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_org on public.audit_logs(organization_id);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- consent_records
-- ---------------------------------------------------------------------------
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  subject_type consent_subject_type not null,
  subject_id uuid not null,
  consent_type consent_type not null,
  granted boolean not null,
  text_shown text,
  created_at timestamptz not null default now()
);
create index idx_consent_records_subject on public.consent_records(subject_type, subject_id);
