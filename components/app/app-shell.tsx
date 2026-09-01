import Link from "next/link";
import type { Membership } from "@/lib/data/current-org";
import { OrgSwitcher, UserMenu } from "@/components/app/header-controls";
import { NotificationBell } from "@/components/app/notification-bell";
import { MobileNav } from "@/components/app/mobile-nav";
import { SidebarNav } from "@/components/app/sidebar-nav";

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
          <SidebarNav role={current.role} />
        </nav>
        <div className="border-t border-border p-4">
          <UserMenu role={current.role} />
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <MobileNav current={current} memberships={memberships} />
            <Link href="/app/dashboard" className="text-lg font-semibold tracking-tight">
              TAP<span className="text-accent">nalytics</span>
            </Link>
          </div>
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
