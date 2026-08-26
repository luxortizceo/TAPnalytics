import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col justify-between p-8 lg:p-12">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          TAP<span className="text-accent">nalytics</span>
        </Link>
        <main id="main-content" className="mx-auto w-full max-w-sm py-12">
          {children}
        </main>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} TAPnalytics. Todos los derechos reservados.
        </p>
      </div>
      <div className="relative hidden overflow-hidden border-l border-border bg-surface lg:block">
        <div className="absolute inset-0 flex flex-col justify-center gap-6 p-16">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-positive">
            <span className="size-1.5 rounded-full bg-positive" aria-hidden />
            Conexión NFC activa
          </span>
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-foreground">
            Convierte cada tap en una decisión inteligente.
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Captura la experiencia de tus clientes, detecta problemas antes de que se conviertan
            en malas reseñas y mejora cada sucursal con datos accionables.
          </p>
        </div>
      </div>
    </div>
  );
}
