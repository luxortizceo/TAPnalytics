-- Cierre de ciclo real con el cliente: cuando un caso pasa a "resuelto" (ver
-- app/app/casos/actions.ts) se le manda un correo con un enlace público de
-- un solo uso — mismo patrón que /t/[code] y /r/[code] — para que califique
-- cómo quedó la solución (Mala/Buena/Excelente), igual que el tap físico
-- original. resolution_feedback_token es independiente del id real del caso
-- para no exponer un UUID interno en un enlace público de correo.

alter table public.cases
  add column resolution_feedback_token text unique,
  add column resolution_email_sent_at timestamptz,
  add column resolution_rating experience_rating,
  add column resolution_rating_at timestamptz,
  add column resolution_comment text;

create index cases_resolution_feedback_token_idx on public.cases (resolution_feedback_token)
  where resolution_feedback_token is not null;
