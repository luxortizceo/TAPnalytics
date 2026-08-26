"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SECTORS } from "@/lib/validations/organization";
import type { OrganizationRow } from "@/lib/supabase/types";
import { updateOrganizationSettings, type SettingsState } from "./actions";

const initialState: SettingsState = {};

export function SettingsForm({
  organization,
  editable,
}: {
  organization: OrganizationRow;
  editable: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateOrganizationSettings, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="organizationId" value={organization.id} />
      <fieldset disabled={!editable} className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre de la empresa</Label>
            <Input id="name" name="name" defaultValue={organization.name} required invalid={!!state.fieldErrors?.name} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sector">Sector</Label>
            <Select name="sector" defaultValue={organization.sector}>
              <SelectTrigger id="sector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="logoUrl">URL del logotipo</Label>
            <Input id="logoUrl" name="logoUrl" defaultValue={organization.logo_url ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="googleReviewsUrl">URL de Google Reviews</Label>
            <Input id="googleReviewsUrl" name="googleReviewsUrl" defaultValue={organization.google_reviews_url ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="timezone">Zona horaria</Label>
            <Input id="timezone" name="timezone" defaultValue={organization.timezone} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency">Moneda</Label>
            <Input id="currency" name="currency" defaultValue={organization.currency} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="language">Idioma</Label>
            <Input id="language" name="language" defaultValue={organization.language} required />
          </div>
        </div>
        {state.error && <p className="text-sm text-accent">{state.error}</p>}
        {state.success && <p className="text-sm text-positive">{state.success}</p>}
        {editable && (
          <Button type="submit" className="w-fit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        )}
      </fieldset>
    </form>
  );
}
