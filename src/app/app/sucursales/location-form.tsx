"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LocationRow } from "@/lib/supabase/types";
import { createLocation, updateLocation, type LocationActionState } from "./actions";

const emptyState: LocationActionState = {};

export function LocationForm({
  organizationId,
  location,
  onSuccess,
}: {
  organizationId: string;
  location?: LocationRow;
  onSuccess: () => void;
}) {
  const action = location ? updateLocation : createLocation;
  const [state, formAction, pending] = useActionState(action, emptyState);

  useEffect(() => {
    if (state.success) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="organizationId" value={organizationId} />
      {location && <input type="hidden" name="locationId" value={location.id} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" defaultValue={location?.name} required invalid={!!state.fieldErrors?.name} />
        {state.fieldErrors?.name && <p className="text-xs text-accent">{state.fieldErrors.name}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" name="address" defaultValue={location?.address ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" name="city" defaultValue={location?.city ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">Estado</Label>
          <Input id="state" name="state" defaultValue={location?.state ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={location?.phone ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" defaultValue={location?.email ?? ""} invalid={!!state.fieldErrors?.email} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="googleReviewsUrl">URL de Google Reviews</Label>
          <Input
            id="googleReviewsUrl"
            name="googleReviewsUrl"
            defaultValue={location?.google_reviews_url ?? ""}
            invalid={!!state.fieldErrors?.googleReviewsUrl}
          />
        </div>
      </div>

      {location && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Estado de la sucursal</Label>
          <select
            id="status"
            name="status"
            defaultValue={location.status}
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-foreground"
          >
            <option value="active">Activa</option>
            <option value="inactive">Inactiva</option>
          </select>
        </div>
      )}

      {state.error && <p className="text-sm text-accent">{state.error}</p>}
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? "Guardando…" : location ? "Guardar cambios" : "Crear sucursal"}
      </Button>
    </form>
  );
}
