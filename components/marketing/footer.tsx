import Link from "next/link";

const COLUMNS = [
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
        {COLUMNS.map((col) => (
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
