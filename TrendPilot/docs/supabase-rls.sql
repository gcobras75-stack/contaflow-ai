-- ============================================================
-- TrendPilot — Supabase RLS completo
-- Ejecutar DESPUÉS de supabase-migration.sql
-- ============================================================

-- ============================================================
-- TABLA PROFILES (vincula auth.users con roles y vendors)
-- ============================================================
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'vendor' check (role in ('admin','vendor')),
  vendor_id   uuid references vendors(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table profiles enable row level security;

-- Funciones auxiliares de rol (security definer = se ejecutan como superuser)
create or replace function is_admin()
returns boolean
language sql security definer stable
as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

create or replace function get_vendor_id()
returns uuid
language sql security definer stable
as $$
  select vendor_id from profiles where id = auth.uid()
$$;

-- Políticas de profiles
create policy "usuario ve su propio perfil"
  on profiles for select
  using (id = auth.uid());

create policy "admin ve todos los perfiles"
  on profiles for select
  using (is_admin());

create policy "usuario actualiza su propio perfil"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));


-- ============================================================
-- TABLA VENDORS
-- ============================================================

-- vendor ve y edita solo sus propios datos
create policy "vendor lee su registro"
  on vendors for select
  using (id = get_vendor_id() or is_admin());

create policy "vendor actualiza su registro"
  on vendors for update
  using (id = get_vendor_id())
  with check (
    id = get_vendor_id()
    -- el vendedor no puede cambiar su propio status ni plan
    and status = (select status from vendors where id = get_vendor_id())
    and plan   = (select plan   from vendors where id = get_vendor_id())
  );

create policy "admin gestiona todos los vendors"
  on vendors for all
  using (is_admin())
  with check (is_admin());

-- Nadie puede eliminar vendors (solo desactivar vía UPDATE)
-- No se crea policy de DELETE → está bloqueado por defecto


-- ============================================================
-- TABLA PRODUCTS
-- ============================================================

-- vendor ve solo sus productos
create policy "vendor lee sus productos"
  on products for select
  using (vendor_id = get_vendor_id() or is_admin());

-- vendor puede crear productos en status pending
create policy "vendor crea productos pending"
  on products for insert
  with check (
    vendor_id = get_vendor_id()
    and status = 'pending'
    and product_score = 0
  );

-- vendor puede editar sus productos (solo si están pending)
create policy "vendor edita sus productos pending"
  on products for update
  using (vendor_id = get_vendor_id() and status = 'pending')
  with check (
    vendor_id = get_vendor_id()
    -- no puede auto-aprobarse
    and status = 'pending'
  );

-- admin tiene control total sobre productos
create policy "admin gestiona todos los productos"
  on products for all
  using (is_admin())
  with check (is_admin());


-- ============================================================
-- TABLA CAMPAIGNS
-- ============================================================

-- vendor ve solo campañas de sus productos
create policy "vendor lee sus campañas"
  on campaigns for select
  using (vendor_id = get_vendor_id() or is_admin());

-- vendor NO puede crear, actualizar ni eliminar campañas
-- Solo service_role (sistema) y admin pueden hacerlo

create policy "admin gestiona todas las campañas"
  on campaigns for all
  using (is_admin())
  with check (is_admin());

-- NOTA: service_role bypassa RLS automáticamente en Supabase
-- Los workers de Railway usan service_role → pueden crear/pausar campañas


-- ============================================================
-- TABLA COMMISSIONS
-- ============================================================

-- vendor ve solo sus comisiones
create policy "vendor lee sus comisiones"
  on commissions for select
  using (vendor_id = get_vendor_id() or is_admin());

-- Nadie puede crear, editar o borrar comisiones via RLS
-- Solo service_role (workers Railway) puede hacerlo

create policy "admin lee todas las comisiones"
  on commissions for select
  using (is_admin());

-- Bloquear UPDATE y DELETE para todos (solo service_role bypassa)
-- No se crean políticas de insert/update/delete para usuarios normales


-- ============================================================
-- TABLA TRENDS
-- ============================================================

-- lectura pública para cualquier usuario autenticado
create policy "autenticados leen tendencias"
  on trends for select
  using (auth.role() = 'authenticated');

-- solo service_role puede escribir (workers Railway)
-- admin también puede
create policy "admin escribe tendencias"
  on trends for all
  using (is_admin())
  with check (is_admin());

-- nadie puede eliminar tendencias (ni admin)
-- si se necesita, hacerlo directamente con service_role


-- ============================================================
-- TABLA AD_CREATIVES
-- ============================================================

-- vendor ve creativos de sus campañas
create policy "vendor lee sus creativos"
  on ad_creatives for select
  using (
    exists(
      select 1 from campaigns
      where campaigns.id = ad_creatives.campaign_id
        and campaigns.vendor_id = get_vendor_id()
    )
    or is_admin()
  );

-- solo service_role y admin crean/modifican creativos
create policy "admin gestiona todos los creativos"
  on ad_creatives for all
  using (is_admin())
  with check (is_admin());


-- ============================================================
-- TABLA INFLUENCERS — solo admin y service_role
-- ============================================================

create policy "admin gestiona influencers"
  on influencers for all
  using (is_admin())
  with check (is_admin());

-- vendors NO tienen ninguna política → sin acceso


-- ============================================================
-- TABLA COMPETITORS — solo admin y service_role
-- ============================================================

create policy "admin gestiona competidores"
  on competitors for all
  using (is_admin())
  with check (is_admin());

-- vendors NO tienen ninguna política → sin acceso


-- ============================================================
-- FUNCIÓN: crear perfil automáticamente al registrar usuario
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into profiles (id, role)
  values (new.id, coalesce(new.raw_app_meta_data->>'role', 'vendor'));
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ============================================================
-- PROMOVER USUARIO A ADMIN (ejecutar manualmente para Antonio)
-- Reemplazar USER_UUID con el UUID real del usuario admin
-- ============================================================
-- update profiles set role = 'admin' where id = 'USER_UUID';
