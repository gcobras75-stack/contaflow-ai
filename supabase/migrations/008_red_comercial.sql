-- ============================================================
-- Migración 008 — Red comercial, referidos y comisiones
-- ============================================================
-- Modelo comercial ContaFlow:
--   Cada pago $99 MXN/empresa → dispersión automática
--     60% ($59.40) Automatia (admin) — sin fila, es el residual
--     20% ($19.80) Coordinador Regional
--     10% ($9.90)  Vendedor
--     10% ($9.90)  Contador (cashback)
--
-- Todas las comisiones requieren CFDI validado antes de liberar pago.
-- Red mixta: miembros con RFC (emiten CFDI) y sin RFC (retención ISR
-- desde Automatia + CFDI global mensual).
-- ============================================================

-- ── 1. red_comercial ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS red_comercial (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  rol                TEXT NOT NULL CHECK (rol IN ('coordinador','vendedor')),
  codigo_referido    TEXT NOT NULL UNIQUE,
  coordinador_id     UUID REFERENCES red_comercial(id) ON DELETE SET NULL,
  nombre             TEXT NOT NULL,
  email              TEXT NOT NULL,
  telefono           TEXT,
  tiene_rfc          BOOLEAN NOT NULL DEFAULT false,
  rfc                TEXT,
  regimen_fiscal     TEXT,
  razon_social       TEXT,
  mp_account_id      TEXT,
  activo             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_coordinador_sin_padre
    CHECK (
      (rol = 'coordinador' AND coordinador_id IS NULL)
      OR
      (rol = 'vendedor' AND coordinador_id IS NOT NULL)
    ),
  CONSTRAINT chk_rfc_si_tiene
    CHECK ((tiene_rfc = false) OR (rfc IS NOT NULL AND length(rfc) BETWEEN 12 AND 13))
);

CREATE INDEX IF NOT EXISTS idx_red_user         ON red_comercial(user_id);
CREATE INDEX IF NOT EXISTS idx_red_coordinador  ON red_comercial(coordinador_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_red_codigo_upper
  ON red_comercial(UPPER(codigo_referido));

COMMENT ON TABLE  red_comercial IS 'Miembros de la red comercial ContaFlow: coordinadores regionales y vendedores.';
COMMENT ON COLUMN red_comercial.codigo_referido IS '8 caracteres alfanuméricos, case-insensitive unique. Se usa en URLs /ref/<codigo>.';

-- ── 2. referidos ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referidos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contador_id     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  vendedor_id     UUID REFERENCES red_comercial(id) ON DELETE SET NULL,
  coordinador_id  UUID REFERENCES red_comercial(id) ON DELETE SET NULL,
  codigo_usado    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contador_id)
);

CREATE INDEX IF NOT EXISTS idx_referidos_vendedor    ON referidos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_referidos_coordinador ON referidos(coordinador_id);

-- ── 3. comisiones ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comisiones (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  mp_payment_id       TEXT NOT NULL,
  empresa_id          UUID REFERENCES empresas_clientes(id) ON DELETE SET NULL,
  periodo             TEXT NOT NULL,

  beneficiario_id     UUID NOT NULL,
  beneficiario_tipo   TEXT NOT NULL CHECK (beneficiario_tipo IN ('admin','coordinador','vendedor','contador')),
  beneficiario_nombre TEXT,
  beneficiario_rfc    TEXT,

  monto_base          NUMERIC(10,2) NOT NULL,
  porcentaje          NUMERIC(5,2)  NOT NULL,
  monto_comision      NUMERIC(10,2) NOT NULL,
  retencion_isr       NUMERIC(10,2) NOT NULL DEFAULT 0,
  monto_a_pagar       NUMERIC(10,2) GENERATED ALWAYS AS (monto_comision - retencion_isr) STORED,

  tiene_rfc           BOOLEAN NOT NULL,

  cfdi_uuid           TEXT,
  cfdi_fecha          DATE,
  cfdi_monto          NUMERIC(10,2),
  cfdi_xml_url        TEXT,
  cfdi_status         TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (cfdi_status IN ('pendiente','recibido','validado','rechazado')),
  cfdi_motivo_rechazo TEXT,

  pago_status         TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (pago_status IN ('pendiente','liberado','pagado')),
  puede_pagar         BOOLEAN NOT NULL DEFAULT false,
  fecha_pago          TIMESTAMPTZ,

  notas               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comisiones_mp_payment   ON comisiones(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_beneficiario ON comisiones(beneficiario_id, beneficiario_tipo);
CREATE INDEX IF NOT EXISTS idx_comisiones_periodo      ON comisiones(periodo);
CREATE INDEX IF NOT EXISTS idx_comisiones_cfdi_status  ON comisiones(cfdi_status);
CREATE INDEX IF NOT EXISTS idx_comisiones_pago_status  ON comisiones(pago_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comisiones_unique_benef_pago
  ON comisiones(mp_payment_id, beneficiario_id, beneficiario_tipo);

-- ── 4. Trigger updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION red_comercial_touch()
  RETURNS TRIGGER LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at := NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_comisiones_touch ON comisiones;
CREATE TRIGGER trg_comisiones_touch
  BEFORE UPDATE ON comisiones
  FOR EACH ROW EXECUTE FUNCTION red_comercial_touch();

-- ── 5. RLS — red_comercial ───────────────────────────────────
ALTER TABLE red_comercial ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='red_comercial' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON red_comercial', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "service_role_all" ON red_comercial
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin_all" ON red_comercial
  FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY "self_red_comercial" ON red_comercial
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "coordinador_ve_vendedores" ON red_comercial
  FOR SELECT TO authenticated
  USING (coordinador_id IN (SELECT id FROM red_comercial WHERE user_id = auth.uid()));

-- ── 6. RLS — referidos ───────────────────────────────────────
ALTER TABLE referidos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='referidos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON referidos', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "service_role_all" ON referidos
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin_all" ON referidos
  FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY "contador_propio_referido" ON referidos
  FOR SELECT TO authenticated USING (contador_id = auth.uid());
CREATE POLICY "vendedor_sus_referidos" ON referidos
  FOR SELECT TO authenticated
  USING (vendedor_id IN (SELECT id FROM red_comercial WHERE user_id = auth.uid()));
CREATE POLICY "coordinador_referidos_equipo" ON referidos
  FOR SELECT TO authenticated
  USING (coordinador_id IN (SELECT id FROM red_comercial WHERE user_id = auth.uid()));

-- ── 7. RLS — comisiones ──────────────────────────────────────
ALTER TABLE comisiones ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='comisiones' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON comisiones', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "service_role_all" ON comisiones
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin_all" ON comisiones
  FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
CREATE POLICY "beneficiario_red_ve_comisiones" ON comisiones
  FOR SELECT TO authenticated
  USING (
    beneficiario_tipo IN ('coordinador','vendedor')
    AND beneficiario_id IN (SELECT id FROM red_comercial WHERE user_id = auth.uid())
  );
CREATE POLICY "contador_ve_cashback" ON comisiones
  FOR SELECT TO authenticated
  USING (beneficiario_tipo = 'contador' AND beneficiario_id = auth.uid());
CREATE POLICY "beneficiario_actualiza_cfdi" ON comisiones
  FOR UPDATE TO authenticated
  USING (
    (beneficiario_tipo IN ('coordinador','vendedor')
     AND beneficiario_id IN (SELECT id FROM red_comercial WHERE user_id = auth.uid()))
    OR
    (beneficiario_tipo = 'contador' AND beneficiario_id = auth.uid())
  );
