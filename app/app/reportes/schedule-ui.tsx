"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportScheduleRow } from "@/lib/supabase/types";
import {
  createReportSchedule,
  toggleReportSchedule,
  deleteReportSchedule,
  type ScheduleActionState,
} from "./actions";

const FREQUENCY_LABELS = { daily: "Diario", weekly: "Semanal", monthly: "Mensual" } as const;

const emptyState: ScheduleActionState = {};

export function CreateScheduleForm() {
  const [state, formAction, pending] = useActionState(createReportSchedule, emptyState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Frecuencia</label>
        <Select name="frequency" defaultValue="weekly">
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Diario</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="monthly">Mensual</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Formato</label>
        <Select name="format" defaultValue="pdf">
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="xlsx">Excel</SelectItem>
            <SelectItem value="csv">CSV</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Destinatarios (separados por coma)</label>
        <Input name="recipients" placeholder="correo@empresa.com" className="w-64" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Programar"}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-accent">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function ScheduleList({ schedules }: { schedules: ReportScheduleRow[] }) {
  const [pending, startTransition] = useTransition();

  if (schedules.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin reportes programados todavía.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {schedules.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
          <div>
            <p className="text-sm text-foreground">
              {FREQUENCY_LABELS[s.frequency]} · {s.format.toUpperCase()}
            </p>
            <p className="text-xs text-muted-foreground">
              {s.recipients.join(", ")}
              {s.next_run_at && ` · próximo envío ${new Date(s.next_run_at).toLocaleDateString("es-MX")}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={s.is_active}
              disabled={pending}
              onCheckedChange={(checked) => startTransition(() => void toggleReportSchedule(s.id, checked))}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => startTransition(() => void deleteReportSchedule(s.id))}
            >
              Eliminar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
