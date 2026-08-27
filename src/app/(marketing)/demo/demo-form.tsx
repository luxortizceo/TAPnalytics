"use client";

import { useActionState } from "react";
import { requestDemo, type DemoRequestState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: DemoRequestState = {};

export function DemoForm() {
  const [state, formAction, pending] = useActionState(requestDemo, initialState);

  if (state.success) {
    return (
      <div role="status" className="rounded-lg border border-positive/30 bg-positive/10 p-6 text-sm text-positive">
        {state.success}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" name="fullName" required invalid={!!state.fieldErrors?.fullName} />
          {state.fieldErrors?.fullName && <p className="text-xs text-accent">{state.fieldErrors.fullName}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company">Empresa</Label>
          <Input id="company" name="company" required invalid={!!state.fieldErrors?.company} />
          {state.fieldErrors?.company && <p className="text-xs text-accent">{state.fieldErrors.company}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo de trabajo</Label>
          <Input id="email" name="email" type="email" required invalid={!!state.fieldErrors?.email} />
          {state.fieldErrors?.email && <p className="text-xs text-accent">{state.fieldErrors.email}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Teléfono (opcional)</Label>
          <Input id="phone" name="phone" type="tel" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">Cuéntanos sobre tu negocio (opcional)</Label>
        <Textarea id="message" name="message" rows={4} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-fit" disabled={pending}>
        {pending ? "Enviando…" : "Solicitar demostración"}
      </Button>
    </form>
  );
}
