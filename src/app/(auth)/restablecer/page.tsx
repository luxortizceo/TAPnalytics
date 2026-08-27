"use client";

import { useActionState } from "react";
import { resetPassword, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Elige una nueva contraseña</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Este enlace es de un solo uso y expira por seguridad.
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            invalid={!!state.fieldErrors?.password}
          />
          {state.fieldErrors?.password && <p className="text-xs text-accent">{state.fieldErrors.password}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirma tu contraseña</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            invalid={!!state.fieldErrors?.confirmPassword}
          />
          {state.fieldErrors?.confirmPassword && (
            <p className="text-xs text-accent">{state.fieldErrors.confirmPassword}</p>
          )}
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-accent">
            {state.error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Actualizando…" : "Actualizar contraseña"}
        </Button>
      </form>
    </div>
  );
}
