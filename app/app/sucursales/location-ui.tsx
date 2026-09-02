"use client";

/**
 * Client UI for sucursales, grouped in one file to keep the repo's file
 * count down (used to be location-dialog/location-form/archive-button.tsx).
 */

import { useState, useActionState, useEffect } from "react";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/primitives";
import type { LocationRow } from "@/lib/supabase/types";
import { createLocation, updateLocation, archiveLocation, type LocationActionState } from "./actions";

const emptyState: LocationActionState = {};

function LocationForm({
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
  const [lat, setLat] = useState(location?.latitude != null ? String(location.latitude) : "");
  const [lng, setLng] = useState(location?.longitude != null ? String(location.longitude) : "");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  function captureLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude));
        setLng(String(position.coords.longitude));
        setLocating(false);
      },
      () => {
        setGeoError("No pudimos obtener tu ubicación automáticamente. Puedes escribir las coordenadas manualmente abajo.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

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

      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-2 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">Ubicación GPS</span>
            <span className="text-xs text-muted-foreground">
              Necesaria para validar el check-in de asistencia del personal.
            </span>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={captureLocation} disabled={locating}>
            <MapPin className="size-4" />
            {locating ? "Ubicando…" : "Usar mi ubicación actual"}
          </Button>
        </div>
        {geoError && <p className="text-xs text-accent">{geoError}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="latitude">Latitud</Label>
            <Input
              id="latitude"
              name="latitude"
              type="text"
              inputMode="decimal"
              placeholder="19.43260"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="longitude">Longitud</Label>
            <Input
              id="longitude"
              name="longitude"
              type="text"
              inputMode="decimal"
              placeholder="-99.13320"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="checkinRadiusMeters">Radio permitido para check-in (metros)</Label>
          <Input
            id="checkinRadiusMeters"
            name="checkinRadiusMeters"
            type="number"
            min={20}
            max={2000}
            defaultValue={location?.checkin_radius_meters ?? 150}
            className="max-w-[140px]"
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

      {state.error && (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? "Guardando…" : location ? "Guardar cambios" : "Crear sucursal"}
      </Button>
    </form>
  );
}

export function LocationDialog({
  organizationId,
  location,
}: {
  organizationId: string;
  location?: LocationRow;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {location ? (
          <Button variant="ghost" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Nueva sucursal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{location ? "Editar sucursal" : "Nueva sucursal"}</DialogTitle>
        </DialogHeader>
        <LocationForm organizationId={organizationId} location={location} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function ArchiveLocationButton({
  locationId,
  locationName,
}: {
  locationId: string;
  locationName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-accent hover:text-accent">
          <Trash2 className="size-4" />
          <span className="sr-only">Eliminar {locationName}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar &ldquo;{locationName}&rdquo;?</DialogTitle>
          <DialogDescription>
            La sucursal se archivará y dejará de estar disponible. Esta acción no borra el
            historial asociado.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <form
            action={async (formData) => {
              await archiveLocation(formData);
              setOpen(false);
            }}
          >
            <input type="hidden" name="locationId" value={locationId} />
            <Button type="submit" variant="destructive">
              Eliminar
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
