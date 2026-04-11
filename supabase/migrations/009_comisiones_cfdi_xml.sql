-- Agregar columna para el XML crudo del CFDI que el beneficiario sube
-- al validar su comisión. Se guarda inline (no en storage) porque un
-- CFDI típico es ~5-10KB y facilita el audit.
ALTER TABLE comisiones
  ADD COLUMN IF NOT EXISTS cfdi_xml TEXT;

COMMENT ON COLUMN comisiones.cfdi_xml IS 'XML crudo del CFDI subido por el beneficiario. Guardado inline. El sello digital NO se verifica en MVP — deuda técnica para sprint dedicado.';
