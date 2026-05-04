import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const jwt  = auth.replace('Bearer ', '').trim();
    if (!jwt) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { codigo } = await req.json() as { codigo: string };
    if (!codigo) return NextResponse.json({ error: 'Falta el código' }, { status: 400 });

    const codigoNorm = codigo.trim().toUpperCase();

    // Buscar invitación válida
    const { data: inv } = await supabaseAdmin
      .from('invitaciones')
      .select('id, despacho_id, empresa_id, usado, expires_at')
      .eq('codigo', codigoNorm)
      .single();

    if (!inv) return NextResponse.json({ error: 'Código inválido. Verifica con tu contador.' }, { status: 404 });
    if (inv.usado) return NextResponse.json({ error: 'Este código ya fue utilizado.' }, { status: 409 });
    if (new Date(inv.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Este código ha expirado. Solicita uno nuevo a tu contador.' }, { status: 410 });
    }

    // Verificar que el usuario no esté ya vinculado a una empresa
    const { data: usuarioExist } = await supabaseAdmin
      .from('usuarios').select('empresa_id, despacho_id, rol').eq('id', user.id).single();

    if (usuarioExist?.empresa_id) {
      return NextResponse.json({ error: 'Tu cuenta ya está vinculada a una empresa.' }, { status: 409 });
    }

    // Vincular usuario a la empresa y despacho
    const { error: updateErr } = await supabaseAdmin
      .from('usuarios')
      .update({
        empresa_id:  inv.empresa_id,
        despacho_id: inv.despacho_id,
        rol:         'empresa',
      })
      .eq('id', user.id);

    if (updateErr) throw updateErr;

    // Marcar invitación como usada
    await supabaseAdmin
      .from('invitaciones')
      .update({ usado: true, usado_por: user.id })
      .eq('id', inv.id);

    // Obtener datos de la empresa para el response
    const { data: empresa } = await supabaseAdmin
      .from('empresas_clientes')
      .select('nombre, rfc, giro')
      .eq('id', inv.empresa_id)
      .single();

    return NextResponse.json({
      ok:      true,
      empresa: empresa?.nombre,
      rfc:     empresa?.rfc,
      giro:    empresa?.giro,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
