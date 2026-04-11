-- ============================================================
-- Migración 002 — Row Level Security crítico
-- ============================================================
-- Aísla datos por despacho_id / empresa_id. Cada despacho solo
-- ve sus propios CFDIs, estados de cuenta, empresas y documentos.
--
-- Patrón: los clientes con service_role (API routes server-side)
-- bypass RLS automáticamente. Los clientes con anon key + sesión
-- authenticated respetan las policies.
--
-- Supone: usuarios.id == auth.uid() al registrarse vía Supabase Auth.
-- ============================================================

-- ── 1. Rol admin (staff ContaFlow) ────────────────────────────
-- Reutilizamos el rol 'superadmin' que ya existe en el CHECK de usuarios.rol
-- (schema.sql: rol IN ('contador','empresa','superadmin')).
-- NO creamos una columna is_admin separada para evitar duplicar el concepto.

-- ── 2. Helpers SECURITY DEFINER ───────────────────────────────
-- Evita recursión infinita cuando las policies consultan usuarios.
-- SECURITY DEFINER ejecuta con privilegios del owner (postgres),
-- saltando RLS en la lectura de usuarios.

CREATE OR REPLACE FUNCTION auth_despacho_id()
  RETURNS UUID
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT despacho_id FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_empresa_id()
  RETURNS UUID
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT empresa_id FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_rol()
  RETURNS TEXT
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_is_admin()
  RETURNS BOOLEAN
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT COALESCE(rol = 'superadmin', false) FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- Revocar ejecución por defecto y re-otorgar solo a authenticated
REVOKE EXECUTE ON FUNCTION auth_despacho_id, auth_empresa_id, auth_rol, auth_is_admin FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION auth_despacho_id, auth_empresa_id, auth_rol, auth_is_admin TO authenticated, service_role;

-- ── 3. Habilitar RLS ──────────────────────────────────────────
ALTER TABLE despachos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas_clientes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfdis              ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_cuenta     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones     ENABLE ROW LEVEL SECURITY;
-- suscripciones, documentos, invitaciones ya tienen RLS (migración 001)

-- ── 4. Limpieza de policies previas (idempotencia) ───────────
DO $$
DECLARE
  t TEXT;
  p RECORD;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'despachos','empresas_clientes','usuarios','cfdis','estados_cuenta',
    'pagos','notificaciones','documentos','suscripciones','invitaciones'
  ]) LOOP
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- ── 5. Policies: service_role bypass total ───────────────────
-- El backend (API routes) con service_role no necesita filtros.
CREATE POLICY "service_role_all" ON despachos         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON empresas_clientes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON usuarios          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON cfdis             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON estados_cuenta    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON pagos             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON notificaciones    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON documentos        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON suscripciones     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON invitaciones      FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 6. Policies: admin (staff ContaFlow) ─────────────────────
-- Staff con is_admin=true ve todos los despachos (panel admin).
CREATE POLICY "admin_all_despachos"         ON despachos         FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY "admin_all_empresas"          ON empresas_clientes FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY "admin_all_usuarios"          ON usuarios          FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY "admin_all_cfdis"             ON cfdis             FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY "admin_all_estados_cuenta"    ON estados_cuenta    FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY "admin_all_pagos"             ON pagos             FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY "admin_all_suscripciones"     ON suscripciones     FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- ── 7. Policies: despachos ────────────────────────────────────
-- Cada usuario ve solo SU despacho.
CREATE POLICY "own_despacho_select" ON despachos
  FOR SELECT TO authenticated
  USING (id = auth_despacho_id());

CREATE POLICY "own_despacho_update" ON despachos
  FOR UPDATE TO authenticated
  USING (id = auth_despacho_id() AND auth_rol() = 'contador')
  WITH CHECK (id = auth_despacho_id());

-- ── 8. Policies: empresas_clientes ───────────────────────────
-- Contador ve/edita empresas de su despacho.
-- Rol empresa ve solo su propia empresa (read).
CREATE POLICY "contador_empresas_all" ON empresas_clientes
  FOR ALL TO authenticated
  USING (
    auth_rol() = 'contador' AND despacho_id = auth_despacho_id()
  )
  WITH CHECK (
    auth_rol() = 'contador' AND despacho_id = auth_despacho_id()
  );

CREATE POLICY "empresa_ve_su_empresa" ON empresas_clientes
  FOR SELECT TO authenticated
  USING (
    auth_rol() = 'empresa' AND id = auth_empresa_id()
  );

-- ── 9. Policies: usuarios ─────────────────────────────────────
-- Cada usuario ve su propia fila.
-- Contador ve usuarios vinculados a empresas de su despacho.
CREATE POLICY "self_usuario" ON usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "self_update_usuario" ON usuarios
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "contador_ve_usuarios_despacho" ON usuarios
  FOR SELECT TO authenticated
  USING (
    auth_rol() = 'contador' AND despacho_id = auth_despacho_id()
  );

-- ── 10. Policies: cfdis ───────────────────────────────────────
-- Acceso vía empresa → despacho.
CREATE POLICY "contador_cfdis_all" ON cfdis
  FOR ALL TO authenticated
  USING (
    auth_rol() = 'contador'
    AND empresa_id IN (
      SELECT id FROM empresas_clientes WHERE despacho_id = auth_despacho_id()
    )
  )
  WITH CHECK (
    auth_rol() = 'contador'
    AND empresa_id IN (
      SELECT id FROM empresas_clientes WHERE despacho_id = auth_despacho_id()
    )
  );

CREATE POLICY "empresa_cfdis_select" ON cfdis
  FOR SELECT TO authenticated
  USING (
    auth_rol() = 'empresa' AND empresa_id = auth_empresa_id()
  );

-- Las empresas pueden subir sus propios CFDIs desde la app móvil.
CREATE POLICY "empresa_cfdis_insert" ON cfdis
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_rol() = 'empresa' AND empresa_id = auth_empresa_id()
  );

-- ── 11. Policies: estados_cuenta ──────────────────────────────
CREATE POLICY "contador_estados_all" ON estados_cuenta
  FOR ALL TO authenticated
  USING (
    auth_rol() = 'contador'
    AND empresa_id IN (
      SELECT id FROM empresas_clientes WHERE despacho_id = auth_despacho_id()
    )
  )
  WITH CHECK (
    auth_rol() = 'contador'
    AND empresa_id IN (
      SELECT id FROM empresas_clientes WHERE despacho_id = auth_despacho_id()
    )
  );

CREATE POLICY "empresa_estados_select" ON estados_cuenta
  FOR SELECT TO authenticated
  USING (
    auth_rol() = 'empresa' AND empresa_id = auth_empresa_id()
  );

CREATE POLICY "empresa_estados_insert" ON estados_cuenta
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_rol() = 'empresa' AND empresa_id = auth_empresa_id()
  );

-- ── 12. Policies: documentos ──────────────────────────────────
CREATE POLICY "contador_documentos_all" ON documentos
  FOR ALL TO authenticated
  USING (
    auth_rol() = 'contador'
    AND empresa_id IN (
      SELECT id FROM empresas_clientes WHERE despacho_id = auth_despacho_id()
    )
  )
  WITH CHECK (
    auth_rol() = 'contador'
    AND empresa_id IN (
      SELECT id FROM empresas_clientes WHERE despacho_id = auth_despacho_id()
    )
  );

CREATE POLICY "empresa_documentos_select" ON documentos
  FOR SELECT TO authenticated
  USING (
    auth_rol() = 'empresa' AND empresa_id = auth_empresa_id()
  );

CREATE POLICY "empresa_documentos_insert" ON documentos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_rol() = 'empresa' AND empresa_id = auth_empresa_id()
  );

-- ── 13. Policies: pagos ───────────────────────────────────────
-- Solo lectura por despacho (contador).
CREATE POLICY "contador_pagos_select" ON pagos
  FOR SELECT TO authenticated
  USING (
    auth_rol() = 'contador' AND despacho_id = auth_despacho_id()
  );

-- ── 14. Policies: suscripciones ──────────────────────────────
-- Contador lee todas las de su despacho; empresa lee solo la suya.
CREATE POLICY "contador_suscripciones_select" ON suscripciones
  FOR SELECT TO authenticated
  USING (
    auth_rol() = 'contador' AND despacho_id = auth_despacho_id()
  );

CREATE POLICY "empresa_suscripciones_select" ON suscripciones
  FOR SELECT TO authenticated
  USING (
    auth_rol() = 'empresa' AND empresa_id = auth_empresa_id()
  );

-- ── 15. Policies: notificaciones ─────────────────────────────
CREATE POLICY "self_notificaciones" ON notificaciones
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- ── 16. Policies: invitaciones ───────────────────────────────
-- Contador crea y ve invitaciones de su despacho.
CREATE POLICY "contador_invitaciones_all" ON invitaciones
  FOR ALL TO authenticated
  USING (
    auth_rol() = 'contador' AND despacho_id = auth_despacho_id()
  )
  WITH CHECK (
    auth_rol() = 'contador' AND despacho_id = auth_despacho_id()
  );

-- ── 17. Índices para performance de las policies ─────────────
CREATE INDEX IF NOT EXISTS idx_empresas_despacho    ON empresas_clientes(despacho_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_despacho    ON usuarios(despacho_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa     ON usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cfdis_empresa        ON cfdis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_estados_empresa      ON estados_cuenta(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_empresa   ON documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_desp   ON suscripciones(despacho_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_emp    ON suscripciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagos_despacho       ON pagos(despacho_id);

-- ── 18. Nota operativa ───────────────────────────────────────
-- Staff ContaFlow debe tener rol='superadmin' en usuarios:
--   UPDATE usuarios SET rol = 'superadmin' WHERE email = 'staff@contaflow.mx';
--
-- Verificación rápida post-deploy:
--   SET ROLE authenticated;
--   SET request.jwt.claim.sub TO '<uuid-de-contador>';
--   SELECT COUNT(*) FROM cfdis;  -- debe ver solo su despacho
--   RESET ROLE;
