import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  Settings,
  FileWarning,
  Bell,
  FileBarChart,
} from "lucide-react";
import type { Membership } from "@/lib/data/current-org";
import { can } from "@/lib/permissions";
import { OrgSwitcher } from "@/components/app/org-switcher";
import { UserMenu } from "@/components/app/user-menu";
import { NotificationBell } from "@/components/app/notification-bell";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/sucursales", label: "Sucursales", icon: Building2 },
  { href: "/app/tarjetas", label: "Tarjetas NFC", icon: CreditCard },
  { href: "/app/casos", label: "Casos", icon: FileWarning },
  { href: "/app/alertas", label: "Alertas", icon: Bell },
  { href: "/app/reportes", label: "Reportes", icon: FileBarChart },
  { href: "/app/equipo", label: "Equipo", icon: Users, action: "manage_users" as const },
  { href: "/app/configuracion", label: "Configuración", icon: Settings },
];

export function AppShell({
  current,
  memberships,
  children,
}: {
  current: Membership;
  memberships: Membership[];
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[260px_1fr]">
      <aside className="hidden flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link href="/app/dashboard" className="text-lg font-semibold tracking-tight">
            TAP<span className="text-accent">nalytics</span>
          </Link>
        </div>
        <div className="border-b border-border p-4">
          <OrgSwitcher current={current} memberships={memberships} />
        </div>
        <nav className="flex-1 p-3">
          <ul className="flex flex-col gap-1">
            {NAV.filter((item) => !item.action || can(current.role, item.action)).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-border p-4">
          <UserMenu role={current.role} />
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
          <Link href="/app/dashboard" className="text-lg font-semibold tracking-tight">
            TAP<span className="text-accent">nalytics</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell organizationId={current.organization.id} />
            <UserMenu role={current.role} />
          </div>
        </header>
        <header className="hidden h-16 items-center justify-end border-b border-border px-6 lg:flex">
          <NotificationBell organizationId={current.organization.id} />
        </header>
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
