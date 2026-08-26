"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { GoogleAuthButton } from "@/components/auth/google-button";

const initialState: ActionState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, initialState);

  if (state.success) {
    return (
      <div
        role="status"
        className="rounded-md border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive"
      >
        {state.success}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <GoogleAuthButton />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">o con tu correo</span>
        <Separator className="flex-1" />
      </div>
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required invalid={!!state.fieldErrors?.fullName} />
          {state.fieldErrors?.fullName && <p className="text-xs text-accent">{state.fieldErrors.fullName}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required invalid={!!state.fieldErrors?.email} />
          {state.fieldErrors?.email && <p className="text-xs text-accent">{state.fieldErrors.email}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            invalid={!!state.fieldErrors?.password}
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            Mínimo 10 caracteres, con mayúsculas, minúsculas y números.
          </p>
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
        <div className="flex items-start gap-2.5">
          <Checkbox id="acceptTerms" name="acceptTerms" required />
          <Label htmlFor="acceptTerms" className="text-xs font-normal text-muted-foreground">
            Acepto los{" "}
            <Link href="/legal/terminos" className="underline underline-offset-4">
              términos y condiciones
            </Link>{" "}
            y el{" "}
            <Link href="/legal/privacidad" className="underline underline-offset-4">
              aviso de privacidad
            </Link>
            .
          </Label>
        </div>
        {state.fieldErrors?.acceptTerms && <p className="text-xs text-accent">{state.fieldErrors.acceptTerms}</p>}
        {state.error && (
          <p role="alert" className="text-sm text-accent">
            {state.error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creando cuenta…" : "Crear cuenta gratis"}
        </Button>
      </form>
    </div>
  );
}
