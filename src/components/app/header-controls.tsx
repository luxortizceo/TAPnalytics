/**
 * Header dropdown controls, grouped in one file to keep the repo's file
 * count down (used to be org-switcher.tsx + user-menu.tsx). Neither uses
 * local state/hooks of its own — both simply compose client components
 * (DropdownMenu, Avatar), so this file doesn't need "use client" either.
 */

import { ChevronsUpDown, Check, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import type { Membership } from "@/lib/data/current-org";
import { switchOrganizationAction } from "@/app/app/actions";
import { logout } from "@/app/(auth)/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/labels";
import type { OrgRole } from "@/lib/supabase/types";

export function OrgSwitcher({
  current,
  memberships,
}: {
  current: Membership;
  memberships: Membership[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="w-full justify-between px-3">
          <span className="flex flex-col items-start overflow-hidden text-left">
            <span className="w-full truncate text-sm font-medium">{current.organization.name}</span>
            <span className="text-xs text-muted-foreground">{ROLE_LABELS[current.role]}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {memberships.map((m) => (
          <form key={m.organization.id} action={switchOrganizationAction}>
            <input type="hidden" name="organizationId" value={m.organization.id} />
            <DropdownMenuItem asChild>
              <button type="submit" className="flex w-full items-center justify-between">
                <span className="truncate">{m.organization.name}</span>
                {m.organization.id === current.organization.id && <Check className="size-4 text-positive" />}
              </button>
            </DropdownMenuItem>
          </form>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserMenu({ role }: { role: OrgRole }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md p-1 text-left hover:bg-surface-2" aria-label="Menú de usuario">
          <Avatar>
            <AvatarFallback>{ROLE_LABELS[role].charAt(0)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">{ROLE_LABELS[role]}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/configuracion" className="flex items-center gap-2">
            <Settings className="size-4" />
            Configuración
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem asChild>
            <button type="submit" className="flex w-full items-center gap-2 text-accent">
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
