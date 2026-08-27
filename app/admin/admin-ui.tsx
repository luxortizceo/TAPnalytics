"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORG_STATUS_LABELS } from "@/lib/labels";
import type { OrgStatus, PlanRow } from "@/lib/supabase/types";
import {
  updateOrganizationPlan,
  updateOrganizationStatus,
  createPlan,
  togglePlanActive,
  updatePlanPricing,
  type AdminActionState,
} from "./actions";

export function OrgPlanSelect({
  organizationId,
  value,
  plans,
}: {
  organizationId: string;
  value: string | null;
  plans: PlanRow[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={value ?? undefined}
      disabled={pending}
      onValueChange={(v) => startTransition(() => void updateOrganizationPlan(organizationId, v))}
    >
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Sin plan" />
      </SelectTrigger>
      <SelectContent>
        {plans.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function OrgStatusSelect({ organizationId, value }: { organizationId: string; value: OrgStatus }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(v) => startTransition(() => void updateOrganizationStatus(organizationId, v as OrgStatus))}
    >
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ORG_STATUS_LABELS) as OrgStatus[]).map((s) => (
          <SelectItem key={s} value={s}>
            {ORG_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const emptyState: AdminActionState = {};

export function CreatePlanForm() {
  const [state, formAction, pending] = useActionState(createPlan, emptyState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Código</label>
        <Input name="code" placeholder="starter" className="w-32" required />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Nombre</label>
        <Input name="name" placeholder="Starter" className="w-40" required />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Precio mensual (MXN)</label>
        <Input name="priceMonthly" type="number" step="0.01" className="w-32" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear plan"}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-accent">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function PlanActiveSwitch({ planId, isActive }: { planId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={isActive}
      disabled={pending}
      onCheckedChange={(checked) => startTransition(() => void togglePlanActive(planId, checked))}
    />
  );
}

export function PlanPricingForm({ plan }: { plan: PlanRow }) {
  const [state, formAction, pending] = useActionState(updatePlanPricing, emptyState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
      <input type="hidden" name="planId" value={plan.id} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Mensual</label>
        <Input name="priceMonthly" type="number" step="0.01" defaultValue={plan.price_monthly ?? ""} className="w-28" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Anual</label>
        <Input name="priceYearly" type="number" step="0.01" defaultValue={plan.price_yearly ?? ""} className="w-28" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Stripe Price (mensual)</label>
        <Input name="stripePriceIdMonthly" defaultValue={plan.stripe_price_id_monthly ?? ""} className="w-44" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Stripe Price (anual)</label>
        <Input name="stripePriceIdYearly" defaultValue={plan.stripe_price_id_yearly ?? ""} className="w-44" />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-accent">
          {state.error}
        </p>
      )}
    </form>
  );
}
