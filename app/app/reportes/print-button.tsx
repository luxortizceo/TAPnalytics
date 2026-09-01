"use client";

import { Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// Both actions open the same native print dialog — that's genuinely how
// "save as PDF" works in every browser (it's one of the printer
// destinations offered there). Two buttons instead of one so it's obvious
// at a glance which flow to start, since a single combined label reads as
// one action when it's really two intents.
export function PrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      <Printer className="size-4" />
      Imprimir
    </Button>
  );
}

export function SavePdfButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      <FileDown className="size-4" />
      Guardar como PDF
    </Button>
  );
}
