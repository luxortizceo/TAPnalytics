"use client";

/**
 * Client UI for the case detail page, grouped in one file to keep the
 * repo's file count down (used to be case-controls.tsx + notes-form.tsx).
 */

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER, URGENCY_LABELS } from "@/lib/labels";
import type { CaseStatus, UrgencyLevel } from "@/lib/supabase/types";
import { updateCaseStatus, updateCaseUrgency, assignCase, addCaseNote, type CaseActionState } from "../actions";

export function StatusSelect({ caseId, value }: { caseId: string; value: CaseStatus }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(v) => startTransition(() => void updateCaseStatus(caseId, v as CaseStatus))}
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CASE_STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {CASE_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function UrgencySelect({ caseId, value }: { caseId: string; value: UrgencyLevel }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(v) => startTransition(() => void updateCaseUrgency(caseId, v as UrgencyLevel))}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(URGENCY_LABELS) as UrgencyLevel[]).map((u) => (
          <SelectItem key={u} value={u}>
            {URGENCY_LABELS[u]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AssignSelect({
  caseId,
  value,
  members,
}: {
  caseId: string;
  value: string | null;
  members: { userId: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={value ?? "unassigned"}
      disabled={pending}
      onValueChange={(v) => startTransition(() => void assignCase(caseId, v === "unassigned" ? null : v))}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Sin asignar" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Sin asignar</SelectItem>
        {members.map((m) => (
          <SelectItem key={m.userId} value={m.userId}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const emptyNoteState: CaseActionState = {};

export function NotesForm({ caseId }: { caseId: string }) {
  const [state, formAction, pending] = useActionState(addCaseNote, emptyNoteState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="caseId" value={caseId} />
      <Textarea name="note" placeholder="Agrega una nota interna…" rows={3} required />
      {state.error && <p className="text-xs text-accent">{state.error}</p>}
      <Button type="submit" size="sm" className="w-fit" disabled={pending}>
        {pending ? "Guardando…" : "Agregar nota"}
      </Button>
    </form>
  );
}
