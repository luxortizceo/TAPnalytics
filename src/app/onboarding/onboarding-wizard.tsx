"use client";

import { Progress, Label, Textarea } from "@/components/ui/primitives";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SECTORS } from "@/lib/validations/organization";
import type { LocationRow, OrganizationRow } from "@/lib/supabase/types";
import {
  createOrganizationAction,
  createLocationAction,
  updateBrandingAction,
  updateLandingAction,
  createFirstCardAction,
  finishOnboardingAction,
  type OnboardingState,
} from "./actions";

const STEPS = [
  { key: "company", label: "Empresa" },
  { key: "location", label: "Sucursal" },
  { key: "branding", label: "Marca" },
  { key: "landing", label: "Landing" },
  { key: "card", label: "Tarjeta NFC" },
  { key: "test", label: "Listo" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const emptyState: OnboardingState = {};

export function OnboardingWizard({
  organization,
  location,
  userFullName,
}: {
  organization: OrganizationRow | null;
  location: LocationRow | null;
  userFullName: string;
}) {
  const initialStep = (organization?.onboarding_step as StepKey) || "company";
  const initialIndex = Math.max(
    STEPS.findIndex((s) => s.key === initialStep),
    0
  );

  const [stepIndex, setStepIndex] = useState(initialIndex);
  const [organizationId, setOrganizationId] = useState(organization?.id ?? "");
  const [locationId, setLocationId] = useState(location?.id ?? "");
  const [publicCode, setPublicCode] = useState("");

  const step = STEPS[stepIndex].key;
  const progressPct = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  function advance(state: OnboardingState) {
    if (state.organizationId) setOrganizationId(state.organizationId);
    if (state.locationId) setLocationId(state.locationId);
    if (state.publicCode) setPublicCode(state.publicCode);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  return (
    <div>
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Paso {stepIndex + 1} de {STEPS.length} · {STEPS[stepIndex].label}
          </span>
          <span>{progressPct}%</span>
        </div>
        <Progress value={progressPct} aria-label="Progreso del onboarding" />
      </div>

      {step === "company" && <CompanyStep defaultName={userFullName ? `Negocio de ${userFullName}` : ""} onDone={advance} />}
      {step === "location" && <LocationStep organizationId={organizationId} onDone={advance} />}
      {step === "branding" && <BrandingStep organizationId={organizationId} onDone={advance} />}
      {step === "landing" && (
        <LandingStep organizationId={organizationId} locationId={locationId} onDone={advance} />
      )}
      {step === "card" && (
        <CardStep organizationId={organizationId} locationId={locationId} onDone={advance} />
      )}
      {step === "test" && <TestStep publicCode={publicCode} />}
    </div>
  );
}

function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function CompanyStep({
  defaultName,
  onDone,
}: {
  defaultName: string;
  onDone: (s: OnboardingState) => void;
}) {
  const [state, formAction, pending] = useActionState(createOrganizationAction, emptyState);

  useEffect(() => {
    if (state.success) onDone(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <StepShell title="Registra tu empresa" description="Empecemos con lo básico sobre tu negocio.">
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nombre de la empresa</Label>
          <Input id="name" name="name" defaultValue={defaultName} required invalid={!!state.fieldErrors?.name} />
          {state.fieldErrors?.name && <p className="text-xs text-accent">{state.fieldErrors.name}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sector">Sector</Label>
          <Select name="sector" defaultValue="restaurant">
            <SelectTrigger id="sector">
              <SelectValue placeholder="Elige un sector" />
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
        {state.error && <p className="text-sm text-accent">{state.error}</p>}
        <Button type="submit" className="w-fit" disabled={pending}>
          {pending ? "Guardando…" : "Continuar"}
        </Button>
      </form>
    </StepShell>
  );
}

function LocationStep({
  organizationId,
  onDone,
}: {
  organizationId: string;
  onDone: (s: OnboardingState) => void;
}) {
  const [state, formAction, pending] = useActionState(createLocationAction, emptyState);

  useEffect(() => {
    if (state.success) onDone(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <StepShell title="Crea tu primera sucursal" description="Puedes agregar más sucursales después.">
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="organizationId" value={organizationId} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="loc-name">Nombre de la sucursal</Label>
          <Input id="loc-name" name="name" placeholder="Sucursal Centro" required invalid={!!state.fieldErrors?.name} />
          {state.fieldErrors?.name && <p className="text-xs text-accent">{state.fieldErrors.name}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" name="address" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">Ciudad</Label>
            <Input id="city" name="city" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="state">Estado</Label>
            <Input id="state" name="state" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" type="tel" />
          </div>
        </div>
        {state.error && <p className="text-sm text-accent">{state.error}</p>}
        <Button type="submit" className="w-fit" disabled={pending}>
          {pending ? "Guardando…" : "Continuar"}
        </Button>
      </form>
    </StepShell>
  );
}

function BrandingStep({
  organizationId,
  onDone,
}: {
  organizationId: string;
  onDone: (s: OnboardingState) => void;
}) {
  const [state, formAction, pending] = useActionState(updateBrandingAction, emptyState);

  useEffect(() => {
    if (state.success) onDone(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <StepShell
      title="Logotipo y reseñas de Google"
      description="Estos datos personalizan tu landing y el enlace de reseñas."
    >
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="organizationId" value={organizationId} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="logoUrl">URL del logotipo (opcional)</Label>
          <Input id="logoUrl" name="logoUrl" placeholder="https://…" invalid={!!state.fieldErrors?.logoUrl} />
          {state.fieldErrors?.logoUrl && <p className="text-xs text-accent">{state.fieldErrors.logoUrl}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="googleReviewsUrl">URL de Google Reviews</Label>
          <Input
            id="googleReviewsUrl"
            name="googleReviewsUrl"
            placeholder="https://g.page/r/…"
            invalid={!!state.fieldErrors?.googleReviewsUrl}
          />
          <p className="text-xs text-muted-foreground">
            Se mostrará a todos tus clientes al final de la encuesta, sin importar su calificación.
          </p>
          {state.fieldErrors?.googleReviewsUrl && (
            <p className="text-xs text-accent">{state.fieldErrors.googleReviewsUrl}</p>
          )}
        </div>
        {state.error && <p className="text-sm text-accent">{state.error}</p>}
        <Button type="submit" className="w-fit" disabled={pending}>
          {pending ? "Guardando…" : "Continuar"}
        </Button>
      </form>
    </StepShell>
  );
}

function LandingStep({
  organizationId,
  locationId,
  onDone,
}: {
  organizationId: string;
  locationId: string;
  onDone: (s: OnboardingState) => void;
}) {
  const [state, formAction, pending] = useActionState(updateLandingAction, emptyState);

  useEffect(() => {
    if (state.success) onDone(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <StepShell title="Configura tu landing de encuesta" description="Esto es lo primero que ve tu cliente al hacer tap.">
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="locationId" value={locationId} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="welcomeMessage">Mensaje de bienvenida</Label>
          <Input
            id="welcomeMessage"
            name="welcomeMessage"
            defaultValue="Gracias por visitarnos"
            required
            invalid={!!state.fieldErrors?.welcomeMessage}
          />
          {state.fieldErrors?.welcomeMessage && <p className="text-xs text-accent">{state.fieldErrors.welcomeMessage}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mainQuestion">Pregunta principal</Label>
          <Input id="mainQuestion" name="mainQuestion" defaultValue="¿Cómo fue tu experiencia?" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="thankYouMessage">Mensaje de agradecimiento</Label>
          <Textarea
            id="thankYouMessage"
            name="thankYouMessage"
            defaultValue="Gracias por compartir tu opinión con nosotros."
            required
            invalid={!!state.fieldErrors?.thankYouMessage}
          />
          {state.fieldErrors?.thankYouMessage && (
            <p className="text-xs text-accent">{state.fieldErrors.thankYouMessage}</p>
          )}
        </div>
        {state.error && <p className="text-sm text-accent">{state.error}</p>}
        <Button type="submit" className="w-fit" disabled={pending}>
          {pending ? "Guardando…" : "Continuar"}
        </Button>
      </form>
    </StepShell>
  );
}

function CardStep({
  organizationId,
  locationId,
  onDone,
}: {
  organizationId: string;
  locationId: string;
  onDone: (s: OnboardingState) => void;
}) {
  const [state, formAction, pending] = useActionState(createFirstCardAction, emptyState);

  useEffect(() => {
    if (state.success) onDone(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <StepShell
      title="Crea tu primera tarjeta NFC"
      description="Le asignaremos una URL única y no secuencial. Podrás programar la tarjeta física con este código."
    >
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="locationId" value={locationId} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="alias">Alias de la tarjeta</Label>
          <Input id="alias" name="alias" placeholder="Recepción, Mesa 1, Caja…" defaultValue="Recepción" />
        </div>
        {state.error && <p className="text-sm text-accent">{state.error}</p>}
        <Button type="submit" className="w-fit" disabled={pending}>
          {pending ? "Creando tarjeta…" : "Crear tarjeta"}
        </Button>
      </form>
    </StepShell>
  );
}

function TestStep({ publicCode }: { publicCode: string }) {
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const url = publicCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/t/${publicCode}`
    : "";

  async function handleFinish() {
    setFinishing(true);
    await finishOnboardingAction();
    router.push("/app/dashboard");
  }

  return (
    <StepShell title="Prueba tu enlace" description="Esta es la URL real que llevará tu tarjeta física — pruébala.">
      <div className="rounded-md border border-border bg-surface-2 p-4">
        <p className="font-mono text-sm text-foreground">{url || "Generando…"}</p>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
        >
          Abrir la encuesta como la vería un cliente
        </a>
      )}
      <div className="flex gap-3">
        <Button onClick={handleFinish} disabled={finishing}>
          {finishing ? "Entrando…" : "Ir a mi panel"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/app/tarjetas">Ver mis tarjetas</Link>
        </Button>
      </div>
    </StepShell>
  );
}
