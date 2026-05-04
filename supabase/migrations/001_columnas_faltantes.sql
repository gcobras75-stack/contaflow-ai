-- ============================================================
-- Migración 001 — Columnas y tablas faltantes
-- ============================================================

-- empresas_clientes: columnas que usa /dashboard/empresas
ALTER TABLE empresas_clientes
  ADD COLUMN IF NOT EXISTS fiel_disponible   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sat_ultima_sync   TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS sat_auto_sync     BOOLEAN DEFAULT false;

-- cfdis: columnas que usan exportar, conciliar y empresas
ALTER TABLE cfdis
  ADD COLUMN IF NOT EXISTS fuente        TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS rfc_emisor    TEXT,
  ADD COLUMN IF NOT EXISTS rfc_receptor  TEXT;

-- ── Tabla: suscripciones ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suscripciones (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id       UUID REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  despacho_id      UUID REFERENCES despachos(id),
  status           TEXT DEFAULT 'trial',
  trial_ends_at    TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  periodo_inicio   TIMESTAMP WITH TIME ZONE,
  periodo_fin      TIMESTAMP WITH TIME ZONE,
  mp_payment_id    TEXT,
  mp_preference_id TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(empresa_id)
);

-- ── Tabla: documentos ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id   UUID REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL,
  archivo_url  TEXT,
  descripcion  TEXT,
  fecha_doc    DATE DEFAULT CURRENT_DATE,
  status       TEXT DEFAULT 'pendiente',
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Tabla: invitaciones ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitaciones (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo       TEXT UNIQUE NOT NULL,
  empresa_id   UUID REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  despacho_id  UUID REFERENCES despachos(id) ON DELETE CASCADE,
  usado        BOOLEAN DEFAULT false,
  usado_por    UUID REFERENCES usuarios(id),
  expires_at   TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitaciones  ENABLE ROW LEVEL SECURITY;

-- Políticas (DROP IF EXISTS primero para idempotencia)
DO $$
BEGIN
  DROP POLICY IF EXISTS "service_role_all_suscripciones" ON suscripciones;
  DROP POLICY IF EXISTS "service_role_all_documentos"    ON documentos;
  DROP POLICY IF EXISTS "service_role_all_invitaciones"  ON invitaciones;
  DROP POLICY IF EXISTS "auth_read_suscripciones"        ON suscripciones;
  DROP POLICY IF EXISTS "auth_read_documentos"           ON documentos;
END $$;

CREATE POLICY "service_role_all_suscripciones"
  ON suscripciones FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_all_documentos"
  ON documentos FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_all_invitaciones"
  ON invitaciones FOR ALL TO service_role USING (true);

CREATE POLICY "auth_read_suscripciones"
  ON suscripciones FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_documentos"
  ON documentos FOR SELECT TO authenticated
  USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));
