const SECTORS = [
  "Restaurantes",
  "Cafeterías",
  "Hoteles",
  "Clínicas",
  "Barberías",
  "Gimnasios",
  "Agencias",
  "Tiendas",
];

export function Sectors() {
  return (
    <section id="sectores" className="border-b border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">Para cualquier punto de contacto físico</h2>
          <p className="mt-3 text-muted-foreground">
            El catálogo de categorías de problemas se adapta automáticamente al giro del negocio.
          </p>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SECTORS.map((s) => (
            <li
              key={s}
              className="rounded-md border border-border bg-surface px-4 py-3 text-center text-sm font-medium text-foreground"
            >
              {s}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
