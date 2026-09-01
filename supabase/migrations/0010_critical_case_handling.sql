-- Soporte para casos críticos/urgentes: un nuevo tipo de hallazgo para que
-- "Analizar ahora" en TAP Intelligence detecte y muestre primero cualquier
-- caso crítico o urgente sin resolver, y una categoría + sugerencia
-- dedicada para reportes de acoso o conducta inapropiada del personal, que
-- requieren un manejo muy distinto al de una queja de servicio regular.
--
-- IMPORTANTE: este archivo no inserta ningún ai_insights con
-- type = 'critical_case' — Postgres no permite usar un valor de enum nuevo
-- en la misma transacción donde se agregó con ALTER TYPE ... ADD VALUE. Ese
-- valor lo usa la aplicación (lib/intelligence.ts) en una transacción
-- posterior, ya con este ALTER TYPE confirmado.

alter type insight_type add value 'critical_case';

insert into public.feedback_categories (organization_id, sector, kind, code, label, sort_order)
values (null, null, 'negative', 'harassment', 'Acoso o conducta inapropiada del personal', 5);

insert into public.solution_playbook (category_code, diagnosis, customer_response, internal_action) values
('harassment',
 'El cliente reportó una posible situación de acoso o conducta inapropiada por parte de un miembro del personal. Esto no es una queja de servicio regular — es un asunto de seguridad y conducta que requiere atención inmediata de la dirección, no del personal de piso.',
 'Hola, gracias por tener la confianza de contarnos esto — lo tomamos con toda la seriedad que merece y lamento mucho que hayas pasado por esta situación. Un miembro de la dirección se va a poner en contacto contigo directamente y lo antes posible para escucharte con calma y ver qué necesitas de nuestra parte. Si en algún momento sientes que tu seguridad está en riesgo, por favor no dudes en contactar también a las autoridades.',
 'Escalar de inmediato a la persona de mayor autoridad disponible (dueño/gerente) — nunca dejarlo en manos del personal de piso. Separar temporalmente al empleado señalado de cualquier trato con clientes mientras se investiga. Documentar por escrito fecha, hora y detalles exactos del reporte. Contactar personalmente al cliente ese mismo día, no solo por mensaje. Consultar con RR.HH. o asesoría legal antes de tomar una decisión final. Para desescalar: prioriza que el cliente se sienta escuchado y tomado en serio por encima de defender al empleado o al negocio, evita cualquier lenguaje defensivo o que minimice lo ocurrido, y ofrece un canal directo (llamada, no solo mensajes) con una persona de confianza del negocio.')
on conflict (category_code) do nothing;
