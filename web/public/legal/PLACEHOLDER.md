# Documentos legales — pendiente de redacción

Los 4 PDFs que debe aceptar el contador en el onboarding deben colocarse aquí con estos nombres **exactos**:

```
terminos.pdf       — Términos y Condiciones de Uso
privacidad.pdf     — Aviso de Privacidad Integral
deslinde.pdf       — Deslinde de Responsabilidad Fiscal
contrato-saas.pdf  — Contrato de Prestación de Servicios SaaS
```

Y uno adicional para el flujo de cliente (empresa) cuando el contador sube su FIEL:

```
fiel-consent.pdf   — Consentimiento de Custodia de e.firma (firmado por el cliente)
```

## Importante

- **Las URLs están hardcodeadas** en `web/app/onboarding/page.tsx` (constante `DOCUMENTOS_LEGALES`). Si cambias un nombre de archivo, actualiza ahí también.
- **La versión actual es `1.0`** en todos. Si cambias el contenido material de algún documento, genera `1.1` y:
  1. Agrega una fila nueva en `legal_documents` con la nueva versión (NO edites in-place — las aceptaciones previas pierden referencia)
  2. Marca la versión vieja con `is_active = false`
  3. Actualiza `version: '1.0'` → `version: '1.1'` en `DOCUMENTOS_LEGALES`
- **Los PDFs se sirven públicamente** (están en `public/`). No incluyas información sensible interna — solo los textos legales que los contadores y sus clientes deben leer.

## Quién los redacta

Estos documentos deben ser redactados por un abogado mexicano con experiencia en:
- Protección de datos (LFPDPPP + lineamientos INAI)
- Contratos SaaS B2B
- Responsabilidad fiscal del custodio vs. del contribuyente (CFF art. 17-D, 113 bis)

No los genere con plantillas genéricas. El deslinde de responsabilidad fiscal en particular es el documento que te protege en juicio si un cliente del contador reclama una multa del SAT.
