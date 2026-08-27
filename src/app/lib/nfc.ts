import { nanoid } from "nanoid";
import type { CardStatus, ContactPointType } from "@/lib/supabase/types";

/** Non-sequential, unguessable-enough short code for the physical card URL. */
export function generatePublicCode() {
  return nanoid(10).replace(/[_-]/g, "x").toUpperCase();
}

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  unconfigured: "Sin configurar",
  active: "Activa",
  paused: "Pausada",
  lost: "Perdida",
  replaced: "Reemplazada",
  deactivated: "Desactivada",
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
