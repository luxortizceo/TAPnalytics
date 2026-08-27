"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARD_STATUS_LABELS, CONTACT_POINT_TYPES } from "@/lib/nfc";
import type { LocationRow, NfcCardRow } from "@/lib/supabase/types";
import { createCard, updateCard, type CardActionState } from "./actions";

const emptyState: CardActionState = {};

export function CardForm({
  organizationId,
  locations,
  card,
  onSuccess,
}: {
  organizationId: string;
  locations: LocationRow[];
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

      {state.error && <p className="text-sm text-accent">{state.error}</p>}
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? "Guardando…" : card ? "Guardar cambios" : "Crear tarjeta"}
      </Button>
    </form>
  );
}
