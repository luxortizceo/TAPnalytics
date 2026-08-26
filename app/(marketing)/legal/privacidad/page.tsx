import { LegalPage } from "@/components/marketing/legal-page";

export const metadata = { title: "Aviso de privacidad" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Aviso de privacidad" updatedAt="26 de agosto de 2026">
      <p>
        Este aviso de privacidad describe cómo TAPnalytics (&ldquo;nosotros&rdquo;) recaba, usa y protege
        datos personales, en cumplimiento de la Ley Federal de Protección de Datos Personales en
        Posesión de los Particulares (LFPDPPP) y su reglamento.
      </p>

      <h2>1. Responsable</h2>
      <p>
        La empresa que contrata TAPnalytics (el &ldquo;Cliente&rdquo;) es responsable de los datos que recaba
        de sus propios clientes a través de encuestas y tarjetas NFC. TAPnalytics actúa como
        encargado del tratamiento de esos datos en nombre del Cliente, y como responsable de los
        datos de las cuentas de usuario de la plataforma.
      </p>

      <h2>2. Datos que recabamos</h2>
      <ul>
        <li>Datos de cuenta: nombre, correo electrónico, contraseña (cifrada), teléfono opcional.</li>
        <li>
          Datos de uso de tarjetas NFC: fecha, hora, sucursal, tipo de dispositivo, sistema
          operativo, navegador, idioma y ubicación aproximada (país/estado/ciudad) obtenida por IP.
        </li>
        <li>
          Datos de retroalimentación: calificación de experiencia, comentarios y, únicamente si el
          cliente final lo decide voluntariamente, nombre, correo o teléfono de contacto.
        </li>
      </ul>

      <h2>3. Qué NO hacemos con las direcciones IP</h2>
      <p>
        No almacenamos la dirección IP completa de forma permanente. Se procesa de forma temporal
        para estimar ubicación aproximada y prevenir abuso, y se conserva únicamente como un hash
        con sal rotatoria — no reversible a la IP original.
      </p>

      <h2>4. Finalidades</h2>
      <ul>
        <li>Operar la plataforma y prestar el servicio contratado por el Cliente.</li>
        <li>Detectar patrones operativos y generar recomendaciones accionables.</li>
        <li>Prevenir fraude, abuso y manipulación de métricas.</li>
        <li>Cumplir obligaciones legales y contractuales.</li>
      </ul>

      <h2>5. Derechos ARCO</h2>
      <p>
        Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación y Oposición sobre tus
        datos de cuenta escribiendo al responsable correspondiente. Si tu retroalimentación fue
        capturada a través de la tarjeta NFC de un establecimiento, tu solicitud debe dirigirse
        primero a ese establecimiento, como responsable de esos datos.
      </p>

      <h2>6. Consentimiento y datos de contacto voluntarios</h2>
      <p>
        Nunca solicitamos datos de contacto de forma obligatoria en una encuesta. Cuando un
        cliente final decide compartirlos para ser contactado, registramos su consentimiento
        explícito junto con el texto exacto que se le mostró.
      </p>

      <h2>7. Reseñas públicas</h2>
      <p>
        TAPnalytics no elimina, bloquea ni impide que un cliente final publique una reseña en
        Google. El enlace a Google Reviews se ofrece siempre después de completar la
        retroalimentación, sin condicionarlo a la calificación otorgada.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos aislamiento de datos por empresa mediante Row Level Security en la base de
        datos, cifrado en tránsito y control de acceso basado en roles.
      </p>
    </LegalPage>
  );
}
