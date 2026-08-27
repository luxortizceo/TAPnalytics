"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "El cliente acerca su teléfono",
    detail: "La tarjeta NFC abre una URL única y segura, sin apps ni fricción.",
  },
  {
    title: "TAPnalytics valida la tarjeta",
    detail: "Se identifica la empresa, la sucursal y el punto de contacto exacto.",
  },
  {
    title: "Se registra el tap y abre la landing",
    detail: "Landing personalizada, ligera y lista en menos de un segundo.",
  },
  {
    title: "El cliente califica su experiencia",
    detail: '"¿Cómo fue tu experiencia?" — Mala, Buena o Excelente.',
  },
  {
    title: "Se detecta y se actúa",
    detail: "Alertas automáticas y casos accionables si algo salió mal.",
  },
];

export function TapJourney() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="producto" className="border-b border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">El recorrido de un tap</h2>
          <p className="mt-3 text-muted-foreground">
            De una tarjeta física a una decisión operativa, en segundos.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <ol className="flex flex-col gap-2" aria-label="Pasos del recorrido de un tap">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={active === i ? "step" : undefined}
                  className={cn(
                    "flex w-full items-start gap-4 rounded-md border px-4 py-3 text-left transition-colors",
                    active === i
                      ? "border-accent/40 bg-surface"
                      : "border-transparent hover:bg-surface"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      active === i ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">{step.title}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{step.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="rounded-lg border border-border bg-surface p-8">
            <div className="mx-auto flex max-w-xs flex-col items-center gap-6 text-center">
              <div
                className={cn(
                  "flex size-24 items-center justify-center rounded-full border-2 transition-colors",
                  active >= 1 ? "border-positive text-positive" : "border-border text-muted-foreground"
                )}
                aria-hidden
              >
                <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6.5 9.5a7 7 0 0 1 11 0M4 6.5a11 11 0 0 1 16 0M9 12.8a3 3 0 0 1 6 0" strokeLinecap="round" />
                  <circle cx="12" cy="17" r="1.4" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">{STEPS[active].title}</p>
              <p className="text-sm text-muted-foreground">{STEPS[active].detail}</p>
              <div className="flex gap-1.5" aria-hidden>
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 w-6 rounded-full transition-colors",
                      i === active ? "bg-accent" : "bg-surface-2"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
