import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  Settings,
  FileWarning,
  Bell,
  FileBarChart,
  Sparkles,
  Wallet,
  Clock,
} from "lucide-react";
import type { Action } from "@/lib/permissions";

export const NAV: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  action?: Action;
}[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/sucursales", label: "Sucursales", icon: Building2 },
  { href: "/app/tarjetas", label: "Tarjetas NFC", icon: CreditCard },
  { href: "/app/casos", label: "Casos", icon: FileWarning },
  { href: "/app/asistencia", label: "Asistencia", icon: Clock },
  { href: "/app/alertas", label: "Alertas", icon: Bell },
  { href: "/app/reportes", label: "Reportes", icon: FileBarChart },
  { href: "/app/inteligencia", label: "TAP Intelligence", icon: Sparkles },
  { href: "/app/equipo", label: "Equipo", icon: Users, action: "manage_users" },
  { href: "/app/facturacion", label: "Facturación", icon: Wallet, action: "manage_billing" },
  { href: "/app/configuracion", label: "Configuración", icon: Settings },
];
