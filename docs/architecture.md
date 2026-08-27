# Arquitectura de TAPnalytics

## 1. Visión general

TAPnalytics es una plataforma SaaS **multiempresa y multitenant**. Un
establecimiento (restaurante, hotel, clínica, etc.) crea una cuenta
empresarial, registra sucursales, vincula tarjetas NFC y recibe
retroalimentación anónima de sus clientes a través de una landing page que se
abre al hacer tap. Esa retroalimentación se convierte en métricas, alertas,
casos accionables y recomendaciones.

## 2. Stack y por qué

| Capa | Elección | Razón |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | SSR/RSC para landing pública rápida, Server Actions para mutaciones sin API intermedia |
| Lenguaje | TypeScript | Seguridad de tipos de extremo a extremo |
| Estilos | Tailwind CSS v4 | Tema por tokens CSS, sin runtime, fácil de mantener premium/minimalista |
| Componentes | Radix UI (primitivos) + componentes propios | Accesibilidad correcta desde la base, control total de la identidad visual — evitamos una librería de UI genérica que no encaje con la marca |
| Datos + Auth | Supabase (Postgres, Auth) | Row Level Security nativo a nivel de base de datos, auth completa (email, OAuth, recuperación), menos infraestructura propia |
| ORM | Ninguno (cliente de Supabase tipado) | Prisma duplicaría la capa de conexión sin aportar ventaja sobre RLS + tipos generados |
| Formularios | React Hook Form + Zod | Validación compartida cliente/servidor |
| Correo | Resend | API simple, se integra bien con Server Actions; Supabase Auth gestiona sus propios correos (verificación, reset) de forma independiente |
| Pagos | Stripe (principal), Mercado Pago (preparado) | Stripe es el estándar para SaaS; se deja `subscriptions.provider` como columna para no bloquear una segunda pasarela |
| IA | Proveedor configurable por variables de entorno | Evita atarse a un proveedor único; `ai_insights`/`recommendations` son agnósticas del proveedor |
| Despliegue | Vercel | Integración nativa con Next.js |

## 3. Multitenancy y seguridad de datos

Cada tabla de negocio cuelga de `organization_id` (directa o indirectamente).
**El aislamiento se aplica con Row Level Security de Postgres**, nunca
confiando en filtros del frontend.

Funciones helper `SECURITY DEFINER` (`supabase/migrations/0003_rls_helper_functions.sql`):

- `is_superadmin()` — bandera en `profiles`.
- `is_org_member(org_id)` — ¿el usuario autenticado pertenece a esa organización?
- `has_org_role(org_id, roles[])` — ¿su rol está en la lista permitida?
- `can_access_location(org_id, location_id)` — resuelve el alcance por
  sucursal para roles como `manager`/`employee` (vía `member_locations`);
  roles de alcance amplio (`owner`/`admin`/`analyst`) siempre pasan.

Estas funciones son `SECURITY DEFINER` para evitar recursión infinita cuando
una política de `organization_members` necesitaría consultar
`organization_members` a través de RLS.

### Verificación real de aislamiento

Antes de dar por cerrado el esquema, se aplicaron las 5 migraciones contra un
Postgres 16 real (no simulado) y se verificó con un rol sin `BYPASSRLS`:

1. El usuario que crea una organización queda automáticamente como `owner`
   (trigger `handle_new_organization`).
2. Puede crear sucursal y tarjeta NFC dentro de su organización.
3. Un segundo usuario, ajeno a esa organización, ve **0 filas** en
   `organizations`, `locations` y `nfc_cards` — aislamiento total confirmado.
4. La inserción directa en `tap_events` desde el rol autenticado se bloquea
   por diseño: esa tabla solo se escribe desde código de servidor con la
   service role key (ver §5).

Un detalle real que este ejercicio descubrió y corrigió: `INSERT ... RETURNING`
evalúa también la política de `SELECT`, y esa evaluación ocurre **antes** de
que el trigger `AFTER INSERT` cree la membresía de `owner`. La política de
`SELECT` de `organizations` incluye por eso `OR created_by = auth.uid()`,
para que el creador vea su fila recién creada sin depender del orden de
ejecución del trigger.

### Flujo público de NFC

El tap de una tarjeta y el envío de una encuesta ocurren **sin usuario
autenticado**. Ese flujo nunca usa el cliente Supabase anónimo del
navegador para escribir directamente: pasa por Route Handlers/Server Actions
que usan `lib/supabase/admin.ts` (service role, bypassa RLS) después de
validar la tarjeta y aplicar rate limiting. Por eso `tap_events`,
`feedback_sessions`, `feedback_responses` y `consent_records` no tienen
políticas de `INSERT` para el rol `authenticated`/`anon` — están cerradas por
diseño.

**Implementación (`/t/[code]` → `/r/[code]`):**

1. `GET /t/[code]` (`app/t/[code]/route.ts`) resuelve la tarjeta por
   `public_code`. Si no existe, está desactivada/perdida, o el
   User-Agent parece un bot, redirige sin registrar nada útil.
2. Si la tarjeta es válida, calcula device/OS/navegador con un parser propio
   de UA (`lib/tracking/user-agent.ts`, sin dependencias externas por
   rendimiento), hashea la IP con sal rotativa mensual
   (`lib/tracking/ip-hash.ts` — nunca se persiste la IP cruda), aplica un
   límite de taps por IP-hash/minuto y marca posibles duplicados (mismo
   card + IP-hash en 20s).
3. Inserta `tap_events` (el trigger `handle_new_tap_event` de la Fase 1
   incrementa `nfc_cards.total_taps`/`last_tap_at` automáticamente) e inicia
   una `feedback_sessions` anónima.
4. Guarda el `session_token` en una cookie `httpOnly` con alcance
   `path=/r/[code]` (no en la URL — evita fugas por `Referer`/logs) y
   redirige a `/r/[code]`.
5. `/r/[code]` (`app/r/[code]/page.tsx`) exige esa cookie; si falta,
   vuelve a `/t/[code]` (se autorrepara generando un tap nuevo). Renderiza
   la landing (logo, bienvenida, pregunta principal) y el flujo de 3
   respuestas — Mala/Buena/Excelente — seguido de un formulario dinámico
   (categorías por sector desde `feedback_categories`, urgencia y contacto
   opcional con consentimiento explícito solo para "Mala") y una pantalla
   de agradecimiento neutral.
6. El enlace a Google Reviews se muestra **siempre** que la sucursal/empresa
   tenga uno configurado, sin importar la calificación — nunca se construye
   condicionalmente sobre `rating`. Solo se registra que el enlace se abrió
   (`tap_events.google_reviews_opened`), nunca que la reseña se publicó.

`proxy.ts` excluye explícitamente `/t/*` y `/r/*` del refresco de sesión de
Supabase — son rutas anónimas de alto tráfico y no hay sesión que refrescar.

Verificado extremo a extremo contra un Postgres real (sin mocks): tap →
incremento de contador vía trigger → sesión de feedback → respuesta con
categoría → `consent_records` → estado final `completed` con
`survey_completed`/`google_reviews_opened` correctos.

## 4. Roles y permisos

Roles (`org_role`): `superadmin`, `owner`, `admin`, `manager`, `analyst`,
`employee`, `viewer`.

- **Base de datos**: cada política RLS declara explícitamente qué roles
  pueden `select`/`insert`/`update`/`delete` por tabla.
- **UI** (`lib/permissions.ts`): una matriz rol → acción
  (`view`, `create`, `edit`, `delete`, `export`, `manage_users`,
  `manage_cards`, `manage_billing`, `view_sensitive`) que decide qué
  controles mostrar. **Nunca es la barrera de seguridad real** — esa siempre
  es RLS.

Pendiente para una fase posterior: enmascarar a nivel de columna los datos de
contacto de un caso (`cases.contact_email`, etc.) para roles sin
`view_sensitive`, hoy la restricción es a nivel de fila.

## 5. Modelo de datos

Todas las tablas viven en `supabase/migrations/0002_core_tables.sql`. Resumen
por dominio (✅ = usada por la app en Fase 1, resto = esquema listo, UI en
fases futuras):

**Identidad y cuentas** — ✅ `profiles`, ✅ `organizations`,
✅ `organization_members`, ✅ `member_locations`

**Empresas y sucursales** — ✅ `brands`, ✅ `locations`

**NFC y taps** — ✅ `nfc_cards` (CRUD completo, QR), ✅ `nfc_card_history`
(cambios de estado), ✅ `tap_events`

**Encuestas y feedback** — ✅ `feedback_sessions`, ✅ `feedback_responses`,
✅ `feedback_categories` (seed global + por sector), ✅ `response_categories`,
✅ `consent_records`

**Casos** — ✅ `cases` (auto-creados desde una calificación "Mala"),
✅ `case_notes`, ✅ `case_history`

**Alertas y notificaciones** — ✅ `alert_rules` (tipos activables por org),
✅ `alerts`, ✅ `notifications` (in-app, con campana en el shell), ✅
`notification_preferences` (canal/frecuencia por usuario y categoría,
`/app/configuracion`), ✅ `push_subscriptions` (Web Push, migración 0006).
Envío real por correo/push/WhatsApp desde Fase 4 (`lib/notify.ts`).

**Reportes** — la vista web/CSV/Excel usa `feedback_sessions`,
`feedback_responses`, `cases`. ✅ `report_schedules` (reportes programados,
`/app/reportes`) y ✅ `reports` (historial de envíos) se escriben desde
Fase 4; el disparo real lo hace un cron externo llamando a
`POST /api/cron/reports` — no hay cola ni worker propio en este proyecto.

**Inteligencia** — ✅ `ai_insights`, `recommendations`, `corrective_actions`
poblados por `lib/intelligence.ts` (Fase 4, `/app/inteligencia`).

**Suscripciones** — ✅ `plans` (seed + lectura pública, con
`stripe_price_id_monthly`/`_yearly` desde 0006), ✅ `subscriptions`,
`invoices` (sincronizadas por `app/api/stripe/webhook`, Fase 4).

**Plataforma** — ✅ `integrations` (RLS lista, sin UI todavía — Fase 5),
✅ `audit_logs` (RLS lista, sin escritores todavía — Fase 5).

Todas las tablas mutables tienen `created_at`/`updated_at` (trigger
`set_updated_at`), y las que representan entidades de negocio con ciclo de
vida largo tienen `deleted_at` (soft delete): `organizations`, `brands`,
`locations`, `nfc_cards`, `cases`.

### Códigos de tarjeta NFC

`nfc_cards.public_code` es un identificador corto **no secuencial**
(generado con `nanoid`, no autoincremental), para que no se puedan enumerar
tarjetas de otros clientes probando URLs consecutivas. La URL pública será
`https://tapnalytics.com/t/<public_code>` (ruta implementada en Fase 2).

## 6. Autenticación

- Registro/login con correo y contraseña (Supabase Auth), Google OAuth
  preparado (`signInWithOAuth`), recuperación de contraseña, verificación de
  correo vía `/auth/confirm`.
- `proxy.ts` (Proxy — el nombre de Middleware en Next.js 16) refresca la
  sesión en cada navegación y protege `/onboarding`, `/app` y `/admin`.
- 2FA: columna `profiles.two_factor_enabled` preparada; la UI se
  implementará usando la API de MFA de Supabase Auth en una fase posterior.
- Política de contraseña: mínimo 10 caracteres, mayúscula, minúscula y
  número (`lib/validations/auth.ts`).

## 7. Onboarding

Wizard de 6 pasos con barra de progreso, persistido en
`organizations.onboarding_step` para poder "guardar y continuar después":
empresa+sector → sucursal → marca/logo+Google Reviews → landing → tarjeta NFC
→ prueba de enlace. El último paso abre el enlace público real
(`/t/[código]`) — desde la Fase 2 ya no es una vista previa: tapearlo
registra un tap de verdad y abre la encuesta real.

## 8. Casos, alertas y dashboard (Fase 3)

**De feedback a caso, en el mismo request.** Cuando `submitFeedback`
(`app/r/[code]/actions.ts`) guarda una encuesta calificada "Mala":

1. `lib/cases.ts` crea una fila en `cases` (folio automático, `due_at`
   calculado por SLA según la urgencia: 4h crítica / 24h alta / 72h media /
   120h baja).
2. `lib/alerts.ts` crea una `alerts` de tipo `new_bad_experience` (y
   `urgent_comment` si la urgencia es alta/crítica), y la reparte como
   `notifications` in-app a los miembros `owner`/`admin` de la organización.
   Si la organización configuró una `alert_rules` para ese tipo con
   `is_active = false`, no se genera nada — sin regla configurada, el
   comportamiento por defecto es alertar (cero-config funciona out of the
   box).

No hay cola ni cron: todo ocurre síncronamente dentro del Server Action que
ya se está ejecutando. Es correcto para el volumen esperado en esta fase;
una cola dedicada es trabajo de infraestructura, no de producto, y se
revisita si el volumen lo justifica.

**Centro de casos** (`/app/casos`): lista filtrable por estado/urgencia/
sucursal, detalle con notas internas, historial de cambios
(`case_history`, un registro por transición de estado/urgencia/responsable),
asignación de responsable, y medición automática de `first_response_at`
(primer cambio de estado fuera de "Nuevo") y `resolved_at`.

**Alertas** (`/app/alertas`): switches para activar/desactivar los tipos de
alerta ya implementados, y lista de alertas con reconocer/resolver. La
campana en el shell (`components/app/notification-bell*.tsx`) muestra las
notificaciones in-app del usuario con conteo de no leídas.

**Dashboard ejecutivo** (`/app/dashboard`, lógica en `lib/data/dashboard.ts`):
KPIs (taps, encuestas iniciadas/completadas, tasa de conversión, índice de
satisfacción — `(excelente×1 + buena×0.5) / calificadas × 100` — y su
tendencia contra el periodo anterior de igual duración), principales
problemas/fortalezas por categoría, comparativa entre sucursales, tarjetas
con más actividad, horario con más experiencias malas, comentarios
recientes anonimizados, alertas activas y casos sin resolver. Filtros de
periodo (hoy/ayer/7d/30d/personalizado) y sucursal vía query params.
Verificado con las mismas agregaciones ejecutadas directamente en SQL
contra datos reales — los números coinciden exactamente con lo que calcula
`getDashboardData` en JS.

**Reportes** (`/app/reportes`): el mismo `getDashboardData` renderizado como
reporte ejecutivo imprimible (`window.print()` con CSS `@media print` que
oculta el shell — "Guardar como PDF" es el diálogo de impresión del
navegador, no una librería de PDF) y una exportación CSV
(`/app/reportes/export`) de las encuestas del periodo, autenticada con el
cliente normal de Supabase (RLS decide qué filas puede ver, no la ruta).

## 9. Planes y precios

Los precios **no están hardcodeados**: viven en la tabla `plans`
(`price_monthly`, `price_yearly`, `currency`, `null` = "personalizado"). El
sitio público (`/precios` y la sección de precios del home) los lee en vivo
vía un componente de servidor (`getActivePlans`), con un estado de error
honesto si Supabase no está configurado — nunca precios inventados.

## 10. Reglas de producto (anti dark-patterns)

- El enlace a reseñas de Google se muestra siempre después de completar la
  encuesta, sin importar la calificación — nunca solo a quienes calificaron
  "Excelente".
- TAPnalytics registra que el enlace externo se abrió, nunca afirma que la
  reseña se publicó.
- Ninguna pantalla afirma eliminar, bloquear o impedir reseñas negativas.
- Ningún dato de demostración se presenta como real sin decirlo
  explícitamente (ver el paso final del onboarding).

## 11. TAP Intelligence, suscripciones, superadmin e integraciones (Fase 4)

**TAP Intelligence** (`lib/intelligence.ts`, `/app/inteligencia`): un motor
basado en reglas — comparación del periodo actual contra el periodo
anterior de igual duración — no un modelo de lenguaje externo, pese al
nombre. Detecta tres cosas: picos/recurrencias en categorías negativas
(`anomaly`/`recurring_issue`), caídas o subidas relevantes del índice de
satisfacción (`trend`), y sucursales muy por debajo del promedio de la
organización (`comparison`). Cada hallazgo se guarda en `ai_insights` con
su evidencia (`evidence` jsonb, periodo, tamaño de muestra) y, cuando
amerita acción, una `recommendations` vinculada. `confidence` es un
heurístico basado en el tamaño de muestra (igual que el índice de
satisfacción de la Fase 3), nunca una probabilidad estadística real — se
muestra siempre junto a la evidencia que la originó. Se dispara con el
botón "Analizar ahora" (un miembro `owner`/`admin`, vía Server Action con
el cliente de service role — `ai_insights`/`recommendations` no tienen
política de `INSERT` para usuarios normales, solo `SELECT`), no por cron:
mismo límite de "no hay cola ni worker" que el resto del proyecto.

**Suscripciones con Stripe** (`lib/stripe.ts`,
`app/api/stripe/webhook/route.ts`, `/app/facturacion`): checkout en modo
suscripción, portal de cliente, y un webhook que es el **único** escritor
de `subscriptions`/`invoices` (esas tablas son de solo lectura para
`owner`/`admin` vía RLS — se sincronizan con el service role, igual que
`ai_insights`). Los precios siguen sin estar hardcodeados: `plans` ahora
también guarda `stripe_price_id_monthly`/`_yearly` (migración 0006) para
saber contra qué Price de Stripe hacer el checkout, pero el monto que se
le cobra al cliente lo define Stripe/el Price, no el código.

**Panel de superadministrador** (`/admin`, protegido por
`profiles.is_superadmin`, verificado en `app/admin/layout.tsx` — el Proxy
solo exige sesión, no el flag): lista de organizaciones con cambio de plan
y estado, y CRUD de planes (crear, activar/desactivar, precios y Price IDs
de Stripe). Usa el cliente de service role porque
`organizations_select_member` no tiene bypass para superadmin — deliberado,
para no tocar RLS ya probada; la autorización real la hace el propio
layout antes de renderizar cualquier página hija.

**Integraciones reales de alertas** (`lib/notify.ts`, usado desde
`lib/alerts.ts`): cada canal de `alert_rules.channels` ahora dispara un
envío real — correo (Resend), Web Push (VAPID, `web-push`, suscripción
gestionada en `/app/configuracion` + `app/api/push/subscribe`) y WhatsApp
(Cloud API, mensaje de texto plano). Cada intento de envío por canal queda
como una fila en `notifications` con `delivered_at`/`delivery_error`, así
que la entrega es auditable por canal y por usuario. `notification_preferences`
(canal + categoría + `enabled`) se respeta antes de enviar; solo la
frecuencia `immediate` se envía de forma síncrona — `hourly_digest`/
`daily_digest`/`weekly_digest` quedan guardadas en la preferencia pero no
se agrupan ni se envían todavía (necesitarían un cron, ver límites abajo).

**Reportes programados** (`report_schedules`, `/app/reportes`,
`app/api/cron/reports/route.ts`): un miembro con permiso de `export` crea
un schedule (frecuencia, formato, destinatarios); el envío real lo dispara
un cron **externo** (Vercel Cron, GitHub Actions, etc.) llamando a
`POST /api/cron/reports` con `Authorization: Bearer $CRON_SECRET` — este
proyecto no tiene worker propio. El correo enviado es un resumen ejecutivo
en HTML con enlace de vuelta a `/app/reportes`, no un PDF/Excel adjunto
todavía. La exportación manual sí gana Excel (`/app/reportes/export?format=xlsx`,
con `exceljs`), además del CSV que ya existía.

## 12. Próximos pasos

Las 5 fases del plan original están completas (§16-§20 cubren la Fase 5:
seguridad, accesibilidad, pruebas, Core Web Vitals y datos demo). Lo que
queda no es una fase nueva sino verificación contra infraestructura real
que este entorno de desarrollo no tuvo conectada — ver README →
"Despliegue → Antes de producción" para la lista concreta.

## 13. Límites conocidos de la Fase 2 (honestidad, no deuda oculta)

- El rate limiting de `/t/[code]` es una consulta a `tap_events` por
  IP-hash/minuto — funciona, pero no reemplaza un limitador dedicado
  (Redis/Upstash) bajo tráfico alto; suficiente para el volumen esperado en
  esta fase.
- La detección de bots es una lista de patrones de User-Agent, no un
  servicio anti-fraude — bloquea crawlers obvios, no un abuso sofisticado.
- La geolocalización aproximada depende de cabeceras `x-vercel-ip-*`; fuera
  de Vercel (u otro proveedor sin esas cabeceras) queda en `null` en vez de
  inventarse un dato.
- La creación automática de un `case` a partir de una calificación "Mala" o
  urgencia alta queda para la Fase 3, junto con el centro de casos que lo
  hace útil — el dato (`urgency_level`, `rating`) ya se captura hoy.

## 14. Límites conocidos de la Fase 3

- Los tipos de alerta activables hoy son `new_bad_experience` y
  `urgent_comment` (los únicos con lógica de disparo real al llegar
  feedback). El resto del enum `alert_type` (racha de quejas, tarjeta sin
  actividad, etc.) necesita analizar tendencias en el tiempo — eso es lo
  que hace TAP Intelligence en la Fase 4, pero como hallazgos en
  `ai_insights`/`recommendations`, no como nuevos disparadores de `alerts`.
- El índice de satisfacción es una fórmula simple y documentada
  (`(excelente×1 + buena×0.5) / calificadas × 100`), no un modelo estadístico
  — es intencional y transparente, no un intento de simular sofisticación
  que no existe.
- "Guardar como PDF" en Reportes usa el diálogo de impresión del navegador
  (CSS `@media print`), no genera un PDF en el servidor — funciona en todos
  los navegadores modernos sin dependencias nuevas, pero el resultado
  depende de la configuración de impresión del usuario.
- El enmascarado a nivel de columna de los datos de contacto de un caso
  (mencionado en la §4) sigue pendiente — hoy `view_sensitive` es
  todo-o-nada por fila, no por campo.

## 15. Límites conocidos de la Fase 4

- **No hay cola ni cron propios**, otra vez: "Analizar ahora" (TAP
  Intelligence) y los reportes programados dependen de que alguien haga
  clic o de que un scheduler externo llame a `/api/cron/reports`. Nada se
  ejecuta solo dentro de este proyecto.
- **TAP Intelligence es reglas, no IA real** — comparación de periodos y
  umbrales fijos (`MIN_SAMPLE = 3`, `SPIKE_RATIO = 1.5`, delta ±10 puntos
  de satisfacción, ±15 puntos entre sucursales). `AI_PROVIDER`/`AI_API_KEY`
  siguen preparados en `.env.example` para una versión futura que sí llame
  a un modelo de lenguaje sobre los comentarios de texto libre.
- **WhatsApp usa mensaje de texto plano** vía la Cloud API — eso solo
  funciona dentro de la ventana de 24h de conversación con el cliente. Un
  envío de alerta no solicitado en producción necesita una plantilla de
  mensaje aprobada por Meta; `lib/notify.ts` está señalado con ese límite.
- **Los reportes programados no adjuntan PDF/Excel** — el correo es un
  resumen ejecutivo en HTML con un enlace de vuelta a `/app/reportes`.
  Adjuntar el archivo real es un cambio pequeño una vez que el envío se
  verifique en producción (Resend soporta adjuntos).
- **Las frecuencias `hourly_digest`/`daily_digest`/`weekly_digest` de
  `notification_preferences` se guardan pero no se agrupan ni se envían**
  — solo `immediate` dispara un envío síncrono hoy; los digests necesitan
  el mismo cron que los reportes programados.
- **El panel de superadmin usa el cliente de service role para leer/escribir
  `organizations`**, no RLS — `organizations_select_member` no tiene bypass
  para superadmin (a diferencia de la mayoría de las demás tablas). La
  autorización real la hace `app/admin/layout.tsx` verificando
  `profiles.is_superadmin` antes de renderizar cualquier página hija — una
  capa de aplicación, no de base de datos, deliberada para no tocar la RLS
  de `organizations` ya probada contra Postgres real.
- **`app/`, `components/` y `lib/` se movieron de `src/` a la raíz del
  repo** en esta fase, únicamente por el límite de ~100 archivos por carpeta
  de la subida manual a GitHub (ver README → "Sobre el límite de archivos
  por carpeta"). No cambia nada en tiempo de ejecución; solo el alias
  `@/*` en `tsconfig.json` pasa de `./src/*` a `./*`.

## 16. Auditoría de seguridad (Fase 5)

Revisión manual dirigida (sin acceso a un proyecto de Supabase real en este
entorno para correr un scanner dinámico — ver limitación de red documentada
en el README). Hallazgos y su corrección:

- **Inyección de HTML en correos transaccionales (corregido).**
  `app/(marketing)/demo/actions.ts` (formulario público `/demo`) y
  `lib/notify.ts` (alertas por correo, que pueden incluir el comentario
  libre de una encuesta anónima) interpolaban texto de usuario directo en
  un template de HTML sin escapar. Un comentario o campo de formulario con
  `<img src=x onerror=...>` habría llegado sin escapar al cliente de correo
  del destinatario. Se agregó `escapeHtml()` en `lib/email.ts` y se aplicó
  en ambos puntos; `app/api/cron/reports/route.ts` genera su propio HTML
  de resumen (con el nombre de la organización ya escapado) y llama a
  `sendTransactionalEmail` directo, no a la variante que escapa `body` como
  texto plano.
- **SSRF vía suscripción de Web Push (corregido).** `POST
  /api/push/subscribe` guardaba el `endpoint` que mandara el cliente sin
  validar; ese endpoint luego recibe una petición HTTP real del servidor
  (`webpush.sendNotification`). Un usuario autenticado podía apuntar el
  endpoint a una URL interna. Se agregó `isAllowedPushEndpoint()` en
  `lib/notify.ts`: exige `https://` y una lista blanca de hosts de los
  servicios de push reales (FCM, Mozilla, Apple, WNS).
- **Comparación no constante del secreto del cron (corregido).**
  `app/api/cron/reports/route.ts` comparaba el header `Authorization` con
  `!==`; se cambió a `crypto.timingSafeEqual` para no filtrar el secreto
  por temporización, aunque el riesgo práctico era bajo.
- **Cabeceras de seguridad básicas (agregado).** `next.config.ts` ahora
  fija `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin` y una
  `Permissions-Policy` restrictiva en todas las rutas. **No se agregó
  Content-Security-Policy** — una CSP mal calibrada puede romper Stripe
  Checkout/el portal de cliente y OAuth de Google sin poder probarlo contra
  un despliegue real en este entorno; queda como siguiente paso antes de
  producción.
- **CSRF en `POST/DELETE /api/push/subscribe` (mitigado, no descartado).**
  Es un Route Handler normal, no una Server Action (que Next.js protege
  automáticamente verificando el origen) — un sitio malicioso podría
  intentar un `fetch` con credenciales hacia esta ruta. La mitigación
  real hoy es que las cookies de sesión de `@supabase/ssr` son
  `SameSite=Lax` por defecto, lo que bloquea el envío de cookies en un
  `POST` entre sitios. No se agregó un token CSRF explícito porque
  duplicaría esa protección; revisarlo si el proyecto cambia el
  `sameSite` de las cookies de sesión.
- **Revisado y sin hallazgos**: cobertura de RLS en las ~30 tablas
  (reverificada contra Postgres real en cada fase), IDOR en las Server
  Actions nuevas de la Fase 4 (todas derivan `organization_id` de la
  sesión, nunca de un parámetro del cliente, excepto el panel de
  superadmin que ya tiene su propia verificación explícita — ver §11 y
  §15), secretos hardcodeados (ninguno; `grep` de patrones de claves de
  Stripe/AWS/llaves privadas sobre `app/`, `components/`, `lib/`,
  `supabase/` no encontró nada), y `.env*` en `.gitignore`.

## 17. Accesibilidad WCAG 2.1 AA (Fase 5)

Revisión manual (sin un proyecto de Supabase real en este entorno para
correr un lector de pantalla contra la app en vivo — misma limitación de
red del README). Hallazgos y su corrección:

- **Contraste de color insuficiente en el color de acento (corregido).**
  `--accent` (rojo racing) se usa sobre todo como **texto** — mensajes de
  error, enlaces, el logotipo — y solo alcanzaba ~4.25:1 contra el fondo
  oscuro y ~4.33:1 contra el claro, por debajo del 4.5:1 que exige AA para
  texto normal. Un solo tono no puede pasar 4.5:1 contra un fondo muy
  oscuro Y uno muy claro a la vez (matemáticamente: el rango de luminancia
  que sirve para uno excluye al otro), así que `--accent` ahora es
  **distinto por tema**: `racing-red-400` (más brillante, ~5.5:1) en modo
  oscuro, `racing-red-600` (más oscuro, ~6:1) en modo claro. Se agregó un
  token separado, `--accent-solid` (`racing-red-600` fijo en ambos temas),
  para donde el acento es un **fondo sólido** con texto claro encima
  (botón primario, badge "accent") — ahí sí importa un tono que funcione
  bien con texto blanco específicamente (~6.5:1), sin importar el tema.
- **Texto blanco sobre verde en modo claro (corregido).** El badge/estado
  "positive" usaba texto blanco sobre `tech-green-600` en modo claro
  (~3:1, falla AA). Se cambió `--positive-foreground` a un texto oscuro en
  modo claro (~6.5:1) — modo oscuro ya usaba un texto oscuro sobre
  `tech-green-500` y no necesitó cambio.
- **Indicador de urgencia sin badge (corregido).** `/app/casos` marcaba la
  urgencia "crítica"/"alta" con texto de color plano (`text-accent`/
  `text-warning`) en vez del componente `Badge` ya usado en el resto de la
  tabla — inconsistente y, en el caso de `text-warning`, por debajo de
  4.5:1 en modo claro. Ahora usa `<Badge variant="accent"|"warning">`,
  igual que el resto de indicadores de estado.
- **Errores de formulario sin anunciarse a lectores de pantalla
  (corregido).** El patrón `{state.error && <p>...</p>}` que usan ~11
  formularios de Server Actions (superadmin, facturación, TAP
  Intelligence, sucursales, tarjetas, configuración, casos, equipo,
  reportes programados, onboarding, encuesta pública) no tenía
  `role="alert"` — un error después de enviar el formulario no se anuncia
  si el foco no se movió. Los formularios de auth (`/login`, `/registro`,
  `/restablecer`, `/demo`) ya lo tenían; se igualó el resto.
- **Chips de categoría sin estado expuesto (corregido).** En la encuesta
  pública (`/r/[code]`), los botones de categoría ("¿Qué ocurrió?") solo
  comunicaban su selección con color — se agregó `aria-pressed`.
- **Filtros por enlace sin indicar cuál está activo (corregido).** Los
  filtros de estado en `/app/casos` y `/app/alertas` son `<Link>` que
  cambian el color activo solo visualmente — se agregó
  `aria-current="true"` al filtro seleccionado.
- **Revisado y sin hallazgos**: `lang="es"` en `<html>`, skip-link
  funcional a `#main-content`, `:focus-visible` con anillo de 2px visible
  en toda la app, `prefers-reduced-motion` respetado, imágenes con `alt`
  (logo de la encuesta, código QR de la tarjeta), labels asociados
  correctamente vía `htmlFor`/`id` en todos los formularios, componentes
  Radix (Dialog, DropdownMenu, Select, Tabs, Switch, Checkbox) que ya
  traen manejo de foco/teclado/ARIA correcto de fábrica.
- **No verificado en este entorno**: no se pudo correr un lector de
  pantalla real (VoiceOver/NVDA) ni `axe-core`/Lighthouse contra la app
  desplegada — la revisión fue manual, leyendo el JSX y calculando
  contraste de color programáticamente (fórmula de luminancia relativa de
  WCAG). Recomendado antes de producción.

## 18. Pruebas automatizadas (Fase 5)

Sin un proyecto de Supabase conectado en este entorno (ver README), las
pruebas se dividen en lo que sí es honesto probar aquí y lo que no:

**Unitarias — `npm test` (Vitest, `tests/unit/`)**: lógica pura que no
toca la base de datos ni la red — `resolvePeriod` (rangos de fecha del
dashboard/reportes), `can` (matriz de permisos RBAC), `hashIp`/
`parseUserAgent`/`isLikelyBot` (`lib/tracking.ts`), `escapeHtml`
(`lib/email.ts` — incluye un caso que reproduce el intento de inyección
HTML corregido en la auditoría de seguridad), `isAllowedPushEndpoint`
(`lib/notify.ts` — incluye el intento de SSRF corregido), `cn`/
`generatePublicCode` (`lib/utils.ts`), y `confidenceFor`/
`satisfactionScore` de `lib/intelligence.ts` (se exportaron desde el motor
de TAP Intelligence específicamente para poder probarlas). El paquete
`server-only` se alias a un no-op en `vitest.config.mts` porque su
comportamiento real (lanzar si se importa fuera de un Server Component) no
tiene sentido bajo un test runner de Node plano.

**End-to-end — `npm run test:e2e` (Playwright, `tests/e2e/`)**: solo lo
que no depende de Supabase — el sitio público (home, precios con su
fallback honesto de "no pudimos cargar los planes", páginas legales, 404,
el skip-link por teclado), el formulario `/demo` completo (valida con Zod
y opcionalmente manda correo por Resend, que se salta con gracia sin
`RESEND_API_KEY` — no toca la base de datos, así que sí se puede probar de
extremo a extremo) y que `/login`/`/registro`/`/recuperar` renderizan con
sus campos correctamente etiquetados. **No** se prueban los flujos que sí
requieren Supabase (registro real, tap de tarjeta NFC, encuesta completa,
dashboard con datos, TAP Intelligence, Stripe) — eso necesita un proyecto
de Supabase de pruebas y credenciales reales, ninguno de los dos
disponibles en este entorno.

**Cobertura pendiente para antes de producción**: pruebas de integración
contra un Supabase real (o local vía `supabase start`) que ejerciten
RLS con usuarios reales — la metodología ya se usó manualmente varias
veces durante el desarrollo (Postgres real + rol sin `BYPASSRLS`, ver §3),
pero no está automatizada como suite repetible todavía.

## 19. Optimización de Core Web Vitals (Fase 5)

Enfocada en `/t/[code]` → `/r/[code]`, la única ruta que un cliente real
recorre en cada tap físico — el resto de la app la usa el negocio, no sus
clientes, así que su latencia importa menos.

- **`/t/[code]` (`app/t/[code]/route.ts`) pasó de 5 a 3 etapas
  secuenciales de base de datos.** El chequeo de bot ahora es lo primero
  (antes de cualquier consulta — no vale la pena gastar una consulta en
  tráfico que se va a redirigir sin registrar nada), la búsqueda de la
  tarjeta y el conteo de rate-limit corren en paralelo (`Promise.all`,
  ninguno depende del otro), y el conteo de duplicados sigue siendo
  secuencial porque sí depende de la tarjeta. El insert de `tap_events` y
  el de `feedback_sessions` **se dejaron secuenciales a propósito**: el
  segundo necesita el `id` que genera el primero, y paralelizarlos con un
  UUID generado en el cliente habría cambiado el modo de falla — hoy, si
  `tap_events` falla, `feedback_sessions` igual se crea con
  `tap_event_id: null` (degradación elegante); paralelizado, una falla del
  primero habría tumbado al segundo por violación de llave foránea. Se
  prefirió confiabilidad sobre un ahorro marginal de latencia ahí.
- **`/r/[code]` (`app/r/[code]/page.tsx`) paraleliza sesión + categorías.**
  `getFeedbackSessionByToken` y `getFeedbackCategories` solo dependen de la
  tarjeta ya resuelta, no una de la otra — antes corrían en serie, ahora en
  `Promise.all`. `getSurveyCard` (`lib/data/survey.ts`) ya paralelizaba
  organización + sucursal desde antes.
- **CLS del logo del negocio.** El `<img>` del logo en la encuesta pública
  (URL arbitraria subida por el negocio, así que `next/image` no aplica
  sin una lista blanca de dominios que no existe) no tenía `width`/
  `height`, así que el navegador no podía reservar su espacio antes de
  cargarlo — un salto de layout justo antes de los botones de calificación,
  el elemento más importante de toda la ruta. Se agregaron `width={160}
  height={48}` explícitos.
- **Ya óptimo, sin cambios**: fuentes (`next/font/google`, autohospedadas,
  `display: "swap"`, sin bloqueo de render), `/t/*` y `/r/*` excluidos del
  refresco de sesión de Supabase en `proxy.ts` (rutas anónimas de alto
  tráfico), iconos de `lucide-react` importados individualmente
  (tree-shakeable).
- **No medido en este entorno**: sin Supabase conectado no hay manera de
  cargar `/t/[code]`/`/r/[code]` con datos reales y correr Lighthouse o
  medir Web Vitals de campo — las mejoras de esta sección se justifican
  por conteo de round-trips a la base de datos y por CLS estructural
  (ambos verificables leyendo el código), no por una métrica medida en
  vivo. Recomendado correr Lighthouse contra un despliegue real antes de
  producción.

## 20. Datos demo (Fase 5)

`supabase/seed_demo.sql` (ver README → "Datos demo") genera una
organización de ejemplo completa con ~30 días de actividad sintética.
Verificado igual que las migraciones — de cero contra Postgres 16 real,
con un `auth.users` de prueba — y ese proceso encontró dos bugs reales en
el propio script, ambos por no revisar primero qué ya hacían los triggers
de `0005_business_logic.sql`/`0004_rls_policies.sql`:

1. Insertaba manualmente la fila de `organization_members` del dueño,
   duplicando lo que ya hace el trigger `trg_organizations_bootstrap_owner`
   al insertar la organización (bootstrap del owner, §3) — violaba su
   restricción de unicidad.
2. Incrementaba manualmente `nfc_cards.total_taps`/`last_tap_at` por cada
   tap, duplicando al trigger `trg_tap_events_increment_card` — el
   conteo terminaba exactamente al doble del real (`sum(total_taps) = 2 ×
   count(tap_events)`, detectado comparando ambos).

Ambos se corrigieron quitando el insert/update redundante y dejando que el
trigger correspondiente haga su trabajo — la lección general: cualquier
script que inserte directamente en tablas con triggers de negocio debe
verificarse contra los efectos secundarios de esos triggers, no asumir que
está empezando de una base sin comportamiento implícito.
