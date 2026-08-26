# TAPnalytics

> Convierte cada tap en una decisión inteligente.

Plataforma SaaS multitenant que conecta tarjetas NFC con landing pages de
encuesta, captura retroalimentación de clientes y ayuda a los
establecimientos a detectar y resolver problemas operativos.

Este repositorio se construye por fases (ver `docs/architecture.md`). Este
README documenta lo que existe **hoy** — Fase 1.

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
- ⏳ Fase 4 — Inteligencia (TAP Intelligence), suscripciones, superadministrador, integraciones
- ⏳ Fase 5 — Seguridad avanzada, pruebas end-to-end, optimización, documentación final, despliegue

El esquema de base de datos (`supabase/migrations/`) ya cubre las ~30 tablas
de todas las fases, porque el modelo de datos es más fácil de acertar de una
sola vez y no bloquea el trabajo futuro. La aplicación (rutas, UI, lógica)
solo implementa lo que corresponde a la Fase 1.

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
supabase/seed.sql
```

`supabase/seed.sql` carga el catálogo global de categorías de feedback y los
planes (Starter/Professional/Enterprise, sin precios fijos — se configuran en
la tabla `plans`). Es seguro ejecutarlo en cualquier entorno.

### Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Verificación

```bash
npm run lint
npm run build   # compila, tipa y prerrenderiza — es la verificación más completa
```

## Estructura del proyecto

```
src/
  app/
    (marketing)/        Sitio público: home, /precios, /demo, /legal/*
    (auth)/              /login /registro /recuperar /restablecer
    auth/callback/        Callback de OAuth (Google)
    auth/confirm/          Callback de verificación de correo / reset
    onboarding/            Wizard de 6 pasos con barra de progreso
    app/                   Aplicación autenticada (multitenant)
      dashboard/             KPIs reales, filtros de periodo/sucursal, gráficas
      sucursales/ tarjetas/ equipo/ configuracion/
      casos/                 Centro de casos (lista + detalle + notas + historial)
      alertas/                Reglas de alerta + lista de alertas
      reportes/                Reporte ejecutivo (vista web imprimible) + export/ (CSV)
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
    data/                  Lecturas de servidor reutilizables (org actual, planes)
  proxy.ts                 (antes "middleware") — refresca la sesión de Supabase
supabase/
  migrations/              Esquema SQL versionado (extensiones → tablas → RLS → triggers)
  seed.sql                 Catálogo de categorías + planes
docs/
  architecture.md           Arquitectura, modelo de datos, decisiones técnicas
```

## Decisiones técnicas relevantes

- **Multitenancy**: cada fila de negocio cuelga de `organization_id`. El
  aislamiento se garantiza con **Row Level Security en Postgres**, nunca solo
  con filtros del frontend. Ver `docs/architecture.md` para el detalle y la
  prueba de aislamiento que se corrió contra un Postgres real.
- **Tipos de Supabase escritos a mano** (`src/lib/supabase/types.ts`): cubren
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

## Cuenta de superadministrador y datos demo

Aún no implementados (Fase 4 y Fase 5 respectivamente, según el plan de
fases). `docs/architecture.md` describe cómo se integrarán sin romper lo ya
construido.

## Aviso legal del producto

TAPnalytics nunca oculta, bloquea ni condiciona el enlace a reseñas públicas
de Google según la calificación del cliente. Ver `/legal/terminos` y
`/legal/privacidad`.
