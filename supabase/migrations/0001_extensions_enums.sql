-- TAPnalytics — 0001: extensions & enums
-- Multitenant SaaS schema. All business tables are scoped by organization_id
-- and protected with Row Level Security (see 0003_rls_policies.sql).

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type org_role as enum (
  'superadmin',        -- TAPnalytics staff, not tied to a single org
  'owner',              -- Propietario de la empresa
  'admin',              -- Administrador empresarial
  'manager',            -- Gerente de sucursal
  'analyst',            -- Analista
  'employee',           -- Empleado
  'viewer'              -- Usuario de solo lectura
);

create type org_status as enum ('active', 'trial', 'past_due', 'suspended', 'canceled');

create type sector as enum (
  'restaurant', 'cafe', 'hotel', 'clinic', 'barbershop', 'gym', 'agency', 'retail', 'other'
);

create type location_status as enum ('active', 'inactive');

create type card_status as enum ('unconfigured', 'active', 'paused', 'lost', 'replaced', 'deactivated');

create type contact_point_type as enum (
  'reception', 'checkout', 'table', 'room', 'counter', 'exit', 'employee_badge', 'receipt', 'other'
);

create type tap_source as enum ('nfc', 'qr', 'link', 'unknown');

create type device_type as enum ('mobile', 'tablet', 'desktop', 'other');

create type experience_rating as enum ('bad', 'good', 'excellent');

create type feedback_session_status as enum ('started', 'completed', 'abandoned');

create type category_kind as enum ('positive', 'negative');

create type urgency_level as enum ('low', 'medium', 'high', 'critical');

create type case_status as enum ('new', 'reviewing', 'in_progress', 'waiting_response', 'resolved', 'closed');

create type alert_severity as enum ('info', 'warning', 'critical');

create type alert_status as enum ('active', 'acknowledged', 'resolved');

create type alert_type as enum (
  'new_bad_experience', 'urgent_comment', 'safety_mention', 'repeated_bad_experience',
  'complaint_spike', 'recurring_problem', 'location_below_threshold', 'card_inactive',
  'card_abnormal_activity', 'unresolved_case', 'weekly_report_ready', 'custom'
);

create type notification_channel as enum ('in_app', 'email', 'push', 'whatsapp');

create type report_type as enum (
  'daily', 'weekly', 'monthly', 'executive', 'by_location', 'problems', 'performance', 'cases', 'nfc_cards', 'period_comparison'
);

create type report_format as enum ('web', 'pdf', 'csv', 'xlsx');

create type report_status as enum ('pending', 'generating', 'ready', 'failed');

create type insight_type as enum (
  'trend', 'anomaly', 'recurring_issue', 'summary', 'comparison', 'recommendation_impact'
);

create type recommendation_status as enum ('open', 'in_progress', 'done', 'dismissed');

create type corrective_action_status as enum ('planned', 'in_progress', 'done', 'canceled');

create type subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid'
);

create type invoice_status as enum ('draft', 'open', 'paid', 'void', 'uncollectible');

create type integration_type as enum (
  'stripe', 'mercado_pago', 'resend', 'twilio', 'whatsapp_cloud', 'web_push', 'google_reviews', 'ai_provider'
);

create type integration_status as enum ('not_connected', 'connected', 'error');

create type consent_subject_type as enum ('feedback_session', 'tap_event', 'case');

create type consent_type as enum ('contact_me', 'data_processing', 'marketing');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
