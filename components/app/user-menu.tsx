import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/lib/permissions";
import type { OrgRole } from "@/lib/supabase/types";

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
