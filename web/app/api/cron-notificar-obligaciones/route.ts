/**
 * Cron: notificar obligaciones fiscales próximas a vencer.
 *
 * Corre diariamente (ver vercel.json schedule). Para cada obligación
 * 'pendiente' cuyo fecha_limite está entre hoy y hoy+5 días, y que
 * aún NO tiene notificacion_enviada=true:
 *
 *   1. Arma contexto: empresa, despacho, contador(es), obligación
 *   2. Envía email al/los contadores vinculados al despacho
 *   3. Marca notificacion_enviada=true (idempotente: no re-envía)
 *
 * Además, en la misma corrida, flipea pendiente → vencido para
 * obligaciones cuya fecha_limite ya pasó sin marcarse presentado.
 *
 * Auth: header Authorization: Bearer <CRON_SECRET>
 *
 * ⚠️ EMAIL PROVIDER NO CONFIGURADO
 * La función enviarEmail() hoy solo loguea a consola. Para activar
 * envíos reales:
 *   1. Agrega RESEND_API_KEY (o similar) a Vercel env
 *   2. npm install resend
 *   3. Reemplaza el stub de enviarEmail() con el call real
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DIAS_ANTICIPACION = 5;

type ObligacionProxima = {
  id:           string;
  despacho_id:  string;
  empresa_id:   string;
  obligacion:   string;
  tipo:         string;
  fecha_limite: string;
  empresas_clientes: { nombre: string; rfc: string } | null;
  despachos:         { nombre: string; email: string } | null;
};

/**
 * STUB: aquí irá la llamada real al provider de email.
 * Hoy solo loguea; en prod, reemplazar con Resend/SendGrid/SES.
 *
 * Retorna true si el "envío" fue exitoso (para efectos del flag
 * notificacion_enviada). Como es stub, siempre retorna true.
 */
async function enviarEmail(params: {
  to:      string;
  subject: string;
  body:    string;
  ctx:     ObligacionProxima;
}): Promise<boolean> {
  // TODO: reemplazar con Resend cuando RESEND_API_KEY esté configurada.
  //
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY!);
  // const { error } = await resend.emails.send({
  //   from:    'ContaFlow AI <obligaciones@contaflow.mx>',
  //   to:      [params.to],
  //   subject: params.subject,
  //   html:    params.body,
  // });
  // return !error;

  console.log('[cron-notificar-obligaciones] TODO email stub:', {
    to:      params.to,
    subject: params.subject,
    obligacion: params.ctx.obligacion,
    empresa:    params.ctx.empresas_clientes?.nombre,
    fecha:      params.ctx.fecha_limite,
  });
  return true; // stub — marca como enviado aunque no haya provider todavía
}

function buildEmailBody(o: ObligacionProxima): { subject: string; body: string } {
  const empresa  = o.empresas_clientes?.nombre ?? 'empresa';
  const rfc      = o.empresas_clientes?.rfc ?? '';
  const fecha    = new Date(o.fecha_limite + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const subject = `Recordatorio: ${o.obligacion} vence el ${fecha} — ${empresa}`;

  const body = `
<div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1B3A6B;">Recordatorio de obligación fiscal</h2>
  <p>Tu cliente <strong>${empresa}</strong> (${rfc}) tiene una obligación fiscal próxima a vencer:</p>
  <div style="background: #F0F4FF; border-left: 4px solid #1B3A6B; padding: 16px; margin: 16px 0;">
    <div style="font-size: 18px; font-weight: bold; color: #1B3A6B;">${o.obligacion}</div>
    <div style="color: #666; margin-top: 4px;">Vence el ${fecha}</div>
  </div>
  <p>Entra a tu panel de ContaFlow AI para marcarla como presentada una vez declarada.</p>
  <p style="color: #999; font-size: 12px; margin-top: 32px;">
    Este recordatorio se envía automáticamente 5 días antes del vencimiento.
    La fecha mostrada ya incluye el ajuste del Art. 12 CFF cuando aplica.
  </p>
</div>`.trim();

  return { subject, body };
}

export async function GET(req: NextRequest) {
  // Auth: solo Vercel cron (con CRON_SECRET)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 });
  }
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const resultados = {
    notificadas:      0,
    notificaciones_fallidas: 0,
    marcadas_vencidas: 0,
    errores:          [] as string[],
  };

  try {
    // ── 1. Marcar como vencidas las pendientes cuya fecha pasó ──
    const { data: vencidas, error: errVencidas } = await supabaseAdmin
      .from('calendario_obligaciones')
      .update({ status: 'vencido' })
      .eq('status', 'pendiente')
      .lt('fecha_limite', new Date().toISOString().slice(0, 10))
      .select('id');

    if (errVencidas) {
      resultados.errores.push(`marcar vencidas: ${errVencidas.message}`);
    } else {
      resultados.marcadas_vencidas = vencidas?.length ?? 0;
    }

    // ── 2. Buscar obligaciones pendientes de notificar ──
    // Entre hoy y hoy+5 días, no presentadas, notificación aún no enviada.
    const hoy      = new Date();
    const cincoD   = new Date(hoy.getTime() + DIAS_ANTICIPACION * 86400000);
    const fechaIni = hoy.toISOString().slice(0, 10);
    const fechaFin = cincoD.toISOString().slice(0, 10);

    const { data: proximas, error: errProx } = await supabaseAdmin
      .from('calendario_obligaciones')
      .select(`
        id, despacho_id, empresa_id, obligacion, tipo, fecha_limite,
        empresas_clientes ( nombre, rfc ),
        despachos         ( nombre, email )
      `)
      .eq('status', 'pendiente')
      .eq('notificacion_enviada', false)
      .gte('fecha_limite', fechaIni)
      .lte('fecha_limite', fechaFin);

    if (errProx) {
      resultados.errores.push(`query próximas: ${errProx.message}`);
      return NextResponse.json(resultados, { status: 500 });
    }

    // ── 3. Enviar una notificación por obligación ──
    for (const raw of (proximas ?? [])) {
      const o = raw as unknown as ObligacionProxima;
      const despacho = o.despachos;

      if (!despacho?.email) {
        resultados.errores.push(`${o.obligacion}: despacho sin email`);
        continue;
      }

      const { subject, body } = buildEmailBody(o);

      try {
        const ok = await enviarEmail({
          to: despacho.email,
          subject,
          body,
          ctx: o,
        });

        if (ok) {
          // Marcar como notificada solo si el envío fue exitoso
          const { error: updErr } = await supabaseAdmin
            .from('calendario_obligaciones')
            .update({ notificacion_enviada: true })
            .eq('id', o.id);

          if (updErr) {
            resultados.errores.push(`update flag ${o.id}: ${updErr.message}`);
            resultados.notificaciones_fallidas++;
          } else {
            resultados.notificadas++;
          }
        } else {
          resultados.notificaciones_fallidas++;
        }
      } catch (e) {
        resultados.notificaciones_fallidas++;
        resultados.errores.push(`envío ${o.id}: ${e instanceof Error ? e.message : 'error'}`);
      }
    }

    return NextResponse.json({
      ok:              true,
      ejecutado:       new Date().toISOString(),
      ...resultados,
    });
  } catch (e) {
    return NextResponse.json({
      ok:     false,
      error:  e instanceof Error ? e.message : 'Error interno',
      ...resultados,
    }, { status: 500 });
  }
}
