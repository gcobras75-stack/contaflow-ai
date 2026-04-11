/**
 * Portal de cancelación / reactivación de suscripción.
 *
 * POST   /api/cancelar-suscripcion   { empresa_id, motivo?, all? }
 *        - all=true cancela TODAS las suscripciones del despacho
 *        - all=false o ausente cancela solo la empresa indicada
 *
 * PATCH  /api/cancelar-suscripcion   { empresa_id, all? }
 *        Reactivación. Restaura status_previo si la gracia (30 días desde
 *        fecha_cancelacion) aún aplica y el periodo previo sigue vigente.
 *        Si pasó la gracia o el periodo ya venció → status='vencida' y el
 *        frontend debe mandar al checkout de Mercado Pago.
 *
 * Modelo de datos:
 *   - Cada empresa_cliente tiene UNA suscripción (unique empresa_id)
 *   - Al cancelar:
 *       status_previo      = status actual (snapshot)
 *       status             = 'cancelada'
 *       fecha_cancelacion  = NOW()
 *       motivo_cancelacion = (string opcional)
 *   - Evidencia legal: INSERT en legal_acceptances con document_code
 *     'cancelacion_suscripcion' + IP + user_agent
 *   - Notificación stub a antonio@automatia.mx (console.log hasta que
 *     haya provider de email)
 *
 * Reglas de acceso tras cancelar (lo muestra la UI):
 *   - Si status_previo = 'activa' y periodo_fin > NOW → acceso hasta periodo_fin
 *   - Si status_previo = 'trial'  y trial_ends_at > NOW → acceso hasta trial_ends_at
 *   - En cualquier otro caso → acceso termina inmediato
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, getUserAgent } from '@/lib/request-meta';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Catálogo de motivos — el frontend muestra estas opciones en el dropdown.
const MOTIVOS_VALIDOS = new Set([
  'precio_alto',
  'no_uso_suficiente',
  'cambio_software',
  'cliente_ya_no_trabaja_conmigo',
  'problema_tecnico',
  'otro',
]);

const DIAS_GRACIA_REACTIVACION = 30;

type Suscripcion = {
  id:                 string;
  empresa_id:         string;
  despacho_id:        string | null;
  status:             string;
  status_previo:      string | null;
  trial_ends_at:      string | null;
  periodo_fin:        string | null;
  fecha_cancelacion:  string | null;
};

function errResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Calcula hasta qué fecha sigue teniendo acceso tras cancelar,
 * con base en el status al momento de cancelar.
 * Retorna null si el acceso termina inmediato.
 */
function calcularFechaAccesoFinal(sus: Suscripcion): string | null {
  const prev = sus.status_previo ?? sus.status;
  const ahora = Date.now();

  if (prev === 'activa' && sus.periodo_fin) {
    const fin = new Date(sus.periodo_fin).getTime();
    return fin > ahora ? sus.periodo_fin : null;
  }
  if (prev === 'trial' && sus.trial_ends_at) {
    const fin = new Date(sus.trial_ends_at).getTime();
    return fin > ahora ? sus.trial_ends_at : null;
  }
  return null;
}

/** Stub de email — reemplazar cuando haya provider real (Resend, etc). */
async function notificarCancelacion(params: {
  destinatario: string;
  despachoNombre: string | null;
  contadorEmail: string | null;
  empresas: { nombre: string; rfc: string }[];
  motivo: string | null;
}): Promise<void> {
  // TODO: cuando haya RESEND_API_KEY, reemplazar con llamada real.
  console.log('[cancelar-suscripcion] email stub:', {
    to:       params.destinatario,
    subject:  `Cancelación de suscripción — ${params.despachoNombre ?? 'despacho'}`,
    contador: params.contadorEmail,
    empresas: params.empresas.map(e => `${e.nombre} (${e.rfc})`),
    motivo:   params.motivo,
    timestamp: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════
// POST — Cancelar
// ═══════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const auth = req.headers.get('authorization') ?? '';
    const jwt = auth.replace('Bearer ', '').trim();
    if (!jwt) return errResponse(401, 'No autorizado');
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return errResponse(401, 'Token inválido');

    // 2. Verificar rol contador + despacho
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('rol, despacho_id, email, nombre')
      .eq('id', user.id)
      .single();

    if (!usuario || usuario.rol !== 'contador') {
      return errResponse(403, 'Solo contadores pueden cancelar suscripciones');
    }
    if (!usuario.despacho_id) {
      return errResponse(403, 'Contador sin despacho asignado');
    }

    // 3. Parse body
    const body = await req.json() as {
      empresa_id?: string;
      all?:        boolean;
      motivo?:     string | null;
    };

    const motivo = body.motivo ?? null;
    if (motivo && !MOTIVOS_VALIDOS.has(motivo)) {
      return errResponse(400, `Motivo no válido. Opciones: ${Array.from(MOTIVOS_VALIDOS).join(', ')}`);
    }

    // 4. Resolver qué suscripciones cancelar
    let query = supabaseAdmin
      .from('suscripciones')
      .select('id, empresa_id, despacho_id, status, status_previo, trial_ends_at, periodo_fin, fecha_cancelacion')
      .eq('despacho_id', usuario.despacho_id);

    if (!body.all) {
      if (!body.empresa_id) {
        return errResponse(400, 'Falta empresa_id (o all=true para cancelar todo)');
      }
      query = query.eq('empresa_id', body.empresa_id);
    }

    const { data: susList, error: susErr } = await query;
    if (susErr) return errResponse(500, susErr.message);
    if (!susList || susList.length === 0) {
      return errResponse(404, 'No se encontraron suscripciones para cancelar');
    }

    // Filtrar las que ya están canceladas — no hacer nada con ellas
    const activas = (susList as Suscripcion[]).filter(s => s.status !== 'cancelada');
    if (activas.length === 0) {
      return NextResponse.json({
        ok: true,
        mensaje: 'No había suscripciones activas para cancelar',
        canceladas: 0,
      });
    }

    // 5. Cancelar: snapshot status_previo + set cancelada
    const ahora = new Date().toISOString();
    const canceladas: Array<{ id: string; empresa_id: string; fecha_acceso_final: string | null }> = [];

    for (const s of activas) {
      const { error: updErr } = await supabaseAdmin
        .from('suscripciones')
        .update({
          status:             'cancelada',
          status_previo:      s.status,              // snapshot del status real en ese momento
          fecha_cancelacion:  ahora,
          motivo_cancelacion: motivo,
          updated_at:         ahora,
        })
        .eq('id', s.id);

      if (updErr) {
        console.error('[cancelar-suscripcion] update error:', updErr.message);
        continue;
      }

      canceladas.push({
        id:                  s.id,
        empresa_id:          s.empresa_id,
        fecha_acceso_final:  calcularFechaAccesoFinal({ ...s, status_previo: s.status }),
      });
    }

    // 6. Registrar aceptación legal (una fila por cada empresa cancelada)
    const ip = getClientIp(req);
    const ua = getUserAgent(req);

    const legalRows = canceladas.map(c => ({
      user_id:          user.id,
      despacho_id:      usuario.despacho_id,
      empresa_id:       c.empresa_id,
      document_code:    'cancelacion_suscripcion',
      document_version: '1.0',
      accepted_at:      ahora,
      ip_address:       ip,
      user_agent:       ua,
      is_accepted:      true,
    }));

    if (legalRows.length > 0) {
      const { error: legalErr } = await supabaseAdmin
        .from('legal_acceptances')
        .insert(legalRows);
      if (legalErr) {
        console.error('[cancelar-suscripcion] legal acceptance insert error:', legalErr.message);
      }
    }

    // 7. Notificar a antonio@automatia.mx (stub)
    const { data: despacho } = await supabaseAdmin
      .from('despachos')
      .select('nombre')
      .eq('id', usuario.despacho_id)
      .single();

    const { data: empresas } = await supabaseAdmin
      .from('empresas_clientes')
      .select('nombre, rfc')
      .in('id', canceladas.map(c => c.empresa_id));

    await notificarCancelacion({
      destinatario:   'antonio@automatia.mx',
      despachoNombre: despacho?.nombre ?? null,
      contadorEmail:  usuario.email ?? null,
      empresas:       empresas ?? [],
      motivo,
    });

    return NextResponse.json({
      ok:         true,
      canceladas: canceladas.length,
      detalles:   canceladas,
      mensaje:    canceladas.length === 1
        ? '1 suscripción cancelada'
        : `${canceladas.length} suscripciones canceladas`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return errResponse(500, msg);
  }
}

// ═══════════════════════════════════════════════════════════════
// PATCH — Reactivar
// ═══════════════════════════════════════════════════════════════
export async function PATCH(req: NextRequest) {
  try {
    // 1. Auth
    const auth = req.headers.get('authorization') ?? '';
    const jwt = auth.replace('Bearer ', '').trim();
    if (!jwt) return errResponse(401, 'No autorizado');
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return errResponse(401, 'Token inválido');

    // 2. Verificar rol
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('rol, despacho_id')
      .eq('id', user.id)
      .single();

    if (!usuario || usuario.rol !== 'contador') {
      return errResponse(403, 'Solo contadores pueden reactivar');
    }
    if (!usuario.despacho_id) {
      return errResponse(403, 'Contador sin despacho asignado');
    }

    // 3. Parse body
    const body = await req.json() as { empresa_id?: string; all?: boolean };

    let query = supabaseAdmin
      .from('suscripciones')
      .select('id, empresa_id, despacho_id, status, status_previo, trial_ends_at, periodo_fin, fecha_cancelacion')
      .eq('despacho_id', usuario.despacho_id)
      .eq('status', 'cancelada');

    if (!body.all) {
      if (!body.empresa_id) return errResponse(400, 'Falta empresa_id');
      query = query.eq('empresa_id', body.empresa_id);
    }

    const { data: susList, error: susErr } = await query;
    if (susErr) return errResponse(500, susErr.message);
    if (!susList || susList.length === 0) {
      return errResponse(404, 'No hay suscripciones canceladas para reactivar');
    }

    const ahora = Date.now();
    const gracia = DIAS_GRACIA_REACTIVACION * 86400000;

    const reactivadas: Array<{ empresa_id: string; restored_status: string }> = [];
    const requierenPago: Array<{ empresa_id: string; razon: string }> = [];

    for (const rawSus of susList) {
      const s = rawSus as Suscripcion;
      const cancelMs = s.fecha_cancelacion ? new Date(s.fecha_cancelacion).getTime() : 0;
      const dentroDeGracia = (ahora - cancelMs) < gracia;

      // ¿El estado previo sigue siendo vigente (periodo/trial no ha vencido)?
      let statusRestaurable: string | null = null;
      if (s.status_previo === 'activa' && s.periodo_fin && new Date(s.periodo_fin).getTime() > ahora) {
        statusRestaurable = 'activa';
      } else if (s.status_previo === 'trial' && s.trial_ends_at && new Date(s.trial_ends_at).getTime() > ahora) {
        statusRestaurable = 'trial';
      }

      if (dentroDeGracia && statusRestaurable) {
        // Restaurar al estado previo
        await supabaseAdmin
          .from('suscripciones')
          .update({
            status:             statusRestaurable,
            status_previo:      null,
            fecha_cancelacion:  null,
            motivo_cancelacion: null,
            updated_at:         new Date().toISOString(),
          })
          .eq('id', s.id);
        reactivadas.push({ empresa_id: s.empresa_id, restored_status: statusRestaurable });
      } else {
        // Ya no se puede reactivar gratis; hay que pasar por pago nuevo.
        // Marcamos como 'vencida' para que el frontend muestre botón "Contratar".
        await supabaseAdmin
          .from('suscripciones')
          .update({
            status:             'vencida',
            status_previo:      null,
            updated_at:         new Date().toISOString(),
          })
          .eq('id', s.id);
        requierenPago.push({
          empresa_id: s.empresa_id,
          razon: !dentroDeGracia
            ? 'Pasaron más de 30 días desde la cancelación'
            : 'El periodo previo ya venció',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      reactivadas,
      requieren_pago: requierenPago,
      mensaje: requierenPago.length > 0
        ? 'Algunas suscripciones requieren pago nuevo vía Mercado Pago'
        : `${reactivadas.length} suscripción(es) reactivada(s)`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return errResponse(500, msg);
  }
}
