/**
 * UI label maps, grouped in one file to keep the repo's file count down
 * (used to be cases-labels.ts, plus ROLE_LABELS from permissions.ts and
 * CARD_STATUS_LABELS/CONTACT_POINT_TYPES from nfc.ts). Pure constants —
 * safe to import from client or server code.
 */

import type {
  CaseStatus,
  UrgencyLevel,
  OrgRole,
  CardStatus,
  ContactPointType,
  InsightType,
  RecommendationStatus,
  CorrectiveActionStatus,
  SubscriptionStatus,
  OrgStatus,
} from "@/lib/supabase/types";

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  new: "Nuevo",
  reviewing: "Revisando",
  in_progress: "En proceso",
  waiting_response: "Esperando respuesta",
  resolved: "Resuelto",
  closed: "Cerrado",
};

export const CASE_STATUS_ORDER: CaseStatus[] = [
  "new",
  "reviewing",
  "in_progress",
  "waiting_response",
  "resolved",
  "closed",
];

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

export const ROLE_LABELS: Record<OrgRole, string> = {
  superadmin: "Superadministrador",
  owner: "Propietario",
  admin: "Administrador",
  manager: "Gerente de sucursal",
  analyst: "Analista",
  employee: "Empleado",
  viewer: "Solo lectura",
};

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  unconfigured: "Sin configurar",
  active: "Activa",
  paused: "Pausada",
  lost: "Perdida",
  replaced: "Reemplazada",
  deactivated: "Desactivada",
};

export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  trend: "Tendencia",
  anomaly: "Anomalía",
  recurring_issue: "Problema recurrente",
  summary: "Resumen",
  comparison: "Comparativa",
  recommendation_impact: "Impacto de recomendación",
};

export const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> = {
  open: "Abierta",
  in_progress: "En proceso",
  done: "Hecha",
  dismissed: "Descartada",
};

export const CORRECTIVE_ACTION_STATUS_LABELS: Record<CorrectiveActionStatus, string> = {
  planned: "Planeada",
  in_progress: "En proceso",
  done: "Hecha",
  canceled: "Cancelada",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Periodo de prueba",
  active: "Activa",
  past_due: "Pago vencido",
  canceled: "Cancelada",
  incomplete: "Incompleta",
  unpaid: "Sin pagar",
};

export const ORG_STATUS_LABELS: Record<OrgStatus, string> = {
  trial: "Prueba",
  active: "Activa",
  past_due: "Pago vencido",
  suspended: "Suspendida",
  canceled: "Cancelada",
};

export const CONTACT_POINT_TYPES: { value: ContactPointType; label: string }[] = [
  { value: "reception", label: "Recepción" },
  { value: "checkout", label: "Caja" },
  { value: "table", label: "Mesa" },
  { value: "room", label: "Habitación" },
  { value: "counter", label: "Mostrador" },
  { value: "exit", label: "Salida" },
  { value: "employee_badge", label: "Tarjeta de empleado" },
  { value: "receipt", label: "Ticket de compra" },
  { value: "other", label: "Otro" },
];
