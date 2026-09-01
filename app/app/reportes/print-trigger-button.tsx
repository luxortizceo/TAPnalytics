"use client";

import { Button } from "@/components/ui/button";

export function PrintTriggerButton({ children }: { children: React.ReactNode }) {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      {children}
    </Button>
  );
}
