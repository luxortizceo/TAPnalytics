const FEATURES = [
  { title: "Tarjetas NFC administrables", detail: "Alias, ubicación, estado y URL única por tarjeta, con historial de cambios." },
  { title: "Encuestas de 3 taps", detail: "Mala, Buena, Excelente — con un formulario dinámico según la respuesta." },
  { title: "Centro de casos", detail: "Convierte evaluaciones negativas en casos con responsable, prioridad y SLA." },
  { title: "Alertas multicanal", detail: "En la app, correo, push y WhatsApp, sin duplicados y con reintentos." },
  { title: "TAP Intelligence", detail: "Sentimiento, urgencia, temas recurrentes y recomendaciones con evidencia." },
  { title: "Reportes programables", detail: "Diario, semanal, mensual o ejecutivo, en PDF, CSV o Excel." },
];

export function Features() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">Todo lo que necesitas para operar mejor</h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-surface p-6">
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
