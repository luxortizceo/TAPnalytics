-- TAPnalytics — baseline seed (safe to run in any environment)
-- Global feedback category catalog + subscription plans.
-- Organization/location/NFC/tap demo data lives in supabase/seed_demo.sql
-- and must never be run against a production project.

-- ---------------------------------------------------------------------------
-- feedback_categories — global catalog (organization_id null = applies to
-- every organization; orgs can hide/reorder via their own override rows).
-- ---------------------------------------------------------------------------
insert into public.feedback_categories (organization_id, sector, kind, code, label, sort_order) values
  (null, null, 'negative', 'poor_service', 'Mala atención', 10),
  (null, null, 'negative', 'rude_staff', 'Personal grosero', 20),
  (null, null, 'negative', 'untrained_staff', 'Falta de capacitación', 30),
  (null, null, 'negative', 'excessive_wait', 'Tiempo de espera excesivo', 40),
  (null, null, 'negative', 'slow_service', 'Servicio lento', 50),
  (null, null, 'negative', 'wrong_order', 'Pedido incorrecto', 60),
  (null, null, 'negative', 'wrong_product', 'Producto equivocado', 70),
  (null, null, 'negative', 'poor_quality', 'Mala calidad', 80),
  (null, null, 'negative', 'cold_product', 'Producto frío', 90),
  (null, null, 'negative', 'damaged_product', 'Producto dañado', 100),
  (null, null, 'negative', 'cleanliness', 'Falta de limpieza', 110),
  (null, null, 'negative', 'restroom_issues', 'Problemas en sanitarios', 120),
  (null, null, 'negative', 'high_price', 'Precio elevado', 130),
  (null, null, 'negative', 'poor_value', 'Mala relación calidad-precio', 140),
  (null, null, 'negative', 'billing_error', 'Cobro incorrecto', 150),
  (null, null, 'negative', 'payment_issue', 'Problemas con el pago', 160),
  (null, null, 'negative', 'unavailable', 'Falta de disponibilidad', 170),
  (null, null, 'negative', 'uncomfortable_facilities', 'Instalaciones incómodas', 180),
  (null, null, 'negative', 'excessive_noise', 'Ruido excesivo', 190),
  (null, null, 'negative', 'poor_communication', 'Mala comunicación', 200),
  (null, null, 'negative', 'unresolved_problem', 'Problema sin resolver', 210),
  (null, null, 'negative', 'late_delivery', 'Entrega tardía', 220),
  (null, null, 'negative', 'other', 'Otro', 999),

  (null, 'restaurant', 'negative', 'cold_food', 'Comida fría', 300),
  (null, 'restaurant', 'negative', 'bad_taste', 'Mal sabor', 310),
  (null, 'restaurant', 'negative', 'wrong_cooking', 'Cocción incorrecta', 320),
  (null, 'restaurant', 'negative', 'unfresh_ingredients', 'Ingredientes poco frescos', 330),
  (null, 'restaurant', 'negative', 'insufficient_portion', 'Porción insuficiente', 340),
  (null, 'restaurant', 'negative', 'incomplete_order', 'Pedido incompleto', 350),
  (null, 'restaurant', 'negative', 'bill_error', 'Error en la cuenta', 360),
  (null, 'restaurant', 'negative', 'dirty_table', 'Mesa sucia', 370),
  (null, 'restaurant', 'negative', 'dirty_cutlery', 'Cubiertos sucios', 380),
  (null, 'restaurant', 'negative', 'dirty_restroom', 'Sanitarios sucios', 390),
  (null, 'restaurant', 'negative', 'slow_ordering', 'Tiempo excesivo para ordenar', 400),
  (null, 'restaurant', 'negative', 'slow_food_delivery', 'Tiempo excesivo para recibir alimentos', 410),
  (null, 'restaurant', 'negative', 'inattentive_staff', 'Personal poco atento', 420),
  (null, 'restaurant', 'negative', 'reservation_issue', 'Problema con reservación', 430),
  (null, 'restaurant', 'negative', 'delivery_issue', 'Problema con entrega a domicilio', 440),

  (null, null, 'positive', 'excellent_service', 'Excelente atención', 10),
  (null, null, 'positive', 'speed', 'Rapidez', 20),
  (null, null, 'positive', 'friendliness', 'Amabilidad', 30),
  (null, null, 'positive', 'quality', 'Calidad', 40),
  (null, null, 'positive', 'cleanliness', 'Limpieza', 50),
  (null, null, 'positive', 'atmosphere', 'Ambiente', 60),
  (null, null, 'positive', 'good_price', 'Buen precio', 70),
  (null, null, 'positive', 'facilities', 'Instalaciones', 80),
  (null, null, 'positive', 'problem_resolution', 'Resolución de problemas', 90),
  (null, null, 'positive', 'standout_product', 'Producto destacado', 100),
  (null, null, 'positive', 'standout_staff', 'Personal destacado', 110)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- plans — feature flags only; prices are null (configure per environment in
-- the plans table or via the superadmin panel, never hardcode in app code).
-- ---------------------------------------------------------------------------
insert into public.plans (code, name, description, max_locations, max_cards, max_users, features, trial_days, sort_order) values
  ('starter', 'Starter', 'Para un primer establecimiento que empieza a medir experiencia de cliente.',
    1, 3, 5,
    '["Dashboard básico", "Reporte mensual", "Alertas por correo"]'::jsonb, 14, 10),
  ('professional', 'Professional', 'Para negocios multisucursal que necesitan inteligencia accionable.',
    5, 50, 25,
    '["Hasta 5 sucursales", "Reportes avanzados", "TAP Intelligence", "Alertas multicanal", "Exportaciones"]'::jsonb, 14, 20),
  ('enterprise', 'Enterprise', 'Para cadenas y grupos empresariales con necesidades a medida.',
    null, null, null,
    '["Sucursales y tarjetas personalizadas", "Equipos y permisos avanzados", "SLA", "Integraciones", "Marca blanca opcional", "Soporte prioritario"]'::jsonb, 30, 30)
on conflict (code) do nothing;
