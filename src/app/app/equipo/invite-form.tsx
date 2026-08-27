"use client";

import { Label } from "@/components/ui/primitives";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/labels";
import { inviteMember, type InviteState } from "./actions";

const initialState: InviteState = {};
const INVITABLE_ROLES = ["admin", "manager", "analyst", "employee", "viewer"] as const;

export function InviteForm({ organizationId }: { organizationId: string }) {
  const [state, formAction, pending] = useActionState(inviteMember, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end" noValidate>
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="invite-email">Correo del colaborador</Label>
        <Input id="invite-email" name="email" type="email" required invalid={!!state.fieldErrors?.email} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-role">Rol</Label>
        <Select name="role" defaultValue="employee">
          <SelectTrigger id="invite-role" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INVITABLE_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Invitando…" : "Invitar"}
      </Button>
      {state.error && <p className="text-sm text-accent sm:basis-full">{state.error}</p>}
      {state.success && <p className="text-sm text-positive sm:basis-full">{state.success}</p>}
    </form>
  );
}
