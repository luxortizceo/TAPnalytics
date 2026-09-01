import { Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintTriggerButton } from "./print-trigger-button";

export function PrintButton() {
  return (
    <PrintTriggerButton>
      <Printer className="size-4" />
      Imprimir
    </PrintTriggerButton>
  );
}

// A real download, not window.print() — on mobile that just opens the OS
// print sheet with no obvious "just give me the file" option. This links
// straight to a route that renders the report in a headless browser and
// returns an actual .pdf, so the browser's native download handling takes
// over (no JS, no blob juggling — Content-Disposition does the rest).
export function SavePdfButton({ exportParams }: { exportParams: string }) {
  return (
    <Button asChild variant="secondary">
      <a href={`/app/reportes/export/pdf?${exportParams}`}>
        <FileDown className="size-4" />
        Guardar como PDF
      </a>
    </Button>
  );
}
