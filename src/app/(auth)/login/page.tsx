import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Accede al panel de tu empresa en TAPnalytics.
        </p>
      </div>
      {error === "oauth_failed" && (
        <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          No pudimos completar el inicio de sesión con Google. Intenta de nuevo.
        </p>
      )}
      {error === "confirm_link_invalid" && (
        <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          El enlace de verificación no es válido o ya expiró.
        </p>
      )}
      <LoginForm next={next} />
      <p className="text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-foreground underline underline-offset-4">
          Comienza tu prueba gratuita
        </Link>
      </p>
    </div>
  );
}
