"use client";

/**
 * "Personal" — roster of physical staff (not Tapnalytics logins; see
 * app/app/equipo for that). Lives next to Tarjetas NFC because its main
 * purpose is letting a card be assigned to a specific person.
 */

import { useState, useActionState, useEffect } from "react";
import { Plus, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Label } from "@/components/ui/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LocationRow, TeamMemberRow } from "@/lib/supabase/types";
import { createTeamMember, updateTeamMember, type CardActionState } from "./actions";

const emptyState: CardActionState = {};

function TeamMemberForm({
  organizationId,
  locations,
  member,
  onSuccess,
}: {
  organizationId: string;
  locations: LocationRow[];
  member?: TeamMemberRow;
  onSuccess: () => void;
}) {
  const action = member ? updateTeamMember : createTeamMember;
  const [state, formAction, pending] = useActionState(action, emptyState);

  useEffect(() => {
    if (state.success) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="organizationId" value={organizationId} />
      {member && <input type="hidden" name="memberId" value={member.id} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" placeholder="Carlos Ramírez" defaultValue={member?.name ?? ""} />
        {state.fieldErrors?.name && <p className="text-xs text-accent">{state.fieldErrors.name}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="roleTitle">Puesto (opcional)</Label>
        <Input id="roleTitle" name="roleTitle" placeholder="Barbero, mesero, entrenador…" defaultValue={member?.role_title ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="locationId">Sucursal (opcional)</Label>
        <Select name="locationId" defaultValue={member?.location_id ?? "unassigned"}>
          <SelectTrigger id="locationId">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Sin sucursal específica</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {member && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Estado</Label>
          <Select name="status" defaultValue={member.status}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? "Guardando…" : member ? "Guardar cambios" : "Agregar persona"}
      </Button>
    </form>
  );
}

export function TeamMemberDialog({
  organizationId,
  locations,
  member,
}: {
  organizationId: string;
  locations: LocationRow[];
  member?: TeamMemberRow;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {member ? (
          <Button variant="ghost" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        ) : (
          <Button size="sm" variant="secondary">
            <Plus className="size-4" />
            Agregar persona
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member ? "Editar persona" : "Agregar persona al equipo"}</DialogTitle>
        </DialogHeader>
        <TeamMemberForm
          organizationId={organizationId}
          locations={locations}
          member={member}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function TeamList({
  organizationId,
  locations,
  members,
}: {
  organizationId: string;
  locations: LocationRow[];
  members: TeamMemberRow[];
}) {
  const locationNameById = new Map(locations.map((l) => [l.id, l.name]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Personal del negocio, no necesariamente con acceso a Tapnalytics — sirve para poder
          asignar una tarjeta NFC a una persona específica.
        </p>
        <TeamMemberDialog organizationId={organizationId} locations={locations} />
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no has agregado a nadie del equipo.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{m.name}</span>
                {m.role_title && <span className="text-xs text-muted-foreground">{m.role_title}</span>}
                {m.location_id && (
                  <span className="text-xs text-muted-foreground">· {locationNameById.get(m.location_id)}</span>
                )}
                {m.status === "inactive" && <Badge variant="outline">Inactivo</Badge>}
              </div>
              <TeamMemberDialog organizationId={organizationId} locations={locations} member={m} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
