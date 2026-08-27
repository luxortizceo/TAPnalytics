import { LegalPage } from "@/components/marketing/legal-page";

export const metadata = { title: "Política de cookies" };

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies" updatedAt="26 de agosto de 2026">
      <h2>1. Qué usamos</h2>
      <p>
        TAPnalytics utiliza principalmente cookies estrictamente necesarias para mantener tu
        sesión iniciada de forma segura (gestionadas por Supabase Auth) y una preferencia local de
        tema claro/oscuro. No usamos cookies de publicidad ni de rastreo entre sitios.
      </p>

      <h2>2. Cookies de sesión (necesarias)</h2>
      <p>
        Permiten identificarte como usuario autenticado y aplicar el aislamiento de datos de tu
        empresa. No se pueden desactivar sin dejar de poder iniciar sesión.
      </p>

      <h2>3. Landing de encuesta (NFC)</h2>
      <p>
        La landing pública que se abre al acercar una tarjeta NFC usa un identificador de sesión
        anónimo, no persistente entre visitas, para asociar tus respuestas a una única sesión de
        retroalimentación.
      </p>

      <h2>4. Control</h2>
      <p>
        Puedes eliminar las cookies desde la configuración de tu navegador en cualquier momento;
        esto cerrará tu sesión activa.
      </p>
    </LegalPage>
  );
}
