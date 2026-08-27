"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RECOMMENDATION_STATUS_LABELS, CORRECTIVE_ACTION_STATUS_LABELS } from "@/lib/labels";
import type { CorrectiveActionStatus, RecommendationStatus } from "@/lib/supabase/types";
import {
  refreshInsights,
  updateRecommendationStatus,
  updateCorrectiveActionStatus,
  createCorrectiveAction,
  type CorrectiveActionFormState,
} from "./actions";

export function RefreshInsightsButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await refreshInsights();
            setMessage(
              result.error
                ? result.error
                : result.created
                  ? `${result.created} hallazgo(s) nuevo(s).`
                  : "Sin hallazgos nuevos por ahora."
            );
          })
        }
      >
        {pending ? "Analizando…" : "Analizar ahora"}
      </Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

export function RecommendationStatusSelect({
  id,
  value,
}: {
  id: string;
  value: RecommendationStatus;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(v) => startTransition(() => void updateRecommendationStatus(id, v as RecommendationStatus))}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(RECOMMENDATION_STATUS_LABELS) as RecommendationStatus[]).map((s) => (
          <SelectItem key={s} value={s}>
            {RECOMMENDATION_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CorrectiveActionStatusSelect({
  id,
  value,
}: {
  id: string;
  value: CorrectiveActionStatus;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(v) =>
        startTransition(() => void updateCorrectiveActionStatus(id, v as CorrectiveActionStatus))
      }
    >
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(CORRECTIVE_ACTION_STATUS_LABELS) as CorrectiveActionStatus[]).map((s) => (
          <SelectItem key={s} value={s}>
            {CORRECTIVE_ACTION_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const emptyState: CorrectiveActionFormState = {};

export function CorrectiveActionForm({ recommendationId }: { recommendationId: string }) {
  const [state, formAction, pending] = useActionState(createCorrectiveAction, emptyState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2 pt-1">
      <input type="hidden" name="recommendationId" value={recommendationId} />
      <Input name="title" placeholder="Nueva acción correctiva…" className="w-56" required />
      <Input name="dueDate" type="date" className="w-40" />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {pending ? "Guardando…" : "Agregar"}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-accent">
          {state.error}
        </p>
      )}
    </form>
  );
}
