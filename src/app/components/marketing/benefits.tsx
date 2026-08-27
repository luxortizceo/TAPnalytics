const BENEFITS = [
  {
    title: "Detecta antes de que escale",
    detail: "Identifica problemas operativos recurrentes antes de que lleguen a una reseña pública.",
  },
  {
    title: "Decisiones con evidencia",
    detail: "Cada recomendación muestra el periodo analizado, la muestra y el nivel de confianza.",
  },
  {
    title: "Aislamiento total por empresa",
    detail: "Arquitectura multitenant con seguridad a nivel de base de datos, no solo de interfaz.",
  },
  {
    title: "Sin fricción para el cliente",
    detail: "Un tap, una pregunta, listo. Sin apps, sin registros, sin cuentas.",
  },
];

export function Benefits() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
          Menos reseñas negativas. Más operación bajo control.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="bg-surface p-6">
              <h3 className="text-sm font-semibold text-foreground">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
