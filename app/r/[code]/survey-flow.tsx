"use client";

import { Textarea, Label, Checkbox } from "@/components/ui/primitives";
import { useState, useTransition } from "react";
import { Frown, Meh, Smile, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SurveyCard, SurveyCategory } from "@/lib/data/survey";
import type { ExperienceRating, FeedbackSessionStatus } from "@/lib/supabase/types";
import { setRating, submitFeedback, markReviewOpened } from "./actions";

type Step = "rating" | "details" | "thanks";

const RATING_OPTIONS: {
  value: ExperienceRating;
  label: string;
  icon: typeof Frown;
  tone: string;
}[] = [
  { value: "bad", label: "Mala", icon: Frown, tone: "border-accent/40 hover:bg-accent/10" },
  { value: "good", label: "Buena", icon: Meh, tone: "border-border hover:bg-surface-2" },
  { value: "excellent", label: "Excelente", icon: Smile, tone: "border-positive/40 hover:bg-positive/10" },
];

const URGENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica — requiere atención inmediata" },
];

export function SurveyFlow({
  code,
  card,
  categories,
  initialStatus,
  initialRating,
}: {
  code: string;
  card: SurveyCard;
  categories: SurveyCategory[];
  initialStatus: FeedbackSessionStatus;
  initialRating: ExperienceRating | null;
}) {
  const [step, setStep] = useState<Step>(
    initialStatus === "completed" ? "thanks" : initialRating ? "details" : "rating"
  );
  const [rating, setLocalRating] = useState<ExperienceRating | null>(initialRating);
  const [pending, startTransition] = useTransition();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [wantsContact, setWantsContact] = useState(false);

  function chooseRating(value: ExperienceRating) {
    setLocalRating(value);
    startTransition(async () => {
      await setRating(code, value);
      setStep("details");
    });
  }

  async function handleReviewClick() {
    await markReviewOpened(code);
  }

  const relevantCategories = categories.filter((c) =>
    rating === "bad" ? c.kind === "negative" : c.kind === "positive"
  );

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        {card.logoUrl ? (
          // A business-supplied logo from an arbitrary URL — next/image
          // would need every possible domain allowlisted ahead of time, so
          // this stays a plain <img>. Explicit width/height reserve the
          // layout box before the image loads, avoiding a layout shift
          // (CLS) on this route's most important metric: how fast the
          // rating buttons below become usable.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.logoUrl}
            alt={card.organizationName}
            width={160}
            height={48}
            className="mb-4 h-12 w-auto object-contain"
          />
        ) : (
          <span className="mb-4 text-lg font-semibold tracking-tight">{card.organizationName}</span>
        )}
        <p className="text-xs text-muted-foreground">{card.locationName}</p>
      </div>

      {step === "rating" && (
        <div className="flex flex-col items-center gap-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{card.landing.welcomeMessage}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{card.landing.mainQuestion}</h1>
          </div>
          <div className="grid w-full grid-cols-3 gap-3">
            {RATING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={pending}
                onClick={() => chooseRating(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border bg-surface px-3 py-6 text-sm font-medium transition-colors disabled:opacity-50",
                  opt.tone
                )}
              >
                <opt.icon className="size-8" aria-hidden />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "details" && rating && (
        <FeedbackForm
          code={code}
          rating={rating}
          categories={relevantCategories}
          selectedCategories={selectedCategories}
          onToggleCategory={(id) =>
            setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
          }
          wantsContact={wantsContact}
          onWantsContactChange={setWantsContact}
          onDone={() => setStep("thanks")}
        />
      )}

      {step === "thanks" && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-full border-2 border-positive text-positive">
            <Smile className="size-8" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold">¡Listo!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu opinión fue registrada. {card.landing.thankYouMessage}
            </p>
          </div>
          {card.googleReviewsUrl && (
            <a
              href={card.googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleReviewClick}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-5 py-3 text-sm font-medium text-foreground hover:bg-surface-2"
            >
              Dejar una reseña en Google
              <ExternalLink className="size-4" />
            </a>
          )}
          <p className="text-xs text-muted-foreground">Ya puedes cerrar esta ventana.</p>
        </div>
      )}
    </div>
  );
}

function FeedbackForm({
  code,
  rating,
  categories,
  selectedCategories,
  onToggleCategory,
  wantsContact,
  onWantsContactChange,
  onDone,
}: {
  code: string;
  rating: ExperienceRating;
  categories: SurveyCategory[];
  selectedCategories: string[];
  onToggleCategory: (id: string) => void;
  wantsContact: boolean;
  onWantsContactChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const questionLabel =
    rating === "bad"
      ? "¿Qué ocurrió?"
      : rating === "good"
        ? "¿Qué estuvo bien?"
        : "¿Qué fue lo que más te gustó?";

  const categoriesLabel = rating === "bad" ? "¿Qué categoría describe mejor el problema?" : "¿Qué destacarías?";

  async function handleSubmit(formData: FormData) {
    setError(null);
    selectedCategories.forEach((id) => formData.append("categories", id));
    startTransition(async () => {
      const result = await submitFeedback(code, formData);
      if (result.success) {
        onDone();
      } else {
        setError(result.error ?? "No pudimos guardar tu respuesta.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="answerText">{questionLabel}</Label>
        <Textarea id="answerText" name="answerText" rows={4} placeholder="Cuéntanos con tus palabras…" />
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>{categoriesLabel}</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleCategory(cat.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface text-muted-foreground hover:bg-surface-2"
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {rating === "bad" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="urgency">Nivel de urgencia</Label>
          <select
            id="urgency"
            name="urgency"
            defaultValue="medium"
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-foreground"
          >
            {URGENCY_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {rating === "bad" && (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="wantsContact"
              name="wantsContact"
              checked={wantsContact}
              onCheckedChange={(v) => onWantsContactChange(v === true)}
            />
            <Label htmlFor="wantsContact" className="font-normal">
              Quiero que el establecimiento me contacte
            </Label>
          </div>
          {wantsContact && (
            <div className="flex flex-col gap-3">
              <Input name="contactName" placeholder="Tu nombre" autoComplete="name" />
              <Input name="contactEmail" type="email" placeholder="Correo (opcional)" autoComplete="email" />
              <Input name="contactPhone" type="tel" placeholder="Teléfono (opcional)" autoComplete="tel" />
              <div className="flex items-start gap-2.5">
                <Checkbox id="consentContact" name="consentContact" required />
                <Label htmlFor="consentContact" className="text-xs font-normal text-muted-foreground">
                  Acepto que el establecimiento use estos datos únicamente para dar seguimiento a mi
                  comentario.
                </Label>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Enviando…" : "Enviar"}
      </Button>
    </form>
  );
}
