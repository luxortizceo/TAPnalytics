import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Crea tu cuenta" };

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comienza tu prueba gratuita</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sin tarjeta de crédito. Configura tu primera sucursal en minutos.
        </p>
      </div>
      <RegisterForm />
      <p className="text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
