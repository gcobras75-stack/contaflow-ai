/**
 * Webhook de Mercado Pago.
 * Recibe notificaciones de pago y actualiza el status de la suscripción.
 *
 * MP envía: { type: 'payment', data: { id: '...' } }
 * Validamos la firma x-signature y consultamos el pago a la API de MP.
 *
 * Status MP → Status suscripción:
 *   approved  → activa (+ periodo 30 días)
 *   rejected  → vencida
 *   refunded  → vencida
 *   pending   → sin cambio
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MP_API = 'https://api.mercadopago.com';

/**
 * Verifica la firma HMAC de Mercado Pago.
 *
 * Referencia: https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks
 *
 * Formato del header x-signature: "ts=<unix-ts>,v1=<hex-sha256>"
 * Manifest que se firma: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 *
 * dataId: se obtiene primero del body parseado; si no está, se intenta query (?data.id=...).
 *
 * Retorna el motivo exacto del fallo para loguear (no exponer al cliente).
 */
type FirmaResult = { ok: true } | { ok: false; motivo: string };

function verificarFirma(req: NextRequest, dataId: string | undefined): FirmaResult {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // OBLIGATORIO en prod. Sin secret configurado, rechazamos todo.
    // Para desarrollo local, setea MP_WEBHOOK_SECRET en .env.local con el
    // mismo valor que en Mercado Pago (pestaña Webhooks → Clave secreta).
    return { ok: false, motivo: 'MP_WEBHOOK_SECRET no configurado' };
  }

  const xSignature = req.headers.get('x-signature') ?? '';
  const xRequestId = req.headers.get('x-request-id') ?? '';
  if (!xSignature || !xRequestId) {
    return { ok: false, motivo: 'Faltan headers x-signature o x-request-id' };
  }

  // Parse "ts=...,v1=..." (puede tener espacios)
  const parts: Record<string, string> = {};
  for (const kv of xSignature.split(',')) {
    const [k, v] = kv.trim().split('=');
    if (k && v) parts[k] = v;
  }
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) {
    return { ok: false, motivo: 'x-signature no contiene ts o v1' };
  }

  // Rechazo de replay: ventana de 5 minutos
  const tsNum = Number(ts);
  const ahora = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(tsNum) || Math.abs(ahora - tsNum) > 300) {
    return { ok: false, motivo: 'timestamp fuera de ventana de 5min (replay)' };
  }

  const id = dataId ?? new URL(req.url).searchParams.get('data.id') ?? '';
  if (!id) {
    return { ok: false, motivo: 'data.id ausente del payload y del query' };
  }

  const manifest = `id:${id};request-id:${xRequestId};ts:${ts};`;
  const hmac = createHmac('sha256', secret).update(manifest).digest('hex');

  // timingSafeEqual para evitar timing attacks
  const a = Buffer.from(hmac, 'hex');
  const b = Buffer.from(v1, 'hex');
  if (a.length !== b.length) return { ok: false, motivo: 'longitud HMAC inválida' };
  try {
    if (!timingSafeEqual(a, b)) return { ok: false, motivo: 'HMAC no coincide' };
  } catch {
    return { ok: false, motivo: 'error comparando HMAC' };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: { type?: string; data?: { id?: string }; action?: string } = {};
    try { body = JSON.parse(rawBody); } catch { /* ignorar */ }

    // VALIDACIÓN DE FIRMA HMAC — OBLIGATORIA.
    // Sin MP_WEBHOOK_SECRET configurado, todas las requests se rechazan.
    // Esto evita que un atacante active suscripciones falsas haciendo POST
    // con un paymentId real de otro cliente (tendría que saber ese ID, y
    // además firmar la request con el secret compartido con MP).
    //
    // El motivo del rechazo se loguea a consola para investigación, pero
    // el cliente solo ve 401 genérico — no filtramos si faltó el secret
    // del lado del server vs firma incorrecta del lado del cliente.
    const firma = verificarFirma(req, body.data?.id);
    if (!firma.ok) {
      console.warn('[webhook-mp] firma rechazada:', firma.motivo);
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    // Solo procesamos notificaciones de pagos
    if (body.type !== 'payment' && body.action !== 'payment.updated' && body.action !== 'payment.created') {
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) return NextResponse.json({ error: 'MP no configurado' }, { status: 503 });

    // Consultar el pago a Mercado Pago
    const mpRes = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });

    if (!mpRes.ok) {
      console.error('MP webhook: no se pudo consultar pago', paymentId);
      return NextResponse.json({ ok: false }, { status: 200 }); // 200 para que MP no reintente
    }

    const pago = await mpRes.json() as {
      status:             string;
      external_reference: string | null;
      metadata:           { empresa_id?: string; despacho_id?: string } | null;
      transaction_amount: number;
      date_approved:      string | null;
    };

    const empresaId = pago.external_reference ?? pago.metadata?.empresa_id;
    if (!empresaId) {
      console.warn('MP webhook: pago sin empresa_id', paymentId);
      return NextResponse.json({ ok: true });
    }

    // Mapear status MP → status suscripción
    //   approved  → activa       (pago exitoso, renovar periodo 31 días)
    //   rejected/cancelled/refunded/charged_back → pago_pendiente
    //     NO suspender inmediatamente; el cron /api/cron-cobros suspende
    //     después de 3 días sin regularizar (campo pago_pendiente_desde)
    const ahora      = new Date();
    const periodoFin = new Date(ahora.getTime() + 31 * 86400000);

    let nuevoStatus: string | null = null;
    if (pago.status === 'approved') {
      nuevoStatus = 'activa';
    } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(pago.status)) {
      nuevoStatus = 'pago_pendiente';
    }

    if (nuevoStatus) {
      const { data: sus } = await supabaseAdmin
        .from('suscripciones')
        .select('id, status')
        .eq('empresa_id', empresaId)
        .single();

      const updateBase: Record<string, unknown> = {
        status:        nuevoStatus,
        mp_payment_id: String(paymentId),
        updated_at:    ahora.toISOString(),
      };

      if (nuevoStatus === 'activa') {
        updateBase.periodo_inicio         = ahora.toISOString();
        updateBase.periodo_fin            = periodoFin.toISOString();
        updateBase.fecha_vencimiento      = periodoFin.toISOString();
        updateBase.pago_pendiente_desde   = null; // limpiar si venía de pendiente
      }

      if (nuevoStatus === 'pago_pendiente') {
        // Solo marcar pago_pendiente_desde si no estaba ya en ese estado
        if (sus?.status !== 'pago_pendiente') {
          updateBase.pago_pendiente_desde = ahora.toISOString();
        }
      }

      if (sus) {
        await supabaseAdmin.from('suscripciones').update(updateBase).eq('id', sus.id);
      } else {
        await supabaseAdmin.from('suscripciones').insert({
          empresa_id:   empresaId,
          despacho_id:  pago.metadata?.despacho_id ?? null,
          ...updateBase,
        });
      }

      // Activar empresa al pago exitoso
      if (nuevoStatus === 'activa') {
        await supabaseAdmin
          .from('empresas_clientes')
          .update({ activa: true })
          .eq('id', empresaId);
      }
      // pago_pendiente: NO desactivar todavía; el cron lo hará tras 3 días
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Webhook MP error:', e);
    // Retornar 200 para que MP no reintente indefinidamente
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Error' }, { status: 200 });
  }
}

/* GET para que MP pueda verificar el endpoint durante la configuración */
export async function GET() {
  return NextResponse.json({ ok: true, service: 'contaflow-webhook-mp' });
}
