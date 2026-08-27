import type { CaseStatus, UrgencyLevel } from "@/lib/supabase/types";

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
