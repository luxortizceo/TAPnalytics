"use client";

import { useState, useActionState, useEffect } from "react";
import { Clock, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
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
import {
  grantTeamMemberAccess,
  updateTeamMemberSchedule,
  type AttendanceActionState,
} from "./actions";

const emptyState: AttendanceActionState = {};

function ScheduleDialog({
  member,
  locations,
}: {
  member: TeamMemberRow;
  locations: LocationRow[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateTeamMemberSchedule, emptyState);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Clock className="size-4" />
          Horario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Horario de {member.name}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="teamMemberId" value={member.id} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`shift-${member.id}`}>Hora esperada de entrada (opcional)</Label>
            <Input
              id={`shift-${member.id}`}
              name="shiftStartTime"
              type="time"
              defaultValue={member.shift_start_time?.slice(0, 5) ?? ""}
              className="max-w-[140px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`location-${member.id}`}>Sucursal</Label>
            <Select name="locationId" defaultValue={member.location_id ?? "unassigned"}>
              <SelectTrigger id={`location-${member.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Sin sucursal específica</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                    {loc.latitude == null ? " (sin GPS)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-accent">
              {state.error}
            </p>
          )}
          <Button type="submit" className="w-fit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GrantAccessDialog({
  member,
  organizationId,
}: {
  member: TeamMemberRow;
  organizationId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(grantTeamMemberAccess, emptyState);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <UserPlus className="size-4" />
          Dar acceso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dar acceso a {member.name}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="teamMemberId" value={member.id} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`email-${member.id}`}>Correo</Label>
            <Input
              id={`email-${member.id}`}
              name="email"
              type="email"
              required
              invalid={!!state.fieldErrors?.email}
            />
            {state.fieldErrors?.email && <p className="text-xs text-accent">{state.fieldErrors.email}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            Le llegará un correo para crear su contraseña. Podrá marcar entrada y salida desde su
            teléfono.
          </p>

          {state.error && (
            <p role="alert" className="text-sm text-accent">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Invitando…" : "Enviar acceso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TeamRoster({
  organizationId,
  locations,
  members,
}: {
  organizationId: string;
  locations: LocationRow[];
  members: TeamMemberRow[];
}) {
  const locationNameById = new Map(locations.map((l) => [l.id, l.name]));

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no has agregado a nadie del equipo. Agrégalos desde Tarjetas NFC → Personal.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((m) => (
        <div
          key={m.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{m.name}</span>
            {m.location_id && (
              <span className="text-xs text-muted-foreground">· {locationNameById.get(m.location_id)}</span>
            )}
            {m.shift_start_time && (
              <span className="text-xs text-muted-foreground">· entra {m.shift_start_time.slice(0, 5)}</span>
            )}
            {m.user_id ? (
              <Badge variant="positive">Con acceso</Badge>
            ) : (
              <Badge variant="outline">Sin acceso</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ScheduleDialog member={m} locations={locations} />
            {!m.user_id && <GrantAccessDialog member={m} organizationId={organizationId} />}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface AttendanceReportRow {
  id: string;
  memberName: string;
  locationName: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  status: "on_time" | "late";
  distanceMeters: number;
}

export function AttendanceReport({ rows }: { rows: AttendanceReportRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay registros de asistencia.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Persona</th>
            <th className="px-4 py-3 font-medium">Sucursal</th>
            <th className="px-4 py-3 font-medium">Entrada</th>
            <th className="px-4 py-3 font-medium">Salida</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id} className="bg-surface">
              <td className="px-4 py-3 font-medium text-foreground">{r.memberName}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.locationName}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(r.checkedInAt).toLocaleString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {r.checkedOutAt
                  ? new Date(r.checkedOutAt).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </td>
              <td className="px-4 py-3">
                <Badge variant={r.status === "late" ? "warning" : "positive"}>
                  {r.status === "late" ? "Tarde" : "A tiempo"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
