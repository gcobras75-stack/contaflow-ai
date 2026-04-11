/**
 * Lógica de comisiones de la red comercial ContaFlow.
 *
 * Modelo: cada pago $99 MXN/empresa se dispersa así
 *   60% ($59.40) → Automatia (residual matemático, NO se guarda fila)
 *   20% ($19.80) → Coordinador Regional (si existe referral)
 *   10% ($9.90)  → Vendedor                (si existe referral)
 *   10% ($9.90)  → Contador (cashback)     (siempre)
 *
 * Si un contador NO tiene referral, solo se genera la fila del cashback
 * y el 40% que hubiera ido a coord/vend queda como residual de Automatia
 * (también sin fila).
 *
 * Retención ISR: solo aplica a miembros de la red SIN RFC (Art. 106 LISR
 * simplificado — ver deuda técnica en migración 008). El contador cashback
 * NO lleva retención porque NO es honorarios, es un descuento/rebate.
 *
 * Estados iniciales:
 *   - Miembro red con RFC:    cfdi_status=pendiente, puede_pagar=false
 *   - Miembro red sin RFC:    cfdi_status=validado,  puede_pagar=true
 *     (Automatia emite CFDI global mensual por ellos)
 *   - Contador cashback:      cfdi_status=validado,  puede_pagar=true
 *     (no requiere CFDI del beneficiario)
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const RFC_AUTOMATIA = 'GUFM751113257';
export const PORCENTAJE_COORDINADOR = 20;
export const PORCENTAJE_VENDEDOR = 10;
export const PORCENTAJE_CASHBACK_CONTADOR = 10;
export const RETENCION_ISR_PCT = 10;

type MiembroRed = {
  id:        string;
  user_id:   string | null;
  rol:       'coordinador' | 'vendedor';
  nombre:    string;
  tiene_rfc: boolean;
  rfc:       string | null;
  activo:    boolean;
};

type ComisionRow = {
  mp_payment_id:       string;
  empresa_id:          string | null;
  periodo:             string;
  beneficiario_id:     string;
  beneficiario_tipo:   'coordinador' | 'vendedor' | 'contador';
  beneficiario_nombre: string | null;
  beneficiario_rfc:    string | null;
  monto_base:          number;
  porcentaje:          number;
  monto_comision:      number;
  retencion_isr:       number;
  tiene_rfc:           boolean;
  cfdi_status:         'pendiente' | 'validado';
  pago_status:         'pendiente';
  puede_pagar:         boolean;
};

/** Redondea a 2 decimales, evita drift de coma flotante. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula y persiste las comisiones de un pago aprobado.
 *
 * Idempotente vía UNIQUE(mp_payment_id, beneficiario_id, beneficiario_tipo)
 * en la tabla — si el webhook reintenta, los inserts duplicados fallan
 * silenciosamente y no generan filas extras.
 *
 * Retorna un resumen para logging/notificaciones.
 */
export async function procesarComisiones(
  supabase: SupabaseClient,
  params: {
    mp_payment_id:    string;
    empresa_id:       string;
    monto:            number;            // típicamente 99.00
    fecha_pago:       Date;              // para calcular periodo YYYY-MM
  },
): Promise<{
  comisiones_creadas: number;
  contador_email:     string | null;
  coordinador_email:  string | null;
  vendedor_email:     string | null;
}> {
  const periodo = `${params.fecha_pago.getFullYear()}-${String(params.fecha_pago.getMonth() + 1).padStart(2, '0')}`;

  // 1. Encontrar el contador "dueño" del despacho de esta empresa.
  //    Convención: el contador más antiguo del despacho (menor created_at).
  const { data: empresa } = await supabase
    .from('empresas_clientes')
    .select('id, despacho_id')
    .eq('id', params.empresa_id)
    .single();

  if (!empresa?.despacho_id) {
    console.warn('[comisiones] empresa sin despacho — no se generan comisiones', params.empresa_id);
    return {
      comisiones_creadas: 0,
      contador_email:     null,
      coordinador_email:  null,
      vendedor_email:     null,
    };
  }

  const { data: contadores } = await supabase
    .from('usuarios')
    .select('id, email, nombre')
    .eq('despacho_id', empresa.despacho_id)
    .eq('rol', 'contador')
    .order('created_at', { ascending: true })
    .limit(1);

  const contador = contadores?.[0];
  if (!contador) {
    console.warn('[comisiones] despacho sin contador — no se generan comisiones', empresa.despacho_id);
    return {
      comisiones_creadas: 0,
      contador_email:     null,
      coordinador_email:  null,
      vendedor_email:     null,
    };
  }

  // 2. Buscar referral (si existe)
  const { data: ref } = await supabase
    .from('referidos')
    .select('vendedor_id, coordinador_id')
    .eq('contador_id', contador.id)
    .maybeSingle();

  let coordinador: MiembroRed | null = null;
  let vendedor: MiembroRed | null = null;

  if (ref?.coordinador_id) {
    const { data } = await supabase
      .from('red_comercial')
      .select('id, user_id, rol, nombre, tiene_rfc, rfc, activo')
      .eq('id', ref.coordinador_id)
      .eq('activo', true)
      .maybeSingle();
    coordinador = (data as MiembroRed | null);
  }
  if (ref?.vendedor_id) {
    const { data } = await supabase
      .from('red_comercial')
      .select('id, user_id, rol, nombre, tiene_rfc, rfc, activo')
      .eq('id', ref.vendedor_id)
      .eq('activo', true)
      .maybeSingle();
    vendedor = (data as MiembroRed | null);
  }

  // 3. Armar las filas de comisiones
  const filas: ComisionRow[] = [];
  const base = params.monto;

  if (coordinador) {
    const monto    = round2(base * PORCENTAJE_COORDINADOR / 100);
    const retencion = coordinador.tiene_rfc ? 0 : round2(monto * RETENCION_ISR_PCT / 100);
    filas.push({
      mp_payment_id:       params.mp_payment_id,
      empresa_id:          empresa.id,
      periodo,
      beneficiario_id:     coordinador.id,
      beneficiario_tipo:   'coordinador',
      beneficiario_nombre: coordinador.nombre,
      beneficiario_rfc:    coordinador.rfc,
      monto_base:          base,
      porcentaje:          PORCENTAJE_COORDINADOR,
      monto_comision:      monto,
      retencion_isr:       retencion,
      tiene_rfc:           coordinador.tiene_rfc,
      cfdi_status:         coordinador.tiene_rfc ? 'pendiente' : 'validado',
      pago_status:         'pendiente',
      puede_pagar:         !coordinador.tiene_rfc,
    });
  }

  if (vendedor) {
    const monto    = round2(base * PORCENTAJE_VENDEDOR / 100);
    const retencion = vendedor.tiene_rfc ? 0 : round2(monto * RETENCION_ISR_PCT / 100);
    filas.push({
      mp_payment_id:       params.mp_payment_id,
      empresa_id:          empresa.id,
      periodo,
      beneficiario_id:     vendedor.id,
      beneficiario_tipo:   'vendedor',
      beneficiario_nombre: vendedor.nombre,
      beneficiario_rfc:    vendedor.rfc,
      monto_base:          base,
      porcentaje:          PORCENTAJE_VENDEDOR,
      monto_comision:      monto,
      retencion_isr:       retencion,
      tiene_rfc:           vendedor.tiene_rfc,
      cfdi_status:         vendedor.tiene_rfc ? 'pendiente' : 'validado',
      pago_status:         'pendiente',
      puede_pagar:         !vendedor.tiene_rfc,
    });
  }

  // Contador cashback — SIEMPRE se genera
  filas.push({
    mp_payment_id:       params.mp_payment_id,
    empresa_id:          empresa.id,
    periodo,
    beneficiario_id:     contador.id,
    beneficiario_tipo:   'contador',
    beneficiario_nombre: (contador as { nombre?: string }).nombre ?? null,
    beneficiario_rfc:    null,
    monto_base:          base,
    porcentaje:          PORCENTAJE_CASHBACK_CONTADOR,
    monto_comision:      round2(base * PORCENTAJE_CASHBACK_CONTADOR / 100),
    retencion_isr:       0,
    tiene_rfc:           false,
    cfdi_status:         'validado',  // no requiere CFDI
    pago_status:         'pendiente',
    puede_pagar:         true,
  });

  // 4. Insertar (idempotente vía unique index)
  const { error } = await supabase
    .from('comisiones')
    .upsert(filas, {
      onConflict: 'mp_payment_id,beneficiario_id,beneficiario_tipo',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('[comisiones] error insertando:', error.message);
    throw new Error(`No se pudieron registrar las comisiones: ${error.message}`);
  }

  // 5. Lookup emails para notificar (best-effort, no bloqueante)
  let coordinadorEmail: string | null = null;
  let vendedorEmail:    string | null = null;

  if (coordinador?.user_id) {
    const { data } = await supabase
      .from('usuarios').select('email').eq('id', coordinador.user_id).maybeSingle();
    coordinadorEmail = data?.email ?? null;
  }
  if (vendedor?.user_id) {
    const { data } = await supabase
      .from('usuarios').select('email').eq('id', vendedor.user_id).maybeSingle();
    vendedorEmail = data?.email ?? null;
  }

  return {
    comisiones_creadas: filas.length,
    contador_email:     (contador as { email?: string }).email ?? null,
    coordinador_email:  coordinadorEmail,
    vendedor_email:     vendedorEmail,
  };
}

/**
 * Stub de notificación por email. TODO: reemplazar con Resend cuando
 * RESEND_API_KEY esté configurada.
 */
export function notificarComision(params: {
  to:          string;
  tipo:        'coordinador' | 'vendedor' | 'contador';
  monto:       number;
  rfcAdmin:    string;
  tieneRfc:    boolean;
}): void {
  const subject = params.tipo === 'contador'
    ? `Tienes cashback de $${params.monto.toFixed(2)} en tu cuenta ContaFlow`
    : `Tienes comisión de $${params.monto.toFixed(2)} pendiente`;

  const body = params.tipo === 'contador'
    ? `Recibiste $${params.monto.toFixed(2)} MXN de cashback por el pago de tu suscripción. Se acredita en tu próxima factura.`
    : params.tieneRfc
      ? `Tienes una comisión de $${params.monto.toFixed(2)} MXN pendiente. Emite tu CFDI a RFC ${params.rfcAdmin} y súbelo desde tu panel para liberar el pago.`
      : `Tienes una comisión de $${params.monto.toFixed(2)} MXN lista para pago. Automatia emitirá el CFDI global al final del mes.`;

  // TODO: reemplazar con Resend/SendGrid real
  console.log('[comisiones] email stub:', { to: params.to, subject, body });
}
