"use client";

import { useActionState, useState, startTransition } from "react";
import { LogIn, LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { checkIn, checkOut, type AttendanceActionState } from "./actions";

const initialState: AttendanceActionState = {};

export function CheckinWidget({
  openRecord,
}: {
  openRecord: { checkedInAt: string; status: "on_time" | "late" } | null;
}) {
  const [checkInState, checkInAction, checkInPending] = useActionState(checkIn, initialState);
  const [checkOutState, checkOutAction, checkOutPending] = useActionState(checkOut, initialState);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  function handleCheckIn() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const formData = new FormData();
        formData.set("lat", String(position.coords.latitude));
        formData.set("lng", String(position.coords.longitude));
        // getCurrentPosition's callback runs outside any React event handler,
        // so the useActionState dispatch needs an explicit transition —
        // without this, isPending silently stops updating.
        startTransition(() => {
          checkInAction(formData);
        });
      },
      () => {
        setLocating(false);
        setGeoError("No pudimos obtener tu ubicación. Revisa los permisos de ubicación del navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const pending = checkInPending || checkOutPending || locating;

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface p-8 text-center">
      {openRecord ? (
        <>
          <Badge variant={openRecord.status === "late" ? "warning" : "positive"}>
            {openRecord.status === "late" ? "Llegaste tarde" : "A tiempo"}
          </Badge>
          <p className="text-sm text-muted-foreground">
            Entrada registrada a las{" "}
            {new Date(openRecord.checkedInAt).toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <Button
            size="lg"
            onClick={() => startTransition(() => checkOutAction())}
            disabled={pending}
            className="w-full max-w-xs"
          >
            <LogOut className="size-5" />
            {checkOutPending ? "Registrando…" : "Marcar salida"}
          </Button>
        </>
      ) : (
        <>
          <MapPin className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Marca tu entrada al llegar a la sucursal. Necesitamos tu ubicación para confirmarlo.
          </p>
          <Button size="lg" onClick={handleCheckIn} disabled={pending} className="w-full max-w-xs">
            <LogIn className="size-5" />
            {locating ? "Ubicando…" : checkInPending ? "Registrando…" : "Marcar entrada"}
          </Button>
        </>
      )}

      {geoError && (
        <p role="alert" className="text-sm text-accent">
          {geoError}
        </p>
      )}
      {checkInState.error && (
        <p role="alert" className="text-sm text-accent">
          {checkInState.error}
        </p>
      )}
      {checkInState.success && typeof checkInState.success === "string" && (
        <p className="text-sm text-positive">{checkInState.success}</p>
      )}
      {checkOutState.error && (
        <p role="alert" className="text-sm text-accent">
          {checkOutState.error}
        </p>
      )}
      {checkOutState.success && typeof checkOutState.success === "string" && (
        <p className="text-sm text-positive">{checkOutState.success}</p>
      )}
    </div>
  );
}
