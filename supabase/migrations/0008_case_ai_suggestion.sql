-- TAP Intelligence: sugerencia de IA por caso (comentario negativo individual).
-- No se requieren cambios de RLS: la política de UPDATE ya existente sobre
-- public.cases cubre estas columnas nuevas igual que el resto de la fila.

alter table public.cases
  add column if not exists ai_suggestion jsonb,
  add column if not exists ai_suggestion_generated_at timestamptz;
