-- ============================================================
-- Migración 004 — Aceptación legal y auditoría FIEL
-- ============================================================
-- Tres tablas:
--   1. legal_documents    — catálogo de documentos legales versionados
--   2. legal_acceptances  — registro de aceptaciones por usuario
--   3. fiel_audit_log     — trazabilidad de subidas/descargas/eliminación de FIEL
--
-- Todas con RLS: cada despacho solo ve lo suyo.
-- ============================================================

-- ── 1. legal_documents ────────────────────────────────────────
-- Catálogo global (no despacho-específico). Solo admin escribe.
-- Ejemplo de filas:
--   ('terminos_v1',  'Términos y Condiciones',   '1.0', '/legal/terminos-v1.pdf',   true)
--   ('privacidad_v1','Aviso de Privacidad',       '1.0', '/legal/privacidad-v1.pdf', true)
--   ('fiel_consent_v1','Consentimiento FIEL',     '1.0', '/legal/fiel-consent-v1.pdf', true)
CREATE TABLE IF NOT EXISTS legal_documents (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code         TEXT NOT NULL,                  -- ej: 'terminos_v1'
  title        TEXT NOT NULL,                  -- ej: 'Términos y Condiciones'
  version      TEXT NOT NULL,                  -- ej: '1.0'
  content_url  TEXT,                           -- URL al PDF/HTML vigente
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_code_active
  ON legal_documents(code) WHERE is_active = true;

COMMENT ON TABLE  legal_documents IS 'Catálogo de documentos legales versionados (términos, aviso de privacidad, consentimientos FIEL, etc.). Cada cambio material genera una versión nueva — NUNCA editar in-place para no invalidar firmas previas.';
COMMENT ON COLUMN legal_documents.code    IS 'Identificador estable del documento (terminos, privacidad, fiel_consent). La versión va aparte para preservar histórico.';
COMMENT ON COLUMN legal_documents.version IS 'Versión semántica. Junto con code forma la identidad citable desde legal_acceptances.';

-- ── 2. legal_acceptances ──────────────────────────────────────
-- Registro inmutable de una aceptación puntual. NUNCA se hace UPDATE:
-- si el usuario revoca o acepta una versión nueva, se inserta una fila.
CREATE TABLE IF NOT EXISTS legal_acceptances (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  despacho_id        UUID REFERENCES despachos(id) ON DELETE SET NULL, -- denormalizado para RLS
  empresa_id         UUID REFERENCES empresas_clientes(id) ON DELETE SET NULL, -- opcional: aceptación atada a un cliente específico
  document_code      TEXT NOT NULL,
  document_version   TEXT NOT NULL,
  accepted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address         INET,
  user_agent         TEXT,
  is_accepted        BOOLEAN NOT NULL DEFAULT true,
  -- FK compuesto hacia legal_documents (code + version).
  CONSTRAINT fk_legal_acceptance_doc
    FOREIGN KEY (document_code, document_version)
    REFERENCES legal_documents (code, version)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user      ON legal_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_despacho  ON legal_acceptances(despacho_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_empresa   ON legal_acceptances(empresa_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_doc       ON legal_acceptances(document_code, document_version);

COMMENT ON TABLE  legal_acceptances IS 'Registro inmutable de aceptaciones de documentos legales. Cada fila es un "event": nunca se actualiza. Revocar = insertar is_accepted=false.';
COMMENT ON COLUMN legal_acceptances.despacho_id IS 'Denormalizado desde usuarios para performance de RLS. Si el usuario cambia de despacho, las filas viejas mantienen el despacho original (correcto: es un registro histórico).';
COMMENT ON COLUMN legal_acceptances.is_accepted IS 'Permite distinguir aceptación (true) de revocación explícita (false). El último evento por (user, document_code, document_version) es el estado vigente.';

-- ── 3. fiel_audit_log ─────────────────────────────────────────
-- Log de eventos sobre FIEL (append-only). Independiente del cifrado:
-- este log sirve para trazabilidad legal incluso si los datos de empresa_fiel
-- se eliminan (ej. baja del cliente). Para eso: ON DELETE SET NULL en FKs.
CREATE TABLE IF NOT EXISTS fiel_audit_log (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id    UUID REFERENCES empresas_clientes(id) ON DELETE SET NULL,
  despacho_id   UUID REFERENCES despachos(id)         ON DELETE SET NULL,
  uploaded_by   UUID REFERENCES usuarios(id)          ON DELETE SET NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address    INET,
  action        TEXT NOT NULL CHECK (action IN ('subida','descarga','eliminacion','uso_sat','rechazo_validacion')),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_fiel_audit_empresa  ON fiel_audit_log(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fiel_audit_despacho ON fiel_audit_log(despacho_id);
CREATE INDEX IF NOT EXISTS idx_fiel_audit_when     ON fiel_audit_log(uploaded_at DESC);

COMMENT ON TABLE  fiel_audit_log IS 'Bitácora append-only de operaciones sobre material FIEL. Se preserva aunque se elimine la empresa (FKs ON DELETE SET NULL) porque es requisito legal demostrar trazabilidad del manejo de la e.firma.';
COMMENT ON COLUMN fiel_audit_log.action IS 'Evento: subida (alta), descarga (exportación por contador), eliminacion (delete), uso_sat (descifrada para sync con SAT-WS), rechazo_validacion (intento fallido).';

-- ── 4. RLS ────────────────────────────────────────────────────
ALTER TABLE legal_documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiel_audit_log    ENABLE ROW LEVEL SECURITY;

-- Limpieza idempotente
DO $$
DECLARE t TEXT; p RECORD;
BEGIN
  FOR t IN SELECT unnest(ARRAY['legal_documents','legal_acceptances','fiel_audit_log']) LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- ── 4a. legal_documents ──────────────────────────────────────
-- Lectura: cualquier usuario autenticado ve los documentos activos
-- (para mostrarlos en pantallas de aceptación). Escritura: solo admin o service_role.
CREATE POLICY "service_role_all" ON legal_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_all" ON legal_documents
  FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "authenticated_read_active" ON legal_documents
  FOR SELECT TO authenticated USING (is_active = true);

-- ── 4b. legal_acceptances ────────────────────────────────────
-- El usuario ve sus propias aceptaciones.
-- El contador ve las aceptaciones de usuarios de su despacho.
-- El cliente (rol empresa) ve solo las suyas (cubierto por "self_acceptances").
CREATE POLICY "service_role_all" ON legal_acceptances
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_all" ON legal_acceptances
  FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "self_acceptances_select" ON legal_acceptances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "self_acceptances_insert" ON legal_acceptances
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Contador ve aceptaciones de su despacho (para evidencia en disputas).
CREATE POLICY "contador_acceptances_select" ON legal_acceptances
  FOR SELECT TO authenticated
  USING (
    auth_rol() = 'contador' AND despacho_id = auth_despacho_id()
  );

-- ── 4c. fiel_audit_log ───────────────────────────────────────
-- Contador ve solo su despacho. Empresa NUNCA accede (sin policy → default-deny).
-- Escritura: solo service_role o admin. Los handlers de API insertan vía service_role,
-- así que los usuarios nunca insertan directamente (garantiza integridad del log).
CREATE POLICY "service_role_all" ON fiel_audit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_all" ON fiel_audit_log
  FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "contador_audit_select" ON fiel_audit_log
  FOR SELECT TO authenticated
  USING (
    auth_rol() = 'contador' AND despacho_id = auth_despacho_id()
  );

-- NOTA: no hay policy de INSERT/UPDATE/DELETE para authenticated en fiel_audit_log.
-- Solo service_role puede escribir. Esto garantiza integridad forense del log:
-- ningún usuario final puede borrar o forjar eventos.

-- ── 5. Seed de documentos legales ─────────────────────────────
-- Los 4 documentos que el contador debe aceptar en el onboarding,
-- más fiel_consent (lo firma el cliente, flujo separado).
-- Los PDFs reales deben existir en web/public/legal/ con estos nombres.
INSERT INTO legal_documents (code, title, version, content_url, is_active) VALUES
  ('terminos',                  'Términos y Condiciones de Uso',               '1.0', '/legal/terminos.pdf',       true),
  ('privacidad',                'Aviso de Privacidad Integral',                '1.0', '/legal/privacidad.pdf',     true),
  ('deslinde',                  'Deslinde de Responsabilidad Fiscal',          '1.0', '/legal/deslinde.pdf',       true),
  ('contrato_saas',             'Contrato de Prestación de Servicios SaaS',    '1.0', '/legal/contrato-saas.pdf',  true),
  ('fiel_consent',              'Consentimiento de Custodia de e.firma',       '1.0', '/legal/fiel-consent.pdf',   true),
  -- Declaración in-line del contador al dar de alta cada cliente. No tiene PDF
  -- porque el texto vive en la propia UI del formulario (checkbox).
  ('autorizacion_fiel_cliente', 'Autorización del contador para gestionar FIEL de cliente', '1.0', NULL, true)
ON CONFLICT (code, version) DO NOTHING;
