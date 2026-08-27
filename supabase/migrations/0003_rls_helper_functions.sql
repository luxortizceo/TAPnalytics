-- TAPnalytics — 0003: RLS helper functions
-- SECURITY DEFINER functions avoid infinite recursion when a table's own
-- policy would otherwise need to query organization_members through RLS.

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_superadmin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.current_org_role(p_organization_id uuid)
returns org_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.organization_members
  where organization_id = p_organization_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin() or exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.has_org_role(p_organization_id uuid, p_roles org_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin() or exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and status = 'active'
      and role = any(p_roles)
  );
$$;

-- True when the user's role scopes them to specific locations (manager/
-- employee/viewer with member_locations rows) and p_location_id is one of
-- them, OR when the role has organization-wide access (owner/admin/analyst)
-- or no scoping rows exist for that member (defaults to org-wide access).
create or replace function public.can_access_location(p_organization_id uuid, p_location_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_role org_role;
  v_scoped_count int;
begin
  if public.is_superadmin() then
    return true;
  end if;

  select id, role into v_member_id, v_role
  from public.organization_members
  where organization_id = p_organization_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;

  if v_member_id is null then
    return false;
  end if;

  if v_role in ('owner', 'admin', 'analyst') then
    return true;
  end if;

  select count(*) into v_scoped_count
  from public.member_locations
  where organization_member_id = v_member_id;

  if v_scoped_count = 0 then
    return true;
  end if;

  return exists (
    select 1 from public.member_locations
    where organization_member_id = v_member_id
      and location_id = p_location_id
  );
end;
$$;
