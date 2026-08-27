import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Static marketing sections, grouped in one file to keep the repo's file
 * count down (used to be benefits/sectors/features/cta/footer.tsx).
 */

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

const FOOTER_COLUMNS = [
  {
    title: "Producto",
    links: [
      { href: "/#producto", label: "Cómo funciona" },
      { href: "/#sectores", label: "Sectores" },
      { href: "/precios", label: "Precios" },
      { href: "/demo", label: "Solicitar demostración" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { href: "/registro", label: "Crear cuenta" },
      { href: "/login", label: "Iniciar sesión" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacidad", label: "Aviso de privacidad" },
      { href: "/legal/terminos", label: "Términos y condiciones" },
      { href: "/legal/cookies", label: "Política de cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <span className="text-lg font-semibold tracking-tight">
            TAP<span className="text-accent">nalytics</span>
          </span>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Tarjetas NFC, encuestas y analítica para detectar problemas operativos antes de que
            se conviertan en malas reseñas.
          </p>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
            <ul className="mt-4 flex flex-col gap-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
        © {new Date().getFullYear()} TAPnalytics. Todos los derechos reservados.
      </div>
    </footer>
  );
}
