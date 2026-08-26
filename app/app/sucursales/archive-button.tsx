"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { archiveLocation } from "./actions";

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
