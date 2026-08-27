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

1. `GET /t/[code]` (`src/app/t/[code]/route.ts`) resuelve la tarjeta por
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
5. `/r/[code]` (`src/app/r/[code]/page.tsx`) exige esa cookie; si falta,
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
- **UI** (`src/lib/permissions.ts`): una matriz rol → acción
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
✅ `alerts`, ✅ `notifications` (in-app, con campana en el shell). Pendiente:
`notification_preferences` (elegir canal/horario por usuario — Fase 4, junto
con el envío real por correo/WhatsApp/push)

**Reportes** — usados en la vista web/CSV: `feedback_sessions`,
`feedback_responses`, `cases`. Las tablas `reports`/`report_schedules`
(historial de reportes generados y envío programado) quedan para la Fase 4

**Inteligencia** — `ai_insights`, `recommendations`, `corrective_actions`

**Suscripciones** — ✅ `plans` (seed + lectura pública),
`subscriptions`, `invoices`

**Plataforma** — `integrations`, `audit_logs`

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
- `src/proxy.ts` (Proxy — el nombre de Middleware en Next.js 16) refresca la
  sesión en cada navegación y protege `/onboarding`, `/app` y `/admin`.
- 2FA: columna `profiles.two_factor_enabled` preparada; la UI se
  implementará usando la API de MFA de Supabase Auth en una fase posterior.
- Política de contraseña: mínimo 10 caracteres, mayúscula, minúscula y
  número (`src/lib/validations/auth.ts`).

## 7. Onboarding

Wizard de 6 pasos con barra de progreso, persistido en
`organizations.onboarding_step` para poder "guardar y continuar después":
empresa+sector → sucursal → marca/logo+Google Reviews → landing → tarjeta NFC
→ prueba de enlace. El último paso abre el enlace público real
(`/t/[código]`) — desde la Fase 2 ya no es una vista previa: tapearlo
registra un tap de verdad y abre la encuesta real.

## 8. Casos, alertas y dashboard (Fase 3)

**De feedback a caso, en el mismo request.** Cuando `submitFeedback`
(`src/app/r/[code]/actions.ts`) guarda una encuesta calificada "Mala":

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

## 11. Próximos pasos por fase

- **Fase 4** (siguiente): TAP Intelligence (sentimiento, detección de
  anomalías, recomendaciones con evidencia — la base de datos de
  `ai_insights`/`recommendations`/`corrective_actions` ya existe),
  suscripciones con Stripe + webhooks, panel de superadministrador,
  integraciones reales (WhatsApp, Web Push, envío de alertas por correo),
  reportes programables (`report_schedules`).
- **Fase 5**: pruebas end-to-end, auditoría de seguridad, optimización de
  Core Web Vitals en la landing NFC, documentación final, despliegue.

## 12. Límites conocidos de la Fase 2 (honestidad, no deuda oculta)

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

## 13. Límites conocidos de la Fase 3

- Las alertas y notificaciones son solo **in-app** por ahora — el canal
  `email`/`push`/`whatsapp` existe en el modelo (`alert_rules.channels`,
  `notification_channel`) pero no se dispara ningún envío real todavía; se
  conecta en la Fase 4 junto con las demás integraciones.
- Los tipos de alerta activables hoy son `new_bad_experience` y
  `urgent_comment` (los únicos con lógica de disparo real). El resto del
  enum `alert_type` (racha de quejas, problema recurrente, tarjeta sin
  actividad, etc.) necesita analizar tendencias en el tiempo — eso es
  trabajo de TAP Intelligence, Fase 4.
- El índice de satisfacción es una fórmula simple y documentada
  (`(excelente×1 + buena×0.5) / calificadas × 100`), no un modelo estadístico
  — es intencional y transparente, no un intento de simular sofisticación
  que no existe.
- "Guardar como PDF" en Reportes usa el diálogo de impresión del navegador
  (CSS `@media print`), no genera un PDF en el servidor — funciona en todos
  los navegadores modernos sin dependencias nuevas, pero el resultado
  depende de la configuración de impresión del usuario.
- El export de Reportes es CSV; Excel (`.xlsx`) queda para la Fase 4.
- El enmascarado a nivel de columna de los datos de contacto de un caso
  (mencionado en la §4) sigue pendiente — hoy `view_sensitive` es
  todo-o-nada por fila, no por campo.
