"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { startCheckout, openBillingPortal, type BillingActionState } from "./actions";

const emptyState: BillingActionState = {};

export function CheckoutForm({ planId, cycle, label }: { planId: string; cycle: "monthly" | "yearly"; label: string }) {
  const [state, formAction, pending] = useActionState(startCheckout, emptyState);
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="cycle" value={cycle} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Redirigiendo…" : label}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-accent">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function PortalButton() {
  const [state, formAction, pending] = useActionState(openBillingPortal, emptyState);
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Abriendo…" : "Administrar en el portal de Stripe"}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-accent">
          {state.error}
        </p>
      )}
    </form>
  );
}
