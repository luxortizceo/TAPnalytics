"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/components/app/nav-items";
import { can } from "@/lib/permissions";
import type { OrgRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function SidebarNav({ role, onNavigate }: { role: OrgRole; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {NAV.filter((item) => !item.action || can(role, item.action)).map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-positive bg-surface-2 text-foreground shadow-[0_0_14px_-4px_var(--color-positive)]"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <item.icon className={cn("size-4 shrink-0", active && "text-positive")} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
