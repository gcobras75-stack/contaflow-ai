-- ============================================================
-- Migración 007 — Portal de cancelación de suscripción
-- ============================================================
-- Agrega columnas para soportar cancel/reactivate flow:
--   - fecha_cancelacion: cuándo se canceló
--   - motivo_cancelacion: razón dada por el usuario (opcional)
--   - status_previo: snapshot del status al momento de cancelar,
--     para poder restaurarlo tal cual al reactivar (preserva días
--     pagados en lugar de tirarlos a "trial" perdiendo el periodo)
-- Agrega documento legal 'cancelacion_suscripcion' para registrar
-- cada cancelación en legal_acceptances con evidencia IP + UA.
-- ============================================================

ALTER TABLE suscripciones
  ADD COLUMN IF NOT EXISTS fecha_cancelacion  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
  ADD COLUMN IF NOT EXISTS status_previo      TEXT;

COMMENT ON COLUMN suscripciones.fecha_cancelacion  IS 'Timestamp cuando el contador canceló. NULL si nunca fue cancelada.';
COMMENT ON COLUMN suscripciones.motivo_cancelacion IS 'Razón dada en el flujo de cancelación. Opcional.';
COMMENT ON COLUMN suscripciones.status_previo      IS 'Snapshot del status justo antes de cancelar. Al reactivar se restaura este valor si el periodo previo sigue vigente.';

CREATE INDEX IF NOT EXISTS idx_suscripciones_cancelada
  ON suscripciones(fecha_cancelacion DESC)
  WHERE status = 'cancelada';

INSERT INTO legal_documents (code, title, version, content_url, is_active) VALUES
  ('cancelacion_suscripcion',
   'Aviso de cancelación voluntaria de suscripción',
   '1.0',
   NULL,
   true)
ON CONFLICT (code, version) DO NOTHING;
