import { DemoForm } from "./demo-form";

export const metadata = { title: "Solicitar demostración" };

export default function DemoPage() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Agenda una demostración
        </h1>
        <p className="mt-4 text-muted-foreground">
          Un miembro de nuestro equipo te mostrará cómo TAPnalytics se adapta al giro de tu
          negocio.
        </p>
        <div className="mt-10 rounded-lg border border-border bg-surface p-8">
          <DemoForm />
        </div>
      </div>
    </section>
  );
}
