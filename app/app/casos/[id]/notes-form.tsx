"use client";

import { useActionState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { addCaseNote, type CaseActionState } from "../actions";

const initialState: CaseActionState = {};

export function NotesForm({ caseId }: { caseId: string }) {
  const [state, formAction, pending] = useActionState(addCaseNote, initialState);
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
