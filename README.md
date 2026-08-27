# TAPnalytics

> Convierte cada tap en una decisión inteligente.

Plataforma SaaS multitenant que conecta tarjetas NFC con landing pages de
encuesta, captura retroalimentación de clientes y ayuda a los
establecimientos a detectar y resolver problemas operativos.

Este repositorio se construye por fases (ver `docs/architecture.md`). Este
README documenta lo que existe **hoy** — Fases 1 a 5, completas.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **React 19**
- **Tailwind CSS v4** — tema propio (negro grafito / plata / rojo racing / verde tecnológico)
- **Radix UI** primitives, sin librería de componentes de terceros — control total sobre la identidad visual
- **Supabase** — Postgres, Auth, y en fases posteriores Storage
- **React Hook Form + Zod** para formularios y validación
- **Resend** para correo transaccional (opcional, degrada con gracia si no está configurado)
- **Stripe** como pasarela de suscripción principal (Fase 4); Mercado Pago dejado preparado
- Sin Prisma: Supabase ya cubre acceso a datos tipado + Row Level Security, así que añadirlo duplicaría responsabilidades sin aportar ventaja clara

## Estado de las fases

- ✅ **Fase 1** — Proyecto base, diseño, autenticación, base de datos, empresas y sucursales
- ✅ **Fase 2** — Tarjetas NFC (CRUD completo + QR), URLs públicas, landing, registro de taps, encuestas
- ✅ **Fase 3** — Dashboard ejecutivo, centro de casos, alertas y notificaciones, reportes
- ✅ **Fase 4** — TAP Intelligence, suscripciones con Stripe, panel de superadministrador,
  integraciones reales (correo/push/WhatsApp), reportes programados + export Excel
- ✅ **Fase 5** — Auditoría de seguridad, accesibilidad WCAG 2.1 AA, pruebas
  automatizadas (unitarias + e2e), optimización de Core Web Vitals, datos
  demo, esta guía de despliegue

El esquema de base de datos (`supabase/migrations/`) ya cubre las ~30 tablas
de todas las fases, porque el modelo de datos es más fácil de acertar de una
sola vez y no bloquea el trabajo futuro. La aplicación (rutas, UI, lógica)
implementa las 5 fases completas. Lo que sigue pendiente no es una fase
numerada sino verificación contra infraestructura real que este entorno de
desarrollo no tiene conectada — ver "Antes de producción" al final de esta
sección de despliegue.

## Requisitos

- Node.js 20.9+
- Una cuenta y proyecto de [Supabase](https://supabase.com)
- `psql` (opcional, para aplicar las migraciones a mano)

## Instalación

```bash
npm install
cp .env.example .env.local
```

Rellena `.env.local` con las credenciales de tu proyecto de Supabase (ver
`docs/architecture.md` → Configuración de Supabase). Como mínimo necesitas:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
IP_HASH_SECRET=...   # cualquier cadena secreta — salt para el hash de IP de los taps
```

### Base de datos

Aplica las migraciones en orden contra tu proyecto de Supabase (SQL Editor,
`psql`, o `supabase db push` si usas el CLI de Supabase):

```
supabase/migrations/0001_extensions_enums.sql
supabase/migrations/0002_core_tables.sql
supabase/migrations/0003_rls_helper_functions.sql
supabase/migrations/0004_rls_policies.sql
supabase/migrations/0005_business_logic.sql
supabase/migrations/0006_fase4_extras.sql
supabase/seed.sql
```

`0006` es la única migración que añadió la Fase 4: el resto de sus tablas
(`ai_insights`, `recommendations`, `corrective_actions`, `subscriptions`,
`invoices`, `integrations`, `reports`, `report_schedules`,
`notification_preferences`, `audit_logs`) ya estaban en `0002`/`0004` desde
el diseño inicial del esquema, con RLS incluida — `0006` solo agrega las
columnas de Stripe en `plans` y la tabla `push_subscriptions`.

`supabase/seed.sql` carga el catálogo global de categorías de feedback y los
planes (Starter/Professional/Enterprise, sin precios fijos — se configuran en
la tabla `plans`). Es seguro ejecutarlo en cualquier entorno.

**Datos demo (opcional):** `supabase/seed_demo.sql` crea una organización de
ejemplo ("Café Aurora (Demo)") con 2 sucursales, 4 tarjetas NFC y ~30 días de
taps/encuestas sintéticos, para que el dashboard, casos, alertas y TAP
Intelligence tengan algo real que mostrar de inmediato. A diferencia de
`seed.sql`, este **no** se corre automáticamente ni es apto para producción —
requiere el `id` de un usuario de Supabase Auth ya existente (créalo desde
`/registro`) como dueño de la organización:

```bash
psql "<connection string>" \
  -v demo_owner_user_id="<uuid-del-usuario, sin comillas>" \
  -f supabase/seed_demo.sql
```

El propio archivo trae más detalle en sus comentarios (incluye cómo borrar la
organización demo después).

### Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Verificación

```bash
npm run lint
npm run build     # compila, tipa y prerrenderiza — es la verificación más completa
npm test          # unitarias (Vitest) — lógica pura, sin Supabase
npm run test:e2e  # end-to-end (Playwright) — sitio público y formularios sin Supabase
```

`npm run test:e2e` compila y levanta la app (`next build && next start`) en
el puerto 3100 automáticamente. Si `npx playwright install` no descargó un
Chromium (por ejemplo, en un entorno con red restringida que ya trae uno
preinstalado), define `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/ruta/al/binario`
para usarlo en vez de descargar uno nuevo.

## Estructura del proyecto

`app/`, `components/` y `lib/` viven en la **raíz del repo**, no bajo
`src/` — se movieron ahí en la Fase 4 porque GitHub limita a ~100 archivos
la subida manual de una carpeta arrastrada al navegador (ver "Sobre el
límite de archivos" abajo); cada una se sube por separado y cada una debe
quedarse por debajo de ese límite. El alias `@/*` en `tsconfig.json` apunta
a la raíz del repo, así que `@/lib/...`, `@/components/...` siguen
funcionando igual.

```
app/
  (marketing)/        Sitio público: home, /precios, /demo, /legal/*
  (auth)/              /login /registro /recuperar /restablecer
  auth/callback/        Callback de OAuth (Google)
  auth/confirm/          Callback de verificación de correo / reset
  onboarding/            Wizard de 6 pasos con barra de progreso
  admin/                 Panel de superadministrador (Fase 4, protegido por is_superadmin)
    planes/                CRUD de planes y precios de Stripe
  app/                   Aplicación autenticada (multitenant)
    dashboard/             KPIs reales, filtros de periodo/sucursal, gráficas
    sucursales/ tarjetas/ equipo/ configuracion/
    casos/                 Centro de casos (lista + detalle + notas + historial)
    alertas/                Reglas de alerta + lista de alertas
    inteligencia/            TAP Intelligence — anomalías, tendencias, recomendaciones (Fase 4)
    facturacion/              Plan actual, uso vs límites, checkout y portal de Stripe (Fase 4)
    reportes/                Reporte ejecutivo (vista web imprimible) + export/ (CSV/Excel)
                              + reportes programados por correo (Fase 4)
  api/
    stripe/webhook/          Sincroniza subscriptions/invoices desde Stripe (Fase 4)
    push/subscribe/          Alta/baja de suscripciones Web Push (Fase 4)
    cron/reports/             Dispara los reportes programados (llamado por un cron externo)
  t/[code]/               Route Handler público: valida la tarjeta NFC/QR,
                           registra el tap y redirige a la encuesta
  t/no-disponible/        Página neutral para tarjetas inactivas/no configuradas
  r/[code]/                Landing pública de encuesta (Mala/Buena/Excelente
                           + formulario dinámico + agradecimiento)
components/
  ui/                  Primitivos de diseño (button, card, dialog, ...)
  marketing/ auth/ app/
lib/
  supabase/            client.ts (browser) · server.ts (SSR) · admin.ts (service role) · types.ts
  permissions.ts        Matriz de roles → acciones (RBAC)
  validations/           Esquemas Zod
  data/                  Lecturas de servidor reutilizables (org actual, dashboard, planes)
  intelligence.ts         Motor de TAP Intelligence (Fase 4, basado en reglas, no un LLM externo)
  stripe.ts               Cliente de Stripe (checkout, portal de cliente)
  notify.ts                Envío real por correo/push/WhatsApp (Fase 4)
proxy.ts                 (antes "middleware") — refresca la sesión de Supabase
supabase/
  migrations/              Esquema SQL versionado (extensiones → tablas → RLS → triggers)
  seed.sql                 Catálogo de categorías + planes
docs/
  architecture.md           Arquitectura, modelo de datos, decisiones técnicas
```

### Sobre el límite de archivos por carpeta

Este proyecto se integra a GitHub subiendo carpetas manualmente desde el
navegador (sin acceso de push configurado en algunos entornos), y esa
subida rechaza lotes de más de ~100 archivos. Por eso cada carpeta de
primer nivel (`app/`, `components/`, `lib/`, ...) se mantiene por debajo de
98 archivos, consolidando componentes/acciones relacionados en un solo
archivo cuando tiene sentido (ver comentarios "keep the repo's file count
down" en varios archivos). Si tu integración es por `git push` normal, este
límite no te afecta y puedes ignorarlo.

## Decisiones técnicas relevantes

- **Multitenancy**: cada fila de negocio cuelga de `organization_id`. El
  aislamiento se garantiza con **Row Level Security en Postgres**, nunca solo
  con filtros del frontend. Ver `docs/architecture.md` para el detalle y la
  prueba de aislamiento que se corrió contra un Postgres real.
- **Tipos de Supabase escritos a mano** (`lib/supabase/types.ts`): cubren
  las tablas que la Fase 1 usa. Cuando haya un proyecto de Supabase enlazado,
  reemplázalo con `supabase gen types typescript`. Importante: el tipo
  `Database` debe declararse con `type`, no `interface` — con `interface`,
  supabase-js resuelve `.from(...).select(...)` silenciosamente como `never`
  en vez de dar un error de tipos.
- **Flujo público de NFC/encuesta**: nunca escribe con el cliente anónimo
  directo. `/t/[code]` y `/r/[code]` usan `lib/supabase/admin.ts` (service
  role, server-only) tras validar la tarjeta — coherente con que
  `tap_events`/`feedback_*`/`consent_records` no tienen políticas de
  `INSERT` para `authenticated`/`anon` (ver `docs/architecture.md`).
- **`proxy.ts`** sustituye a `middleware.ts` — Next.js 16 renombró Middleware
  a Proxy (mismo comportamiento).

## Cuenta de superadministrador

El panel de superadministrador vive en `/admin` (Fase 4) y solo lo pueden
ver usuarios con `profiles.is_superadmin = true`. No hay una pantalla para
autoasignarte ese flag — se activa a mano en la base de datos:

```sql
update public.profiles set is_superadmin = true where id = '<tu user id>';
```

Los datos demo (organización/sucursales/tarjetas/taps de ejemplo, para
probar la plataforma sin datos reales) son otra cosa — ver
`supabase/seed_demo.sql` y la sección "Base de datos" arriba.

## Despliegue

Pensado para **Vercel** (integración nativa con Next.js) + **Supabase**
como base de datos/auth, pero no depende de Vercel específicamente — es un
Next.js 16 estándar.

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica las migraciones y `seed.sql` (ver "Base de datos" arriba) —
   SQL Editor del dashboard es la vía más simple si no tienes `psql` a la
   mano; opcionalmente `seed_demo.sql` para tener datos de ejemplo.
3. Copia **Project URL**, **anon key** y **service_role key** desde
   Settings → API.
4. (Opcional, para el cron de reportes) Settings → Database → Connection
   string, si vas a usar `psql`/una integración externa que la necesite.

### 2. Variables de entorno

Copia `.env.example` → configúralas en Vercel (Project Settings →
Environment Variables) o en tu plataforma de despliegue. Agrupadas por lo
que habilitan:

| Grupo | Variables | Si falta |
|---|---|---|
| App | `NEXT_PUBLIC_SITE_URL` | URLs absolutas (correos, Stripe redirect) quedan mal |
| Supabase (requerido) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | La app entera no funciona — ver `proxy.ts` |
| Taps NFC | `IP_HASH_SECRET` | Usa un secreto de desarrollo hardcodeado (`lib/tracking.ts`) — cámbialo antes de producción |
| Correo | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SALES_INBOX_EMAIL` | `/demo` y las alertas por correo se saltan el envío con gracia (`lib/email.ts`) |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `/app/facturacion` muestra "Stripe no está configurado"; el webhook responde 503 |
| Web Push | `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PUBLIC_KEY` (mismo valor), `WEB_PUSH_PRIVATE_KEY` | El botón de activar push en `/app/configuracion` se oculta; el envío se salta con gracia |
| WhatsApp | `WHATSAPP_CLOUD_API_TOKEN`, `WHATSAPP_CLOUD_PHONE_NUMBER_ID` | El envío se salta con gracia (`lib/notify.ts`) |
| Reportes programados | `CRON_SECRET` | `/api/cron/reports` responde 401 a cualquier llamada |
| IA (preparado, Fase 4 no lo usa) | `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` | Sin efecto — TAP Intelligence hoy es reglas, no un LLM (ver `docs/architecture.md` §11) |

Genera las llaves de Web Push con `npx web-push generate-vapid-keys`.

### 3. Stripe

1. Crea los productos/precios en el dashboard de Stripe.
2. En `/admin/planes` (una vez desplegado, con tu usuario marcado
   `is_superadmin`), pega los Price IDs en cada plan
   (`stripe_price_id_monthly`/`_yearly`) — los montos siguen viviendo en
   `plans.price_monthly`/`_yearly`, nunca en el código.
3. Configura un webhook en Stripe apuntando a
   `https://<tu-dominio>/api/stripe/webhook`, eventos:
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `invoice.payment_failed`, `invoice.finalized`. Copia el
   *signing secret* a `STRIPE_WEBHOOK_SECRET`.

### 4. Reportes programados

`/api/cron/reports` no se dispara solo — este proyecto no tiene worker ni
cola propios (ver `docs/architecture.md` §11). Prográmalo con lo que ya
uses: **Vercel Cron** (`vercel.json` con un `crons` que haga `POST` a esa
ruta con `Authorization: Bearer $CRON_SECRET`), GitHub Actions con un
`schedule`, o cualquier otro programador HTTP. Una vez al día es
suficiente — la ruta revisa qué `report_schedules` ya vencieron.

### 5. Superadministrador

Después del primer despliegue, crea tu cuenta desde `/registro` y
márcala como superadmin (ver "Cuenta de superadministrador" arriba) para
acceder a `/admin`.

### Antes de producción

Este proyecto se desarrolló en un entorno sin acceso a un Supabase real ni
a redes externas (ver limitaciones en `docs/architecture.md`), así que lo
siguiente está construido y verificado por lectura/tipos/Postgres local,
pero **no probado contra infraestructura real todavía**:

- Correr las migraciones contra tu Supabase real y repetir la prueba de
  aislamiento de RLS de `docs/architecture.md` §3 con usuarios reales.
- Probar el flujo completo de un tap físico → encuesta → caso/alerta →
  dashboard con datos reales (no solo con Postgres local).
- Probar el checkout y el webhook de Stripe con una tarjeta de prueba.
- Correr Lighthouse/Web Vitals de campo contra `/t/[code]`→`/r/[code]`
  desplegado (ver `docs/architecture.md` §19).
- Correr un lector de pantalla real contra la app (ver
  `docs/architecture.md` §17).
- Decidir sobre una Content-Security-Policy (`next.config.ts` no trae una
  — ver `docs/architecture.md` §16).

## Aviso legal del producto

TAPnalytics nunca oculta, bloquea ni condiciona el enlace a reseñas públicas
de Google según la calificación del cliente. Ver `/legal/terminos` y
`/legal/privacidad`.
