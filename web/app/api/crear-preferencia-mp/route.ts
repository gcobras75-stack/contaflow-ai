/**
 * Crea una preferencia de pago en Mercado Pago para activar
 * la suscripción mensual de una empresa ($99 MXN/mes).
 *
 * POST { empresa_id }
 * → { preference_id, init_point }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MP_API = 'https://api.mercadopago.com';
const PRECIO = 99; // MXN por empresa / mes

export async function POST(req: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────
    const auth = req.headers.get('authorization') ?? '';
    const jwt  = auth.replace('Bearer ', '').trim();
    if (!jwt) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken || mpToken.includes('PLACEHOLDER')) {
      return NextResponse.json({ error: 'Mercado Pago no configurado' }, { status: 503 });
    }

    const { empresa_id } = await req.json() as { empresa_id: string };
    if (!empresa_id) return NextResponse.json({ error: 'Falta empresa_id' }, { status: 400 });

    // ── Verificar que el usuario es el contador de esta empresa ──
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('despacho_id')
      .eq('id', user.id)
      .single();

    const { data: empresa } = await supabaseAdmin
      .from('empresas_clientes')
      .select('id, nombre, rfc, despacho_id')
      .eq('id', empresa_id)
      .eq('despacho_id', usuario?.despacho_id ?? '')
      .single();

    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });

    // ── Crear suscripción en BD (si no existe) ─────────────────
    const { data: susExistente } = await supabaseAdmin
      .from('suscripciones')
      .select('id, status, trial_ends_at')
      .eq('empresa_id', empresa_id)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://contaflow.mx';

    // ── Crear preferencia en Mercado Pago ──────────────────────
    const preference = {
      items: [{
        id:          empresa_id,
        title:       `ContaFlow AI — ${empresa.nombre}`,
        description: `Suscripción mensual ContaFlow AI para RFC ${empresa.rfc}`,
        quantity:    1,
        currency_id: 'MXN',
        unit_price:  PRECIO,
      }],
      payer: {
        email: user.email,
      },
      external_reference: empresa_id,
      back_urls: {
        success: `${appUrl}/dashboard/billing?pago=ok&empresa=${empresa_id}`,
        failure: `${appUrl}/dashboard/billing?pago=error&empresa=${empresa_id}`,
        pending: `${appUrl}/dashboard/billing?pago=pendiente&empresa=${empresa_id}`,
      },
      auto_return: 'approved',
      notification_url: `${appUrl}/api/webhook-mp`,
      statement_descriptor: 'CONTAFLOW AI',
      metadata: {
        empresa_id,
        despacho_id: empresa.despacho_id,
        usuario_id:  user.id,
      },
    };

    const mpRes = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${mpToken}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      console.error('MP error:', err);
      return NextResponse.json({ error: 'Error al crear preferencia de pago' }, { status: 500 });
    }

    const mpData = await mpRes.json() as { id: string; init_point: string; sandbox_init_point: string };

    // ── Guardar preference_id en la suscripción ────────────────
    if (susExistente) {
      await supabaseAdmin
        .from('suscripciones')
        .update({ mp_preference_id: mpData.id, updated_at: new Date().toISOString() })
        .eq('id', susExistente.id);
    } else {
      await supabaseAdmin
        .from('suscripciones')
        .insert({
          empresa_id,
          despacho_id:   empresa.despacho_id,
          status:        'trial',
          mp_preference_id: mpData.id,
          trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        });
    }

    return NextResponse.json({
      preference_id: mpData.id,
      init_point:    mpData.init_point,
      // sandbox_init_point para pruebas
      sandbox_init_point: mpData.sandbox_init_point,
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
