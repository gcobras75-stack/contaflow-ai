-- ============================================================
-- Migración 003 — Separar material FIEL a tabla propia
-- ============================================================
-- El modelo de negocio: el contador sube la FIEL de cada cliente.
-- La FIEL pertenece al cliente (empresa) pero solo el contador la opera.
-- El cliente NUNCA debe tener acceso directo al material FIEL desde
-- su app móvil — solo al flag público fiel_disponible.
--
-- Antes: columnas fiel_cert_b64, fiel_key_b64, fiel_password vivían
-- en empresas_clientes (añadidas ad-hoc, no en migraciones). Cualquier
-- SELECT * las arrastraba y el rol empresa podía leerlas vía RLS.
--
-- Ahora: tabla dedicada empresa_fiel con RLS que solo permite al
-- contador de SU despacho. Rol empresa: sin policy → default-deny.
-- ============================================================

-- ── 1. Tabla empresa_fiel ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresa_fiel (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id    UUID NOT NULL UNIQUE REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  despacho_id   UUID NOT NULL REFERENCES despachos(id) ON DELETE CASCADE,
  rfc           TEXT NOT NULL,

  -- Campos cifrados con AES-256-GCM (formato iv:authTag:ciphertext)
  cert_enc      TEXT NOT NULL,
  key_enc       TEXT NOT NULL,
  password_enc  TEXT NOT NULL,

  -- Metadatos no sensibles
  valid_until   DATE,                               -- vencimiento de la FIEL (opcional, se actualiza al validar)
  uploaded_by   UUID REFERENCES usuarios(id),       -- el contador que la subió
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_empresa_fiel_despacho ON empresa_fiel(despacho_id);
-- idx_empresa_fiel_empresa: el UNIQUE ya crea un índice

COMMENT ON TABLE  empresa_fiel IS 'Material FIEL (e.firma SAT) de cada empresa cliente. Acceso restringido al contador de su despacho. RLS default-deny para rol empresa.';
COMMENT ON COLUMN empresa_fiel.cert_enc     IS 'Archivo .cer cifrado AES-256-GCM (formato iv:authTag:ciphertext)';
COMMENT ON COLUMN empresa_fiel.key_enc      IS 'Archivo .key cifrado AES-256-GCM — llave privada, suplantación fiscal si se filtra';
COMMENT ON COLUMN empresa_fiel.password_enc IS 'Contraseña de la .key cifrada AES-256-GCM';

-- ── 2. Migrar datos existentes desde empresas_clientes ───────
-- Solo si las columnas legacy existen (tolerante a entornos recién creados)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'empresas_clientes'
      AND column_name = 'fiel_cert_b64'
  ) THEN
    INSERT INTO empresa_fiel (
      empresa_id, despacho_id, rfc, cert_enc, key_enc, password_enc, uploaded_at, updated_at
    )
    SELECT
      ec.id,
      ec.despacho_id,
      ec.rfc,
      ec.fiel_cert_b64,
      ec.fiel_key_b64,
      ec.fiel_password,
      COALESCE(ec.created_at, NOW()),
      NOW()
    FROM empresas_clientes ec
    WHERE ec.fiel_cert_b64 IS NOT NULL
      AND ec.fiel_key_b64  IS NOT NULL
      AND ec.fiel_password IS NOT NULL
      AND ec.despacho_id   IS NOT NULL
    ON CONFLICT (empresa_id) DO NOTHING;
  END IF;
END $$;

-- ── 3. RLS ────────────────────────────────────────────────────
ALTER TABLE empresa_fiel ENABLE ROW LEVEL SECURITY;

-- Limpieza idempotente
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'empresa_fiel'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON empresa_fiel', p.policyname);
  END LOOP;
END $$;

-- service_role bypass total (API routes server-side)
CREATE POLICY "service_role_all" ON empresa_fiel
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admin staff ContaFlow ve todas
CREATE POLICY "admin_all" ON empresa_fiel
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- Contador: solo su despacho. Single policy para todos los comandos.
CREATE POLICY "contador_mismo_despacho" ON empresa_fiel
  FOR ALL TO authenticated
  USING (
    auth_rol() = 'contador' AND despacho_id = auth_despacho_id()
  )
  WITH CHECK (
    auth_rol() = 'contador' AND despacho_id = auth_despacho_id()
  );

-- IMPORTANTE: NO existe policy para rol 'empresa'.
-- RLS default-deny: sin policy que permita el acceso, cualquier
-- query del cliente vía anon/authenticated con rol empresa recibe
-- 0 filas. El cliente NUNCA ve su propio material FIEL.

-- ── 4. Cerrar la fuga en empresas_clientes ───────────────────
-- La policy empresa_ve_su_empresa (migración 002) permite SELECT * del row,
-- que incluye los campos legacy fiel_cert_b64 etc. hasta que los dropeemos.
-- Mientras tanto, reescribimos la policy para que el rol empresa solo pueda
-- leer un subset seguro de columnas vía una vista.

-- Vista pública con las columnas que el cliente SÍ puede leer
CREATE OR REPLACE VIEW empresa_cliente_publica AS
SELECT
  id,
  nombre,
  rfc,
  giro,
  email,
  despacho_id,
  activa,
  fiel_disponible,
  sat_ultima_sync,
  sat_auto_sync,
  created_at
FROM empresas_clientes;

-- La vista hereda las RLS de la tabla base, así que sigue siendo
-- filtrada por empresa_ve_su_empresa. Lo que cambia es que por
-- convención la app móvil debe consultar la vista, no la tabla.

GRANT SELECT ON empresa_cliente_publica TO authenticated;

COMMENT ON VIEW empresa_cliente_publica IS 'Vista pública de empresas_clientes sin columnas sensibles (FIEL). Usar desde la app móvil en lugar de empresas_clientes directamente.';

-- ── 5. Drop de columnas legacy ───────────────────────────────
-- Los datos ya se copiaron en el paso 2 a empresa_fiel. Los consumidores
-- (subir-fiel, descargar-sat) ya leen/escriben en la tabla nueva.
--
-- Verificación de seguridad antes del drop — aborta si algo no cuadra.
DO $$
DECLARE
  legacy_count  INTEGER;
  fiel_count    INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='empresas_clientes' AND column_name='fiel_cert_b64'
  ) THEN
    SELECT COUNT(*) INTO legacy_count
      FROM empresas_clientes
      WHERE fiel_cert_b64 IS NOT NULL AND despacho_id IS NOT NULL;

    SELECT COUNT(*) INTO fiel_count FROM empresa_fiel;

    IF fiel_count < legacy_count THEN
      RAISE EXCEPTION 'Migración FIEL incompleta: empresa_fiel=% < legacy=%. Revisa antes de dropear columnas.',
        fiel_count, legacy_count;
    END IF;
  END IF;
END $$;

-- Dropear columnas sensibles de empresas_clientes. A partir de este punto,
-- ningún SELECT * sobre empresas_clientes puede arrastrar material FIEL,
-- y la policy empresa_ve_su_empresa deja de ser una fuga.
ALTER TABLE empresas_clientes DROP COLUMN IF EXISTS fiel_cert_b64;
ALTER TABLE empresas_clientes DROP COLUMN IF EXISTS fiel_key_b64;
ALTER TABLE empresas_clientes DROP COLUMN IF EXISTS fiel_password;

-- ── 6. Trigger para mantener updated_at ──────────────────────
CREATE OR REPLACE FUNCTION empresa_fiel_touch()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresa_fiel_touch ON empresa_fiel;
CREATE TRIGGER trg_empresa_fiel_touch
  BEFORE UPDATE ON empresa_fiel
  FOR EACH ROW EXECUTE FUNCTION empresa_fiel_touch();
