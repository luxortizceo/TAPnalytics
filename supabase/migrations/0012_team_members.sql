-- Roster de personal físico del negocio (barberos, meseros, entrenadores...),
-- separado de organization_members (que son *logins* de Tapnalytics). La
-- mayoría del personal nunca inicia sesión en la app, pero conviene saber
-- quién forma parte del equipo para poder asignarle una tarjeta NFC
-- específica (ej. "Barbero: Carlos") — así una tarjeta queda ligada a una
-- persona sin necesidad de extraer nombres de comentarios de texto libre,
-- algo mucho más sensible.

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  name text not null,
  role_title text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_members_organization_id_idx on public.team_members (organization_id);
create index team_members_location_id_idx on public.team_members (location_id);

alter table public.team_members enable row level security;

create policy "team_members_select" on public.team_members
  for select using (public.is_org_member(organization_id));

create policy "team_members_insert_manager" on public.team_members
  for insert with check (public.has_org_role(organization_id, array['owner','admin','manager']::org_role[]));

create policy "team_members_update_manager" on public.team_members
  for update using (public.has_org_role(organization_id, array['owner','admin','manager']::org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','manager']::org_role[]));

create policy "team_members_delete_admin" on public.team_members
  for delete using (public.has_org_role(organization_id, array['owner','admin']::org_role[]));

-- nfc_cards.employee_id (from 0002_core_tables.sql) pointed at auth.users
-- and was never wired up anywhere in the app (confirmed unused) — replaced
-- here with a proper link to the new roster, which matches how cards
-- actually get assigned: to a person on staff, not necessarily someone
-- with a Tapnalytics login.
alter table public.nfc_cards drop column employee_id;
alter table public.nfc_cards add column team_member_id uuid references public.team_members(id) on delete set null;
