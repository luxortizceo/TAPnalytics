import { LegalPage } from "@/components/marketing/legal-page";

export const metadata = { title: "Términos y condiciones" };

export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones" updatedAt="26 de agosto de 2026">
      <h2>1. Aceptación</h2>
      <p>
        Al crear una cuenta en TAPnalytics aceptas estos términos. Si actúas en nombre de una
        empresa, declaras tener facultades para obligarla.
      </p>

      <h2>2. El servicio</h2>
      <p>
        TAPnalytics conecta tarjetas NFC con landing pages de encuesta, registra taps y
        retroalimentación, y ofrece analítica, alertas y recomendaciones a los establecimientos
        que contratan el servicio.
      </p>

      <h2>3. Cuentas y planes</h2>
      <p>
        Cada plan tiene límites de sucursales, tarjetas y usuarios definidos en la base de datos y
        visibles en tu panel de facturación. Puedes mejorar, degradar o cancelar tu suscripción en
        cualquier momento; los cambios aplican conforme a las reglas de prorrateo del proveedor de
        pagos.
      </p>

      <h2>4. Uso aceptable</h2>
      <p>Al usar TAPnalytics te comprometes a no:</p>
      <ul>
        <li>Manipular artificialmente los taps, encuestas o métricas.</li>
        <li>Usar la plataforma para incentivar, filtrar o desviar reseñas públicas.</li>
        <li>Recabar datos personales de tus clientes finales más allá de lo necesario.</li>
        <li>Intentar vulnerar el aislamiento de datos entre empresas.</li>
      </ul>

      <h2>5. Reseñas públicas</h2>
      <p>
        TAPnalytics no elimina, bloquea ni impide reseñas negativas, ni afirma poder controlar su
        publicación. El uso de la plataforma para intentar filtrar reseñas negativas constituye
        una violación de estos términos.
      </p>

      <h2>6. Propiedad de los datos</h2>
      <p>
        Los datos de retroalimentación capturados a través de tus tarjetas NFC te pertenecen.
        Puedes exportarlos en cualquier momento y solicitar su eliminación conforme a la política
        de retención de tu plan.
      </p>

      <h2>7. Disponibilidad y soporte</h2>
      <p>
        Trabajamos para mantener alta disponibilidad del servicio. Los niveles de servicio (SLA)
        formales están disponibles para el plan Enterprise.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        TAPnalytics se ofrece &ldquo;tal cual&rdquo;. No garantizamos resultados específicos de negocio ni
        control sobre plataformas de terceros como Google Reviews.
      </p>

      <h2>9. Cambios</h2>
      <p>
        Podemos actualizar estos términos. Los cambios relevantes se notificarán dentro de la
        plataforma o por correo electrónico.
      </p>
    </LegalPage>
  );
}
