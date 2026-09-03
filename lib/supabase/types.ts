/**
 * Hand-authored types for the tables touched by the app so far.
 * Once a Supabase project is linked, replace this file with the output of:
 *   supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
 * See docs/architecture.md for the full ~30-table schema (supabase/migrations).
 */

export type OrgRole =
  | "superadmin"
  | "owner"
  | "admin"
  | "manager"
  | "analyst"
  | "employee"
  | "viewer";

export type OrgStatus = "active" | "trial" | "past_due" | "suspended" | "canceled";

export type Sector =
  | "restaurant"
  | "cafe"
  | "hotel"
  | "clinic"
  | "barbershop"
  | "gym"
  | "agency"
  | "retail"
  | "other";

export type LocationStatus = "active" | "inactive";
export type CardStatus = "unconfigured" | "active" | "paused" | "lost" | "replaced" | "deactivated";
export type ContactPointType =
  | "reception"
  | "checkout"
  | "table"
  | "room"
  | "counter"
  | "exit"
  | "employee_badge"
  | "receipt"
  | "other";

export type TapSource = "nfc" | "qr" | "link" | "unknown";
export type DeviceType = "mobile" | "tablet" | "desktop" | "other";
export type ExperienceRating = "bad" | "good" | "excellent";
export type FeedbackSessionStatus = "started" | "completed" | "abandoned";
export type CategoryKind = "positive" | "negative";
export type UrgencyLevel = "low" | "medium" | "high" | "critical";

export type CaseStatus = "new" | "reviewing" | "in_progress" | "waiting_response" | "resolved" | "closed";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type AlertType =
  | "new_bad_experience"
  | "urgent_comment"
  | "safety_mention"
  | "repeated_bad_experience"
  | "complaint_spike"
  | "recurring_problem"
  | "location_below_threshold"
  | "card_inactive"
  | "card_abnormal_activity"
  | "unresolved_case"
  | "weekly_report_ready"
  | "employee_late"
  | "custom";
export type NotificationChannel = "in_app" | "email" | "push" | "whatsapp";

export type ReportType =
  | "daily"
  | "weekly"
  | "monthly"
  | "executive"
  | "by_location"
  | "problems"
  | "performance"
  | "cases"
  | "nfc_cards"
  | "period_comparison";
export type ReportFormat = "web" | "pdf" | "csv" | "xlsx";
export type ReportStatus = "pending" | "generating" | "ready" | "failed";
export type InsightType =
  | "trend"
  | "anomaly"
  | "recurring_issue"
  | "summary"
  | "comparison"
  | "recommendation_impact"
  | "critical_case";
export type RecommendationStatus = "open" | "in_progress" | "done" | "dismissed";
export type CorrectiveActionStatus = "planned" | "in_progress" | "done" | "canceled";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "unpaid";
export type InvoiceStatus = "draft" | "open" | "paid" | "void" | "uncollectible";
export type IntegrationType =
  | "stripe"
  | "mercado_pago"
  | "resend"
  | "twilio"
  | "whatsapp_cloud"
  | "web_push"
  | "google_reviews"
  | "ai_provider";
export type IntegrationStatus = "not_connected" | "connected" | "error";

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  locale: string;
  timezone: string;
  is_superadmin: boolean;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  max_locations: number | null;
  max_cards: number | null;
  max_users: number | null;
  features: string[];
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  trial_days: number;
  is_active: boolean;
  sort_order: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  created_at: string;
  updated_at: string;
}

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  sector: Sector;
  logo_url: string | null;
  status: OrgStatus;
  plan_id: string | null;
  currency: string;
  language: string;
  timezone: string;
  google_reviews_url: string | null;
  privacy_notice_url: string | null;
  onboarding_step: string;
  onboarding_completed_at: string | null;
  trial_ends_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type OrganizationMemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  status: "invited" | "active" | "suspended";
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BrandRow = {
  id: string;
  organization_id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type LocationRow = {
  id: string;
  organization_id: string;
  brand_id: string | null;
  name: string;
  status: LocationStatus;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  currency: string;
  language: string;
  google_reviews_url: string | null;
  google_place_id: string | null;
  opening_hours: Record<string, unknown>;
  settings: Record<string, unknown>;
  latitude: number | null;
  longitude: number | null;
  checkin_radius_meters: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type MemberLocationRow = {
  id: string;
  organization_member_id: string;
  location_id: string;
  created_at: string;
}

export type NfcCardRow = {
  id: string;
  organization_id: string;
  location_id: string;
  public_code: string;
  alias: string | null;
  contact_point_type: ContactPointType;
  area_label: string | null;
  team_member_id: string | null;
  status: CardStatus;
  activated_at: string | null;
  last_tap_at: string | null;
  total_taps: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type TeamMemberStatus = "active" | "inactive";

export type TeamMemberRow = {
  id: string;
  organization_id: string;
  location_id: string | null;
  name: string;
  role_title: string | null;
  status: TeamMemberStatus;
  user_id: string | null;
  shift_start_time: string | null;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = "on_time" | "late";

export type AttendanceRecordRow = {
  id: string;
  organization_id: string;
  location_id: string;
  team_member_id: string;
  checked_in_at: string;
  checked_out_at: string | null;
  checkin_lat: number;
  checkin_lng: number;
  checkin_distance_meters: number;
  status: AttendanceStatus;
  minutes_late: number;
  created_at: string;
}

export type GoogleReviewSnapshotRow = {
  id: string;
  organization_id: string;
  location_id: string;
  review_count: number;
  rating: number | null;
  captured_at: string;
}

export type TapEventRow = {
  id: string;
  card_id: string;
  organization_id: string;
  location_id: string;
  occurred_at: string;
  timezone: string | null;
  source: TapSource;
  device_type: DeviceType;
  os: string | null;
  browser: string | null;
  language: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  referrer: string | null;
  session_id: string;
  ip_hash: string | null;
  survey_started: boolean;
  survey_completed: boolean;
  rating: ExperienceRating | null;
  google_reviews_opened: boolean;
  is_possible_duplicate: boolean;
  created_at: string;
}

export type FeedbackSessionRow = {
  id: string;
  tap_event_id: string | null;
  card_id: string;
  organization_id: string;
  location_id: string;
  session_token: string;
  status: FeedbackSessionStatus;
  rating: ExperienceRating | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type FeedbackResponseRow = {
  id: string;
  feedback_session_id: string;
  question_key: string;
  answer_text: string | null;
  urgency_level: UrgencyLevel | null;
  contact_requested: boolean;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  consent_contact: boolean;
  created_at: string;
}

export type FeedbackCategoryRow = {
  id: string;
  organization_id: string | null;
  sector: Sector | null;
  kind: CategoryKind;
  code: string;
  label: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ResponseCategoryRow = {
  id: string;
  feedback_response_id: string;
  category_id: string;
  created_at: string;
}

export type NfcCardHistoryRow = {
  id: string;
  card_id: string;
  changed_by: string | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export type ConsentSubjectType = "feedback_session" | "tap_event" | "case";
export type ConsentType = "contact_me" | "data_processing" | "marketing";

export type ConsentRecordRow = {
  id: string;
  subject_type: ConsentSubjectType;
  subject_id: string;
  consent_type: ConsentType;
  granted: boolean;
  text_shown: string | null;
  created_at: string;
}

export type CaseRow = {
  id: string;
  organization_id: string;
  location_id: string;
  feedback_session_id: string | null;
  folio: string;
  rating: ExperienceRating | null;
  summary: string | null;
  urgency: UrgencyLevel;
  status: CaseStatus;
  assigned_to: string | null;
  due_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  ai_suggestion: CaseAiSuggestion | null;
  ai_suggestion_generated_at: string | null;
  resolution_feedback_token: string | null;
  resolution_email_sent_at: string | null;
  resolution_rating: ExperienceRating | null;
  resolution_rating_at: string | null;
  resolution_comment: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type CaseAiSuggestion = {
  diagnosis: string;
  customerResponse: string;
  internalAction: string;
  source: "incident" | "playbook" | "ai";
  escalation?: string;
  doNot?: string[];
};

export type SolutionPlaybookRow = {
  id: string;
  category_code: string;
  diagnosis: string;
  customer_response: string;
  internal_action: string;
  created_at: string;
  updated_at: string;
};

export type IncidentPlaybookRow = {
  id: string;
  scenario_id: string;
  vertical: string;
  category_label: string;
  problem: string;
  urgency_default: UrgencyLevel;
  signals: string[];
  questions_to_confirm: string[];
  immediate_action: string;
  owner_role: string;
  customer_response: string;
  root_cause_action: string;
  ack_sla: string | null;
  action_sla: string | null;
  resolution_target: string | null;
  escalation: string | null;
  do_not: string[];
  evidence: string[];
  success_metrics: string[];
  confidence_rule: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseNoteRow = {
  id: string;
  case_id: string;
  author_id: string | null;
  note: string;
  is_internal: boolean;
  created_at: string;
}

export type CaseHistoryRow = {
  id: string;
  case_id: string;
  actor_id: string | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export type AlertRuleRow = {
  id: string;
  organization_id: string;
  type: AlertType;
  name: string;
  config: Record<string, unknown>;
  channels: NotificationChannel[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AlertRow = {
  id: string;
  organization_id: string;
  location_id: string | null;
  alert_rule_id: string | null;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  related_case_id: string | null;
  related_tap_event_id: string | null;
  status: AlertStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationRow = {
  id: string;
  user_id: string;
  organization_id: string | null;
  channel: NotificationChannel;
  type: string;
  title: string;
  body: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  dedupe_key: string | null;
  read_at: string | null;
  delivered_at: string | null;
  delivery_error: string | null;
  created_at: string;
}

export type NotificationPreferenceRow = {
  id: string;
  user_id: string;
  organization_id: string;
  category: string;
  channel: NotificationChannel;
  enabled: boolean;
  quiet_hours: Record<string, unknown> | null;
  frequency: "immediate" | "hourly_digest" | "daily_digest" | "weekly_digest";
  created_at: string;
  updated_at: string;
}

export type ReportRow = {
  id: string;
  organization_id: string;
  location_id: string | null;
  type: ReportType;
  format: ReportFormat;
  period_start: string;
  period_end: string;
  status: ReportStatus;
  file_url: string | null;
  generated_by: string | null;
  created_at: string;
}

export type ReportScheduleRow = {
  id: string;
  organization_id: string;
  report_type: ReportType;
  frequency: "daily" | "weekly" | "monthly";
  format: ReportFormat;
  recipients: string[];
  is_active: boolean;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AiInsightRow = {
  id: string;
  organization_id: string;
  location_id: string | null;
  type: InsightType;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  period_start: string | null;
  period_end: string | null;
  sample_size: number | null;
  confidence: number | null;
  created_at: string;
}

export type RecommendationRow = {
  id: string;
  organization_id: string;
  ai_insight_id: string | null;
  title: string;
  description: string;
  suggested_action: string | null;
  responsible_id: string | null;
  follow_up_date: string | null;
  status: RecommendationStatus;
  impact_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CorrectiveActionRow = {
  id: string;
  organization_id: string;
  case_id: string | null;
  recommendation_id: string | null;
  title: string;
  description: string | null;
  responsible_id: string | null;
  due_date: string | null;
  status: CorrectiveActionStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionRow = {
  id: string;
  organization_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  provider: "stripe" | "mercado_pago";
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceRow = {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  provider_invoice_id: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: InvoiceStatus;
  invoice_pdf_url: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export type IntegrationRow = {
  id: string;
  organization_id: string;
  type: IntegrationType;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AuditLogRow = {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_hash: string | null;
  created_at: string;
}

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  organization_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

// Simplification for this hand-authored stopgap: every insertable column is
// optional (the database enforces real NOT NULL/default constraints via
// migrations). `supabase gen types` will produce a more precise Insert type
// once a live project is linked — see the note at the top of this file.
type Insertable<T> = Partial<Omit<T, "id" | "created_at" | "updated_at">>;
type Updatable<T> = Partial<T>;

// A `type` alias (not `interface`) so the Database shape resolves eagerly
// against supabase-js's deeply nested conditional generics — with an
// `interface` here, `.from(...).select(...)` silently degrades to `never`.
export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Insertable<ProfileRow>, Updatable<ProfileRow>>;
      plans: Table<PlanRow, Insertable<PlanRow>, Updatable<PlanRow>>;
      organizations: Table<OrganizationRow, Insertable<OrganizationRow>, Updatable<OrganizationRow>>;
      organization_members: Table<
        OrganizationMemberRow,
        Insertable<OrganizationMemberRow>,
        Updatable<OrganizationMemberRow>
      >;
      brands: Table<BrandRow, Insertable<BrandRow>, Updatable<BrandRow>>;
      locations: Table<LocationRow, Insertable<LocationRow>, Updatable<LocationRow>>;
      member_locations: Table<
        MemberLocationRow,
        Insertable<MemberLocationRow>,
        Updatable<MemberLocationRow>
      >;
      nfc_cards: Table<NfcCardRow, Insertable<NfcCardRow>, Updatable<NfcCardRow>>;
      team_members: Table<TeamMemberRow, Insertable<TeamMemberRow>, Updatable<TeamMemberRow>>;
      attendance_records: Table<
        AttendanceRecordRow,
        Insertable<AttendanceRecordRow>,
        Updatable<AttendanceRecordRow>
      >;
      google_review_snapshots: Table<
        GoogleReviewSnapshotRow,
        Insertable<GoogleReviewSnapshotRow>,
        Updatable<GoogleReviewSnapshotRow>
      >;
      solution_playbook: Table<
        SolutionPlaybookRow,
        Insertable<SolutionPlaybookRow>,
        Updatable<SolutionPlaybookRow>
      >;
      incident_playbook: Table<
        IncidentPlaybookRow,
        Insertable<IncidentPlaybookRow>,
        Updatable<IncidentPlaybookRow>
      >;
      nfc_card_history: Table<
        NfcCardHistoryRow,
        Insertable<NfcCardHistoryRow>,
        Updatable<NfcCardHistoryRow>
      >;
      tap_events: Table<TapEventRow, Insertable<TapEventRow>, Updatable<TapEventRow>>;
      feedback_sessions: Table<
        FeedbackSessionRow,
        Insertable<FeedbackSessionRow>,
        Updatable<FeedbackSessionRow>
      >;
      feedback_responses: Table<
        FeedbackResponseRow,
        Insertable<FeedbackResponseRow>,
        Updatable<FeedbackResponseRow>
      >;
      feedback_categories: Table<
        FeedbackCategoryRow,
        Insertable<FeedbackCategoryRow>,
        Updatable<FeedbackCategoryRow>
      >;
      response_categories: Table<
        ResponseCategoryRow,
        Insertable<ResponseCategoryRow>,
        Updatable<ResponseCategoryRow>
      >;
      consent_records: Table<
        ConsentRecordRow,
        Insertable<ConsentRecordRow>,
        Updatable<ConsentRecordRow>
      >;
      cases: Table<CaseRow, Insertable<CaseRow>, Updatable<CaseRow>>;
      case_notes: Table<CaseNoteRow, Insertable<CaseNoteRow>, Updatable<CaseNoteRow>>;
      case_history: Table<CaseHistoryRow, Insertable<CaseHistoryRow>, Updatable<CaseHistoryRow>>;
      alert_rules: Table<AlertRuleRow, Insertable<AlertRuleRow>, Updatable<AlertRuleRow>>;
      alerts: Table<AlertRow, Insertable<AlertRow>, Updatable<AlertRow>>;
      notifications: Table<NotificationRow, Insertable<NotificationRow>, Updatable<NotificationRow>>;
      notification_preferences: Table<
        NotificationPreferenceRow,
        Insertable<NotificationPreferenceRow>,
        Updatable<NotificationPreferenceRow>
      >;
      reports: Table<ReportRow, Insertable<ReportRow>, Updatable<ReportRow>>;
      report_schedules: Table<
        ReportScheduleRow,
        Insertable<ReportScheduleRow>,
        Updatable<ReportScheduleRow>
      >;
      ai_insights: Table<AiInsightRow, Insertable<AiInsightRow>, Updatable<AiInsightRow>>;
      recommendations: Table<
        RecommendationRow,
        Insertable<RecommendationRow>,
        Updatable<RecommendationRow>
      >;
      corrective_actions: Table<
        CorrectiveActionRow,
        Insertable<CorrectiveActionRow>,
        Updatable<CorrectiveActionRow>
      >;
      subscriptions: Table<SubscriptionRow, Insertable<SubscriptionRow>, Updatable<SubscriptionRow>>;
      invoices: Table<InvoiceRow, Insertable<InvoiceRow>, Updatable<InvoiceRow>>;
      integrations: Table<IntegrationRow, Insertable<IntegrationRow>, Updatable<IntegrationRow>>;
      audit_logs: Table<AuditLogRow, Insertable<AuditLogRow>, Updatable<AuditLogRow>>;
      push_subscriptions: Table<
        PushSubscriptionRow,
        Insertable<PushSubscriptionRow>,
        Updatable<PushSubscriptionRow>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
