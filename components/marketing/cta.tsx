import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section>
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 rounded-lg border border-border bg-surface p-10 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Empieza a escuchar a tus clientes hoy
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Crea tu cuenta, registra tu primera sucursal y activa tu primera tarjeta NFC en
              minutos.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/registro">Comenzar prueba gratuita</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/demo">Solicitar demostración</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
