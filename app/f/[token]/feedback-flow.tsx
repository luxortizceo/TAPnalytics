"use client";

import { useState, useTransition } from "react";
import { Frown, Meh, Smile } from "lucide-react";
import { Textarea, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExperienceRating } from "@/lib/supabase/types";
import { submitResolutionFeedback } from "./actions";

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

type Step = "rating" | "comment" | "thanks";

export function ResolutionFeedbackFlow({
  token,
  organizationName,
  folio,
  contactFirstName,
  initialRating,
}: {
  token: string;
  organizationName: string;
  folio: string;
  contactFirstName: string | null;
  initialRating: ExperienceRating | null;
}) {
  const [step, setStep] = useState<Step>(initialRating ? "comment" : "rating");
  const [rating, setRating] = useState<ExperienceRating | null>(initialRating);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function chooseRating(value: ExperienceRating) {
    setRating(value);
    setStep("comment");
  }

  function submit(comment: string) {
    if (!rating) return;
    setError(null);
    startTransition(async () => {
      const result = await submitResolutionFeedback(token, rating, comment);
      if (result.success) setStep("thanks");
      else setError(result.error ?? "No pudimos guardar tu respuesta.");
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="mb-4 text-lg font-semibold tracking-tight">{organizationName}</span>
        <p className="text-xs text-muted-foreground">Caso {folio}</p>
      </div>

      {step === "rating" && (
        <div className="flex flex-col items-center gap-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {contactFirstName ? `Hola ${contactFirstName},` : "Hola,"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Ya dimos seguimiento a lo que reportaste. ¿Qué tan satisfecho quedaste con la solución?
            </h1>
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

      {step === "comment" && rating && (
        <CommentForm
          rating={rating}
          pending={pending}
          error={error}
          onSubmit={submit}
          onSkip={() => submit("")}
          onChangeRating={() => setStep("rating")}
        />
      )}

      {step === "thanks" && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-full border-2 border-positive text-positive">
            <Smile className="size-8" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold">¡Gracias!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Tu respuesta fue registrada.</p>
          </div>
          <p className="text-xs text-muted-foreground">Ya puedes cerrar esta ventana.</p>
        </div>
      )}
    </div>
  );
}

function CommentForm({
  rating,
  pending,
  error,
  onSubmit,
  onSkip,
  onChangeRating,
}: {
  rating: ExperienceRating;
  pending: boolean;
  error: string | null;
  onSubmit: (comment: string) => void;
  onSkip: () => void;
  onChangeRating: () => void;
}) {
  const [comment, setComment] = useState("");
  const selected = RATING_OPTIONS.find((o) => o.value === rating)!;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <selected.icon className="size-5" aria-hidden />
          Tu calificación: <span className="font-medium">{selected.label}</span>
        </div>
        <button
          type="button"
          onClick={onChangeRating}
          disabled={pending}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
        >
          Cambiar
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="comment">¿Algo que quieras agregar? (opcional)</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Cuéntanos con tus palabras…"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" disabled={pending} onClick={onSkip}>
          Omitir
        </Button>
        <Button type="button" className="flex-1" disabled={pending} onClick={() => onSubmit(comment)}>
          {pending ? "Enviando…" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
