-- Base de conocimiento de soluciones pre-escritas para TAP Intelligence.
-- Cada fila cubre un "code" de public.feedback_categories (catálogo global,
-- organization_id null) con un diagnóstico, un mensaje listo para el cliente
-- y una acción interna concreta — no depende de ninguna API externa ni de
-- costo alguno. Cuando un caso coincide con una o más categorías, se muestra
-- la entrada correspondiente; si además hay IA configurada (ver lib/ai.ts),
-- esta base sigue siendo la fuente principal y la IA queda como refuerzo
-- opcional para categorías sin entrada aún (p.ej. "Otro" o categorías por
-- sector todavía no cubiertas).

create table public.solution_playbook (
  id uuid primary key default gen_random_uuid(),
  category_code text not null unique,
  diagnosis text not null,
  customer_response text not null,
  internal_action text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.solution_playbook enable row level security;

-- Contenido de referencia compartido, sin datos sensibles — lectura abierta
-- a cualquier usuario autenticado, igual que el catálogo de categorías.
create policy "solution_playbook_select" on public.solution_playbook
  for select to authenticated using (true);

create policy "solution_playbook_write_superadmin" on public.solution_playbook
  for all using (public.is_superadmin())
  with check (public.is_superadmin());

insert into public.solution_playbook (category_code, diagnosis, customer_response, internal_action) values

('poor_service',
 'El cliente sintió que la atención en general fue deficiente — no necesariamente un incidente puntual, sino la experiencia completa de servicio.',
 'Hola, gracias por tomarte el tiempo de contarnos tu experiencia. Lamento mucho que la atención no haya estado a la altura de lo que buscamos ofrecer. Nos tomamos esto muy en serio y ya estamos revisando qué pasó para que no se repita. Si quieres platicarlo más a detalle, aquí estamos.',
 'Revisar con el turno/equipo que atendió al cliente en la fecha y hora del caso; reforzar en la siguiente junta de equipo los estándares básicos de atención.'),

('rude_staff',
 'Un miembro del personal trató al cliente de forma grosera o poco profesional — es un problema de conducta individual, no solo de proceso.',
 'Hola, lamento mucho lo que viviste. El trato que describes no es aceptable y no representa cómo queremos que se sienta cada cliente aquí. Voy a atender esto directamente con la persona involucrada. Gracias por decírnoslo — nos ayuda a corregirlo.',
 'Identificar quién atendió al cliente ese día y turno; tener una conversación directa y privada sobre el incidente antes de que termine la semana.'),

('untrained_staff',
 'El personal no supo resolver algo básico o mostró falta de conocimiento del producto/servicio — apunta a un vacío de capacitación, no de actitud.',
 'Hola, gracias por tu comentario. Notamos que no recibiste la información o el servicio que esperabas, y eso viene de un tema de capacitación de nuestro lado, no tuyo. Ya estamos trabajando en reforzar esto con el equipo.',
 'Agregar el tema específico mencionado por el cliente a la próxima sesión de capacitación del equipo; confirmar que quede documentado en el material de inducción.'),

('excessive_wait',
 'El cliente esperó más tiempo del razonable antes de ser atendido — puede ser un problema de personal insuficiente en ese horario o de flujo operativo.',
 'Hola, una disculpa por el tiempo que tuviste que esperar — sabemos que tu tiempo vale y no debiste esperar tanto. Estamos revisando cómo mejorar el flujo en ese horario para que no vuelva a pasar.',
 'Revisar el horario y día del caso contra el número de personal en turno ese momento; evaluar si se necesita reforzar personal en ese horario específico.'),

('slow_service',
 'El servicio en sí (una vez atendido el cliente) fue más lento de lo esperado — distinto a la espera inicial, aquí el proceso completo tomó demasiado.',
 'Hola, gracias por tu paciencia y por contarnos esto. El servicio no debió tomar tanto tiempo y vamos a revisar en qué parte del proceso se hizo lento.',
 'Mapear el proceso de principio a fin para identificar en qué paso se generó el retraso; ajustar si hay un cuello de botella claro.'),

('wrong_order',
 'Al cliente le entregaron un pedido distinto al que solicitó — probablemente un error de comunicación o de registro del pedido.',
 'Hola, una disculpa muy sincera por el error en tu pedido. Eso no debió pasar. Nos gustaría corregirlo — cuéntanos cómo prefieres que lo resolvamos (reposición, reembolso, u otra opción) y lo atendemos de inmediato.',
 'Revisar con quien tomó el pedido si fue un error de captura o de comunicación verbal; ofrecer al cliente una compensación razonable (reposición o reembolso parcial).'),

('wrong_product',
 'El producto entregado no correspondía al que el cliente pidió o esperaba — similar a pedido incorrecto pero específico del producto en sí.',
 'Hola, lamento que el producto no haya sido el correcto. Queremos resolverlo bien — dinos si prefieres el cambio por el producto correcto o un reembolso, y lo hacemos sin complicaciones.',
 'Verificar en el punto de entrega/venta si el etiquetado o la comunicación del producto fue clara; corregir de inmediato si hay confusión en el etiquetado.'),

('poor_quality',
 'El cliente considera que el producto o servicio recibido no cumplió con el estándar de calidad esperado.',
 'Hola, gracias por decírnoslo — la calidad que describes no es la que buscamos ofrecer. Nos gustaría saber más detalles para identificar qué pasó, y por supuesto, resolverlo contigo.',
 'Solicitar detalle específico del cliente (foto si aplica) y revisar el lote, proveedor o proceso involucrado ese día.'),

('cold_product',
 'El producto llegó frío cuando debía servirse/entregarse caliente — apunta a un problema de tiempo entre preparación y entrega.',
 'Hola, una disculpa — el producto debió llegarte caliente. Vamos a revisar el tiempo entre preparación y entrega para corregirlo. Si quieres, con gusto te lo reponemos.',
 'Medir el tiempo real entre que el producto sale de preparación y llega al cliente; ajustar el proceso si el tiempo es mayor al esperado.'),

('damaged_product',
 'El cliente recibió un producto dañado o en mal estado físico.',
 'Hola, lamento mucho que el producto haya llegado dañado. Vamos a reponerlo o reembolsarlo, lo que prefieras — solo dinos cómo seguimos.',
 'Revisar el manejo/empaque del producto en el punto donde pudo haberse dañado (almacén, transporte, entrega) y ajustar si es un patrón recurrente.'),

('cleanliness',
 'El cliente percibió falta de limpieza en el establecimiento en general (no específicamente en sanitarios).',
 'Hola, gracias por avisarnos. La limpieza es algo que tomamos muy en serio y vamos a revisar de inmediato el área que mencionas.',
 'Hacer una revisión de limpieza inmediata en el área señalada; verificar que la rutina de limpieza de esa zona se esté cumpliendo según lo programado.'),

('restroom_issues',
 'El cliente tuvo una mala experiencia específicamente con el estado de los sanitarios.',
 'Hola, una disculpa por el estado de los sanitarios — no es el estándar que buscamos mantener. Ya estamos revisando el área para corregirlo.',
 'Revisar de inmediato el estado de los sanitarios y la frecuencia de limpieza asignada; ajustar el checklist de limpieza si es necesario.'),

('high_price',
 'El cliente percibe que el precio pagado fue elevado — esto es una percepción de precio, no necesariamente de valor recibido.',
 'Hola, gracias por tu comentario sobre el precio. Nos gustaría entender mejor tu experiencia para ver si hay algo específico que podamos mejorar o aclarar sobre lo que incluye.',
 'Revisar si el precio y lo que incluye está bien comunicado en el punto de venta; considerar si aplica alguna aclaración o ajuste en la comunicación de precios.'),

('poor_value',
 'El cliente sintió que lo recibido no correspondía a lo que pagó — a diferencia de "precio elevado", aquí el problema es la relación calidad-precio, no el precio en sí.',
 'Hola, gracias por tu honestidad. Queremos que sientas que lo que pagas vale la pena, así que nos gustaría saber más sobre qué esperabas para ver cómo mejorar esa relación calidad-precio.',
 'Comparar la oferta/producto con la de la competencia directa en ese rango de precio; evaluar si hay margen para mejorar el producto o ajustar el precio.'),

('billing_error',
 'Hubo un error en el cobro al cliente (monto incorrecto, cargo duplicado, etc.).',
 'Hola, una disculpa por el error en el cobro — vamos a revisarlo y corregirlo de inmediato. Por favor compárteme más detalles (o tu ticket/folio) para resolverlo cuanto antes.',
 'Revisar la transacción específica en el sistema de cobro; corregir el cargo y confirmar con el cliente que quedó resuelto.'),

('payment_issue',
 'El cliente tuvo dificultades técnicas u operativas al momento de pagar (terminal, métodos de pago no disponibles, etc.).',
 'Hola, lamento el problema que tuviste al pagar. Vamos a revisar qué falló para evitar que te vuelva a pasar. Gracias por tu paciencia.',
 'Verificar el estado de las terminales/métodos de pago disponibles en la sucursal; reportar a soporte técnico si hay una falla recurrente.'),

('unavailable',
 'El cliente buscaba un producto o servicio que no estaba disponible en el momento de su visita.',
 'Hola, una disculpa por no tener disponible lo que buscabas. Nos ayuda mucho saber qué producto/servicio fue para poder planear mejor el inventario o la agenda.',
 'Registrar el producto/servicio específico solicitado; revisar si hay un patrón de demanda no cubierta que valga la pena atender.'),

('uncomfortable_facilities',
 'El cliente encontró incómodas las instalaciones (mobiliario, espacio, temperatura, etc.).',
 'Hola, gracias por tu comentario sobre las instalaciones. Nos gustaría saber más detalles de qué te resultó incómodo para poder evaluar mejoras.',
 'Revisar el área específica mencionada por el cliente (mobiliario, temperatura, espacio) y evaluar si hay una mejora de bajo costo aplicable pronto.'),

('excessive_noise',
 'El cliente percibió el nivel de ruido en el establecimiento como excesivo para la experiencia que buscaba.',
 'Hola, gracias por decírnoslo. Vamos a revisar el nivel de ruido en el horario que nos comentas para ver qué podemos ajustar.',
 'Identificar la fuente del ruido (música, equipo, otros clientes) en el horario reportado; evaluar un ajuste de volumen o de zonificación.'),

('poor_communication',
 'Hubo una falla en cómo se le comunicó algo al cliente (información poco clara, contradictoria o insuficiente).',
 'Hola, una disculpa si la información que recibiste no fue clara. Queremos asegurarnos de que sepas exactamente qué esperar — cuéntanos qué te faltó saber y con gusto te lo aclaramos.',
 'Revisar el punto de contacto donde se dio la información (personal, señalética, sitio web) y corregir la fuente de la confusión.'),

('unresolved_problem',
 'El cliente reportó un problema anterior que no fue resuelto — esto es especialmente sensible porque ya hubo un primer intento fallido de solución.',
 'Hola, una disculpa muy sincera — sabemos que ya nos habías buscado por esto antes y no debió quedar sin resolver. Vamos a darle seguimiento personal esta vez hasta cerrarlo contigo.',
 'Buscar el caso o queja anterior relacionada; asignar a una sola persona responsable de darle seguimiento hasta el cierre confirmado con el cliente.'),

('late_delivery',
 'La entrega (producto o servicio) llegó después del tiempo prometido o esperado.',
 'Hola, una disculpa por el retraso en la entrega — no fue lo que te prometimos. Cuéntanos si aún necesitas que lo resolvamos y con gusto lo priorizamos.',
 'Revisar en qué punto del proceso de entrega se generó el retraso (preparación, logística, comunicación) y corregir el cuello de botella.'),

('other',
 'El cliente reportó un problema que no encaja claramente en las categorías existentes — vale la pena leer su comentario completo para entender el contexto real.',
 'Hola, gracias por tomarte el tiempo de escribirnos. Queremos entender bien lo que pasó — ¿nos puedes platicar un poco más para poder ayudarte de la mejor manera?',
 'Leer el comentario completo del cliente con atención; si el patrón se repite con otros clientes, considerar dar de alta una categoría específica para darle seguimiento.')

on conflict (category_code) do nothing;
