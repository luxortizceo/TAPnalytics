"use client";

import { ChevronsUpDown, Check } from "lucide-react";
import type { Membership } from "@/lib/data/current-org";
import { switchOrganizationAction } from "@/app/app/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/permissions";

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
