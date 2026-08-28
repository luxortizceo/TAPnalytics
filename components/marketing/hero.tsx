import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-positive" aria-hidden />
            NFC + IA para experiencia de cliente
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Convierte cada tap en una decisión inteligente.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Captura la experiencia de tus clientes, detecta problemas antes de que se conviertan
            en malas reseñas y mejora cada sucursal con datos accionables.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/registro">Comenzar prueba gratuita</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/demo">Solicitar demostración</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sin tarjeta de crédito · Configura tu primera sucursal en minutos
          </p>
        </div>

        <div className="relative">
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <span className="text-sm font-medium text-muted-foreground">Café Racing — Sucursal Centro</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-positive">
                <span className="size-1.5 rounded-full bg-positive" aria-hidden />
                Tarjeta activa
              </span>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-4">
              {[
                { label: "Taps hoy", value: "184" },
                { label: "Encuestas", value: "121" },
                { label: "Satisfacción", value: "87%" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tracking-tight">{stat.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-col gap-2">
              {[
                { label: "Tiempo de espera", pct: 62, tone: "accent" as const },
                { label: "Amabilidad del personal", pct: 91, tone: "positive" as const },
                { label: "Limpieza", pct: 78, tone: "positive" as const },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-xs text-muted-foreground">{row.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full ${row.tone === "accent" ? "bg-accent" : "bg-positive"}`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Vista ilustrativa del dashboard — datos de ejemplo
          </p>
        </div>
      </div>
    </section>
  );
}
