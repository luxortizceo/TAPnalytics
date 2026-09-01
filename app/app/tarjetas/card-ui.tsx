"use client";

/**
 * Client UI for tarjetas NFC, grouped in one file to keep the repo's file
 * count down (used to be card-dialog/card-form/link-dialog.tsx).
 */

import { useState, useActionState, useEffect } from "react";
import { Plus, Pencil, Link2, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARD_STATUS_LABELS, CONTACT_POINT_TYPES } from "@/lib/labels";
import type { LocationRow, NfcCardRow, TeamMemberRow } from "@/lib/supabase/types";
import { createCard, updateCard, type CardActionState } from "./actions";

const emptyState: CardActionState = {};

function CardForm({
  organizationId,
  locations,
  teamMembers,
  card,
  onSuccess,
}: {
  organizationId: string;
  locations: LocationRow[];
  teamMembers: TeamMemberRow[];
  card?: NfcCardRow;
  onSuccess: () => void;
}) {
  const action = card ? updateCard : createCard;
  const [state, formAction, pending] = useActionState(action, emptyState);

  useEffect(() => {
    if (state.success) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="organizationId" value={organizationId} />
      {card && <input type="hidden" name="cardId" value={card.id} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="locationId">Sucursal</Label>
        <Select name="locationId" defaultValue={card?.location_id}>
          <SelectTrigger id="locationId">
            <SelectValue placeholder="Elige una sucursal" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.locationId && <p className="text-xs text-accent">{state.fieldErrors.locationId}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="alias">Alias</Label>
          <Input id="alias" name="alias" placeholder="Recepción, Mesa 5…" defaultValue={card?.alias ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="areaLabel">Mesa / habitación / área</Label>
          <Input id="areaLabel" name="areaLabel" placeholder="Mesa 12" defaultValue={card?.area_label ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="teamMemberId">Asignar a (opcional)</Label>
        <Select name="teamMemberId" defaultValue={card?.team_member_id ?? "unassigned"}>
          <SelectTrigger id="teamMemberId">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Sin asignar</SelectItem>
            {teamMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
                {m.role_title ? ` (${m.role_title})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {teamMembers.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Agrega personas al equipo abajo para poder asignarles esta tarjeta.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contactPointType">Tipo de punto de contacto</Label>
        <Select name="contactPointType" defaultValue={card?.contact_point_type ?? "table"}>
          <SelectTrigger id="contactPointType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_POINT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {card && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Estado</Label>
          <Select name="status" defaultValue={card.status}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CARD_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
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
        {pending ? "Guardando…" : card ? "Guardar cambios" : "Crear tarjeta"}
      </Button>
    </form>
  );
}

export function CardDialog({
  organizationId,
  locations,
  teamMembers,
  card,
}: {
  organizationId: string;
  locations: LocationRow[];
  teamMembers: TeamMemberRow[];
  card?: NfcCardRow;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {card ? (
          <Button variant="ghost" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Nueva tarjeta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{card ? "Editar tarjeta" : "Nueva tarjeta NFC"}</DialogTitle>
        </DialogHeader>
        <CardForm
          organizationId={organizationId}
          locations={locations}
          teamMembers={teamMembers}
          card={card}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function LinkDialog({
  alias,
  url,
  qrDataUrl,
}: {
  alias: string;
  url: string;
  qrDataUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the URL is
      // still visible and selectable in the dialog.
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Link2 className="size-4" />
          Enlace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{alias || "Tarjeta NFC"}</DialogTitle>
          <DialogDescription>
            URL única para programar la tarjeta física, o su código QR equivalente.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`Código QR de ${url}`}
            width={200}
            height={200}
            className="rounded-md border border-border bg-white p-2"
          />
          <div className="flex w-full items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border bg-surface-2 px-3 py-2 text-xs">
              {url}
            </code>
            <Button type="button" variant="secondary" size="icon" onClick={handleCopy} aria-label="Copiar enlace">
              {copied ? <Check className="size-4 text-positive" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
