-- Asistencia/puntualidad: liga un team_member (roster físico) a un login
-- real (organization_members via auth.uid()), captura coordenadas de
-- referencia por sucursal, y registra cada entrada/salida con la
-- ubicación GPS del teléfono en el momento del check-in.

alter table public.locations
  add column latitude double precision,
  add column longitude double precision,
  add column checkin_radius_meters integer not null default 150;

alter table public.team_members
  add column user_id uuid references auth.users(id) on delete set null,
  add column shift_start_time time;

-- Un login solo puede estar ligado a una persona del roster por
-- organización (evita que "dar acceso" se aplique dos veces al mismo
-- usuario dentro de la misma empresa).
create unique index team_members_org_user_unique_idx
  on public.team_members (organization_id, user_id)
  where user_id is not null;

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  checkin_lat double precision not null,
  checkin_lng double precision not null,
  checkin_distance_meters numeric not null,
  status text not null check (status in ('on_time', 'late')),
  created_at timestamptz not null default now()
);

create index attendance_records_organization_id_idx on public.attendance_records (organization_id);
create index attendance_records_team_member_id_idx on public.attendance_records (team_member_id);
create index attendance_records_location_checked_in_idx on public.attendance_records (location_id, checked_in_at desc);

alter table public.attendance_records enable row level security;

-- owner/admin/manager/analyst ven toda la asistencia de su organización;
-- un empleado ligado a un team_member ve solo sus propios registros.
create policy "attendance_select" on public.attendance_records
  for select using (
    public.has_org_role(organization_id, array['owner','admin','manager','analyst']::org_role[])
    or exists (
      select 1 from public.team_members tm
      where tm.id = team_member_id and tm.user_id = auth.uid()
    )
  );

-- El check-in solo lo puede insertar la propia persona (vía su team_member
-- ligado), nunca en nombre de alguien más — la validación de distancia al
-- radio de la sucursal ocurre en el server action antes del insert.
create policy "attendance_insert_self" on public.attendance_records
  for insert with check (
    exists (
      select 1 from public.team_members tm
      where tm.id = team_member_id
        and tm.user_id = auth.uid()
        and tm.organization_id = organization_id
    )
  );

-- El check-out lo hace la propia persona; un gerente+ puede corregir un
-- registro (ej. olvidó marcar salida).
create policy "attendance_update" on public.attendance_records
  for update using (
    exists (
      select 1 from public.team_members tm
      where tm.id = team_member_id and tm.user_id = auth.uid()
    )
    or public.has_org_role(organization_id, array['owner','admin','manager']::org_role[])
  )
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.id = team_member_id and tm.user_id = auth.uid()
    )
    or public.has_org_role(organization_id, array['owner','admin','manager']::org_role[])
  );
