import Link from "next/link";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/#producto", label: "Producto" },
  { href: "/#sectores", label: "Sectores" },
  { href: "/precios", label: "Precios" },
  { href: "/#faq", label: "Preguntas frecuentes" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <nav
        aria-label="Principal"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <Link href="/" className="text-lg font-semibold tracking-tight">
          TAP<span className="text-accent">nalytics</span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
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

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/registro">Prueba gratis</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
