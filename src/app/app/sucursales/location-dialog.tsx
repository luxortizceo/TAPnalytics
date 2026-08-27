"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { LocationRow } from "@/lib/supabase/types";
import { LocationForm } from "./location-form";

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
