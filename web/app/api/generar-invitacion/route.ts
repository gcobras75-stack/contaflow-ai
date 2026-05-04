import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function generarCodigo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0,O,I,1 para evitar confusión
  let codigo = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) codigo += '-';
    codigo += chars[Math.floor(Math.random() * chars.length)];
  }
  return codigo; // formato: XXXX-XXXX
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const jwt  = auth.replace('Bearer ', '').trim();
    if (!jwt) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { empresa_id } = await req.json() as { empresa_id: string };
    if (!empresa_id) return NextResponse.json({ error: 'Falta empresa_id' }, { status: 400 });

    const { data: usuario } = await supabaseAdmin
      .from('usuarios').select('despacho_id').eq('id', user.id).single();
    if (!usuario?.despacho_id) return NextResponse.json({ error: 'Usuario sin despacho' }, { status: 403 });

    // Verificar que la empresa pertenece al despacho
    const { data: empresa } = await supabaseAdmin
      .from('empresas_clientes')
      .select('id, nombre, rfc')
      .eq('id', empresa_id)
      .eq('despacho_id', usuario.despacho_id)
      .single();
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });

    // Cancelar invitaciones anteriores no usadas para esta empresa
    await supabaseAdmin
      .from('invitaciones')
      .update({ usado: true })
      .eq('empresa_id', empresa_id)
      .eq('usado', false);

    // Generar código único (reintentar si hay colisión)
    let codigo = '';
    let intentos = 0;
    while (intentos < 5) {
      codigo = generarCodigo();
      const { data: existente } = await supabaseAdmin
        .from('invitaciones').select('id').eq('codigo', codigo).single();
      if (!existente) break;
      intentos++;
    }

    const { data: inv, error: invErr } = await supabaseAdmin
      .from('invitaciones')
      .insert({
        despacho_id: usuario.despacho_id,
        empresa_id,
        codigo,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('codigo, expires_at')
      .single();

    if (invErr) throw invErr;

    return NextResponse.json({
      codigo:     inv.codigo,
      empresa:    empresa.nombre,
      rfc:        empresa.rfc,
      expira:     inv.expires_at,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
