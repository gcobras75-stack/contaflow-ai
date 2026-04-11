import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL   = 'claude-sonnet-4-6';

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

    const { data: usuario } = await supabaseAdmin
      .from('usuarios').select('despacho_id').eq('id', user.id).single();
    if (!usuario?.despacho_id) return NextResponse.json({ resumen: null });

    // Recopilar datos del despacho
    const { data: empresas } = await supabaseAdmin
      .from('empresas_clientes')
      .select('id, nombre, activa, sat_ultima_sync')
      .eq('despacho_id', usuario.despacho_id)
      .eq('activa', true);

    if (!empresas || empresas.length === 0) {
      return NextResponse.json({ resumen: 'Aún no tienes empresas cliente activas.' });
    }

    const inicioSemana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const inicioMes    = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const empresaIds = empresas.map(e => e.id);

    const [{ count: totalCfdis }, { count: cfdisSemana }, { count: cfdisPendientes }] = await Promise.all([
      supabaseAdmin.from('cfdis').select('id', { count: 'exact', head: true }).in('empresa_id', empresaIds),
      supabaseAdmin.from('cfdis').select('id', { count: 'exact', head: true })
        .in('empresa_id', empresaIds).gte('created_at', inicioSemana),
      supabaseAdmin.from('cfdis').select('id', { count: 'exact', head: true })
        .in('empresa_id', empresaIds).eq('status', 'pendiente'),
    ]);

    const { data: cfdisUltimos } = await supabaseAdmin
      .from('cfdis')
      .select('total, tipo, status, rfc_emisor')
      .in('empresa_id', empresaIds)
      .gte('created_at', inicioMes)
      .order('created_at', { ascending: false })
      .limit(20);

    const totalFacturado = (cfdisUltimos ?? [])
      .filter(c => c.status === 'aprobado' && c.tipo === 'ingreso')
      .reduce((s, c) => s + Number(c.total ?? 0), 0);

    const contexto = {
      empresas_activas: empresas.length,
      total_cfdis_acumulados: totalCfdis ?? 0,
      cfdis_esta_semana: cfdisSemana ?? 0,
      cfdis_pendientes_revision: cfdisPendientes ?? 0,
      total_facturado_mes: totalFacturado,
      empresas_sin_sincronizacion_sat: empresas.filter(e => !e.sat_ultima_sync).length,
    };

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey || apiKey.includes('PLACEHOLDER')) {
      return NextResponse.json({ resumen: null, error: 'Claude API key no configurada' });
    }

    const system = `Eres un asistente contable para despachos mexicanos.
Genera un resumen ejecutivo breve (máximo 3 oraciones) en español con el estado actual del despacho.
Sé directo, profesional y útil. Menciona lo más importante. No uses markdown.`;

    const userMsg = `Datos del despacho:
- Empresas cliente activas: ${contexto.empresas_activas}
- CFDIs acumulados total: ${contexto.total_cfdis_acumulados}
- CFDIs recibidos esta semana: ${contexto.cfdis_esta_semana}
- CFDIs pendientes de revisión: ${contexto.cfdis_pendientes_revision}
- Facturación aprobada este mes: $${totalFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
- Empresas sin sincronización SAT: ${contexto.empresas_sin_sincronizacion_sat}`;

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 200,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ resumen: null });
    }

    const data = await response.json() as { content?: { text?: string }[] };
    const resumen = data.content?.[0]?.text?.trim() ?? null;

    return NextResponse.json({ resumen, contexto });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg, resumen: null }, { status: 500 });
  }
}
