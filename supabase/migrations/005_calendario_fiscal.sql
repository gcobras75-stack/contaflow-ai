-- ============================================================
-- Migración 005 — Calendario fiscal con Art. 12 CFF
-- ============================================================
-- Tabla de obligaciones fiscales por empresa cliente, con fechas
-- de vencimiento ajustadas según Art. 12 del CFF (si el último día
-- del plazo cae en día inhábil, se recorre al siguiente hábil).
--
-- Tipos de obligación soportados (v1):
--   iva              — IVA mensual (Régimen General)
--   isr_mensual      — ISR mensual RESICO (PF Simplificado)
--   isr_provisional  — ISR provisional mensual (Régimen General PM)
--   diot             — DIOT mensual (obligatoria con IVA acreditable)
--   anual_pm         — Declaración anual personas morales (marzo)
--   anual_pf         — Declaración anual personas físicas (abril)
--
-- Status:
--   pendiente  — default al crear
--   presentado — el contador marca cuando ya declaró (con fecha)
--   vencido    — cron automático tras pasar fecha_limite sin marcar
-- ============================================================

-- ── 1. Tabla ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendario_obligaciones (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  despacho_id           UUID NOT NULL REFERENCES despachos(id) ON DELETE CASCADE,
  empresa_id            UUID NOT NULL REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  tipo                  TEXT NOT NULL CHECK (tipo IN (
    'iva','isr_mensual','isr_provisional','diot','anual_pm','anual_pf'
  )),
  obligacion            TEXT NOT NULL,            -- etiqueta legible ("IVA mensual 2026-04")
  periodo               DATE NOT NULL,            -- primer día del mes/año al que aplica
  fecha_limite_base     DATE NOT NULL,            -- fecha nominal antes de Art. 12
  fecha_limite          DATE NOT NULL,            -- fecha final tras ajustar por Art. 12
  fecha_presentacion    DATE,                     -- cuando el contador marca presentado
  presentado_por        UUID REFERENCES usuarios(id),
  status                TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente','presentado','vencido')),
  notificacion_enviada  BOOLEAN NOT NULL DEFAULT false,
  notas                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, tipo, periodo)
);

CREATE INDEX IF NOT EXISTS idx_cal_empresa        ON calendario_obligaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cal_despacho       ON calendario_obligaciones(despacho_id);
CREATE INDEX IF NOT EXISTS idx_cal_fecha_limite   ON calendario_obligaciones(fecha_limite);
CREATE INDEX IF NOT EXISTS idx_cal_status         ON calendario_obligaciones(status) WHERE status != 'presentado';
CREATE INDEX IF NOT EXISTS idx_cal_notif_pending
  ON calendario_obligaciones(fecha_limite)
  WHERE status = 'pendiente' AND notificacion_enviada = false;

COMMENT ON TABLE  calendario_obligaciones IS 'Obligaciones fiscales por empresa cliente. Una fila por (empresa, tipo, periodo). Fechas ajustadas por Art. 12 CFF.';
COMMENT ON COLUMN calendario_obligaciones.periodo          IS 'Mes/año al que aplica la declaración. Para mensuales: primer día del mes declarado. Para anuales: primer día del año fiscal.';
COMMENT ON COLUMN calendario_obligaciones.fecha_limite_base IS 'Fecha nominal del CFF antes de aplicar Art. 12 (ej: día 17 del mes siguiente).';
COMMENT ON COLUMN calendario_obligaciones.fecha_limite      IS 'Fecha final de vencimiento tras aplicar Art. 12. Si el día 17 es domingo, esta fecha será el lunes 18.';

-- ── 2. Catálogo de días inhábiles SAT 2026-2027 ──────────────
-- Feriados oficiales del SAT publicados en el DOF. Cada año nuevo
-- hay que extender esta lista (deuda técnica: tabla dias_inhabiles
-- con mantenimiento por admin).
CREATE OR REPLACE FUNCTION es_dia_inhabil_sat(fecha DATE)
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  IMMUTABLE
AS $$
BEGIN
  -- Fin de semana
  IF EXTRACT(DOW FROM fecha) IN (0, 6) THEN RETURN true; END IF;

  -- Feriados oficiales 2026
  IF fecha IN (
    DATE '2026-01-01',  -- Año Nuevo
    DATE '2026-02-02',  -- Día de la Constitución (1er lunes feb)
    DATE '2026-03-16',  -- Natalicio Juárez (3er lunes mar)
    DATE '2026-04-02',  -- Jueves Santo
    DATE '2026-04-03',  -- Viernes Santo
    DATE '2026-05-01',  -- Día del Trabajo
    DATE '2026-09-16',  -- Independencia
    DATE '2026-11-02',  -- Día de Muertos (inhábil SAT)
    DATE '2026-11-16',  -- Revolución (3er lunes nov)
    DATE '2026-12-25'   -- Navidad
  ) THEN RETURN true; END IF;

  -- Feriados oficiales 2027
  IF fecha IN (
    DATE '2027-01-01',  -- Año Nuevo
    DATE '2027-02-01',  -- Día de la Constitución
    DATE '2027-03-15',  -- Natalicio Juárez
    DATE '2027-03-25',  -- Jueves Santo
    DATE '2027-03-26',  -- Viernes Santo
    DATE '2027-05-01',  -- Día del Trabajo
    DATE '2027-09-16',  -- Independencia
    DATE '2027-11-01',  -- Día de Muertos
    DATE '2027-11-15',  -- Revolución
    DATE '2027-12-25'   -- Navidad
  ) THEN RETURN true; END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION es_dia_inhabil_sat IS 'Retorna true si la fecha es fin de semana o feriado oficial SAT 2026-2027. Extender anualmente.';

-- Aplica Art. 12 CFF: si la fecha cae en día inhábil,
-- avanza al siguiente día hábil.
CREATE OR REPLACE FUNCTION aplicar_art_12_cff(fecha_base DATE)
  RETURNS DATE
  LANGUAGE plpgsql
  IMMUTABLE
AS $$
DECLARE
  fecha DATE := fecha_base;
  intentos INT := 0;
BEGIN
  WHILE es_dia_inhabil_sat(fecha) LOOP
    fecha := fecha + 1;
    intentos := intentos + 1;
    -- Guard: no más de 14 días de corrimiento (imposible en la práctica).
    IF intentos > 14 THEN
      RAISE EXCEPTION 'Art. 12 CFF: no se encontró día hábil en 14 días desde %', fecha_base;
    END IF;
  END LOOP;
  RETURN fecha;
END;
$$;

COMMENT ON FUNCTION aplicar_art_12_cff IS 'Art. 12 CFF: si el último día del plazo es inhábil, se recorre al siguiente día hábil. Retorna la fecha final de vencimiento.';

-- ── 3. Trigger updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION calendario_obligaciones_touch()
  RETURNS TRIGGER LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at := NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_calendario_obligaciones_touch ON calendario_obligaciones;
CREATE TRIGGER trg_calendario_obligaciones_touch
  BEFORE UPDATE ON calendario_obligaciones
  FOR EACH ROW EXECUTE FUNCTION calendario_obligaciones_touch();

-- ── 4. RLS ────────────────────────────────────────────────────
ALTER TABLE calendario_obligaciones ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='calendario_obligaciones'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON calendario_obligaciones', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "service_role_all" ON calendario_obligaciones
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_all" ON calendario_obligaciones
  FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- Contador ve y gestiona las obligaciones de su despacho.
CREATE POLICY "contador_calendario_all" ON calendario_obligaciones
  FOR ALL TO authenticated
  USING (auth_rol() = 'contador' AND despacho_id = auth_despacho_id())
  WITH CHECK (auth_rol() = 'contador' AND despacho_id = auth_despacho_id());

-- Empresa ve solo sus obligaciones (no puede editarlas).
CREATE POLICY "empresa_calendario_select" ON calendario_obligaciones
  FOR SELECT TO authenticated
  USING (auth_rol() = 'empresa' AND empresa_id = auth_empresa_id());