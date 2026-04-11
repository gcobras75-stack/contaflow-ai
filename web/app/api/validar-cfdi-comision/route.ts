/**
 * Validación de CFDI subido por un beneficiario de la red comercial.
 *
 * Flujo: el vendedor/coordinador emite un CFDI a RFC GUFM751113257 (Automatia)
 * por el monto de su comisión, y sube el XML a este endpoint para liberar pago.
 *
 * Validaciones (XML-local, no consulta SAT — ver deuda técnica):
 *   1. El archivo parsea como CFDI 3.3 o 4.0
 *   2. UUID presente en el TimbreFiscalDigital
 *   3. RFC Receptor == RFC_AUTOMATIA
 *   4. RFC Emisor == comision.beneficiario_rfc (snapshot al momento del pago)
 *   5. Total del CFDI >= monto_comision (con tolerancia 0.01)
 *
 * Si todas las validaciones pasan:
 *   - cfdi_status = 'validado'
 *   - puede_pagar = true
 *   - cfdi_uuid, cfdi_fecha, cfdi_monto, cfdi_xml persistidos
 *
 * Si alguna falla:
 *   - cfdi_status = 'rechazado'
 *   - cfdi_motivo_rechazo = razón exacta
 *
 * ⚠️ Deuda técnica MVP:
 *   - No se valida el sello digital del CFDI (firma del SAT)
 *   - No se consulta el status en tiempo real al SAT (el CFDI podría estar
 *     cancelado y no nos enteraríamos)
 *   - Para un sprint dedicado: integrar @nodecfdi/credentials para verificar
 *     sello + endpoint SOAP de consulta SAT
 *
 * POST /api/validar-cfdi-comision
 * FormData: { comision_id: string, xml: File }
 * → { ok: true, cfdi_status: 'validado' | 'rechazado', motivo?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RFC_AUTOMATIA } from '@/lib/comisiones';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type CfdiParsed = {
  uuid:          string | null;
  rfcEmisor:     string | null;
  rfcReceptor:   string | null;
  total:         number;
  fecha:         string | null;
  version:       string | null;
};

/**
 * Parser simple de CFDI 3.3/4.0. Usa regex porque el formato es estable y
 * evitamos dependencias pesadas de XML parsing. Si el CFDI está mal formado,
 * retorna null en los campos no encontrados.
 */
function parseCfdi(xml: string): CfdiParsed {
  // Comprobante raíz: atributos Total, Fecha, Version
  const cmpMatch = xml.match(/<(?:cfdi:)?Comprobante\b([^>]*)>/i);
  const cmpAttrs = cmpMatch?.[1] ?? '';

  const totalStr = cmpAttrs.match(/\bTotal="([^"]+)"/i)?.[1] ?? '0';
  const total = parseFloat(totalStr) || 0;

  const fecha = cmpAttrs.match(/\bFecha="([^"]+)"/i)?.[1]?.slice(0, 10) ?? null;
  const version = cmpAttrs.match(/\bVersion="([^"]+)"/i)?.[1] ?? null;

  // Emisor / Receptor
  const emisorMatch = xml.match(/<(?:cfdi:)?Emisor\b[^>]*\bRfc="([^"]+)"/i);
  const receptorMatch = xml.match(/<(?:cfdi:)?Receptor\b[^>]*\bRfc="([^"]+)"/i);

  // UUID del TimbreFiscalDigital (complemento)
  const tfdMatch = xml.match(/<(?:tfd:)?TimbreFiscalDigital\b[^>]*\bUUID="([^"]+)"/i);

  return {
    uuid:        tfdMatch?.[1]?.toLowerCase() ?? null,
    rfcEmisor:   emisorMatch?.[1]?.toUpperCase() ?? null,
    rfcReceptor: receptorMatch?.[1]?.toUpperCase() ?? null,
    total,
    fecha,
    version,
  };
}

function errResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const authHeader = req.headers.get('authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) return errResponse(401, 'No autorizado');

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return errResponse(401, 'Token inválido');

    // 2. FormData
    const form = await req.formData();
    const comisionId = form.get('comision_id') as string;
    const xmlFile    = form.get('xml') as File | null;

    if (!comisionId || !xmlFile) {
      return errResponse(400, 'Faltan campos: comision_id y xml son requeridos');
    }

    // Límite de tamaño razonable para un CFDI (típicamente 5-15 KB, máx 50 KB)
    if (xmlFile.size > 100_000) {
      return errResponse(413, 'El archivo XML es demasiado grande (>100 KB)');
    }

    const xmlText = await xmlFile.text();

    // 3. Parse CFDI
    const parsed = parseCfdi(xmlText);

    if (!parsed.uuid) {
      return errResponse(422, 'No se encontró UUID en el TimbreFiscalDigital. ¿Es un CFDI válido timbrado?');
    }
    if (!parsed.rfcEmisor || !parsed.rfcReceptor) {
      return errResponse(422, 'CFDI sin RFC emisor o receptor.');
    }
    if (parsed.total <= 0) {
      return errResponse(422, 'El Total del CFDI debe ser mayor a cero.');
    }

    // 4. Cargar la comisión y verificar ownership
    const { data: comision, error: comErr } = await supabaseAdmin
      .from('comisiones')
      .select('id, beneficiario_id, beneficiario_tipo, beneficiario_rfc, monto_comision, tiene_rfc, cfdi_status, mp_payment_id')
      .eq('id', comisionId)
      .single();

    if (comErr || !comision) {
      return errResponse(404, 'Comisión no encontrada');
    }

    // Ownership: el usuario debe ser el beneficiario (via red_comercial.user_id)
    // o admin. El contador cashback no debería subir CFDI (no lo requiere).
    if (comision.beneficiario_tipo === 'contador') {
      return errResponse(400, 'El cashback del contador no requiere CFDI.');
    }
    if (!comision.tiene_rfc) {
      return errResponse(400, 'Este beneficiario no emite CFDI (retención ISR aplicada desde Automatia).');
    }

    // Verificar que el user autenticado es dueño de la comisión (o admin)
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    const esAdmin = usuario?.rol === 'superadmin';
    if (!esAdmin) {
      const { data: miembro } = await supabaseAdmin
        .from('red_comercial')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', comision.beneficiario_id)
        .maybeSingle();

      if (!miembro) {
        return errResponse(403, 'No eres dueño de esta comisión');
      }
    }

    // 5. Validaciones fiscales del CFDI
    const motivos: string[] = [];

    if (parsed.rfcReceptor !== RFC_AUTOMATIA) {
      motivos.push(`RFC Receptor debe ser ${RFC_AUTOMATIA}, encontrado: ${parsed.rfcReceptor}`);
    }

    if (comision.beneficiario_rfc && parsed.rfcEmisor !== comision.beneficiario_rfc.toUpperCase()) {
      motivos.push(`RFC Emisor (${parsed.rfcEmisor}) no coincide con el RFC registrado (${comision.beneficiario_rfc})`);
    }

    // Tolerancia de 1 centavo para evitar falsos positivos por redondeo
    const montoEsperado = Number(comision.monto_comision);
    if (Math.abs(parsed.total - montoEsperado) > 0.01) {
      motivos.push(`Total del CFDI ($${parsed.total.toFixed(2)}) no coincide con comisión ($${montoEsperado.toFixed(2)})`);
    }

    // 6. Persistir resultado
    if (motivos.length > 0) {
      const motivo = motivos.join(' · ');
      await supabaseAdmin
        .from('comisiones')
        .update({
          cfdi_status:         'rechazado',
          cfdi_motivo_rechazo: motivo,
          cfdi_uuid:           parsed.uuid,
          cfdi_fecha:          parsed.fecha,
          cfdi_monto:          parsed.total,
          cfdi_xml:            xmlText,
          updated_at:          new Date().toISOString(),
        })
        .eq('id', comisionId);

      return NextResponse.json({
        ok: true,
        cfdi_status: 'rechazado',
        motivo,
      }, { status: 200 });
    }

    await supabaseAdmin
      .from('comisiones')
      .update({
        cfdi_status:         'validado',
        cfdi_motivo_rechazo: null,
        cfdi_uuid:           parsed.uuid,
        cfdi_fecha:          parsed.fecha,
        cfdi_monto:          parsed.total,
        cfdi_xml:            xmlText,
        puede_pagar:         true,
        pago_status:         'liberado',
        updated_at:          new Date().toISOString(),
      })
      .eq('id', comisionId);

    return NextResponse.json({
      ok: true,
      cfdi_status: 'validado',
      uuid:        parsed.uuid,
      total:       parsed.total,
      mensaje:     'CFDI validado. Comisión liberada para pago.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return errResponse(500, msg);
  }
}
