/**
 * Cron diario de cobros — /api/cron-cobros
 *
 * Revisa suscripciones con status = 'pago_pendiente' cuyo campo
 * pago_pendiente_desde supere los 3 días y las suspende.
 *
 * Programado en vercel.json: "0 9 * * *" (09:00 UTC cada día).
 * Protegido con Authorization: Bearer <CRON_SECRET>.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DIAS_GRACIA = 3;

export async function GET(req: NextRequest) {
  // Vercel llama con el header Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const limite = new Date(Date.now() - DIAS_GRACIA * 86_400_000).toISOString();

  // Buscar suscripciones pago_pendiente con más de DIAS_GRACIA días sin pagar
  const { data: vencidas, error } = await supabaseAdmin
    .from('suscripciones')
    .select('id, empresa_id')
    .eq('status', 'pago_pendiente')
    .lt('pago_pendiente_desde', limite);

  if (error) {
    console.error('cron-cobros: error consultando suscripciones', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!vencidas || vencidas.length === 0) {
    return NextResponse.json({ ok: true, suspendidas: 0 });
  }

  const ids        = vencidas.map(s => s.id);
  const empresaIds = vencidas.map(s => s.empresa_id).filter(Boolean);

  // Suspender suscripciones
  const { error: errSus } = await supabaseAdmin
    .from('suscripciones')
    .update({ status: 'suspendida', updated_at: new Date().toISOString() })
    .in('id', ids);

  if (errSus) {
    console.error('cron-cobros: error suspendiendo suscripciones', errSus);
    return NextResponse.json({ ok: false, error: errSus.message }, { status: 500 });
  }

  // Desactivar empresas
  if (empresaIds.length > 0) {
    await supabaseAdmin
      .from('empresas_clientes')
      .update({ activa: false })
      .in('id', empresaIds);
  }

  console.log(`cron-cobros: suspendidas ${ids.length} suscripciones`, ids);
  return NextResponse.json({ ok: true, suspendidas: ids.length, ids });
}
