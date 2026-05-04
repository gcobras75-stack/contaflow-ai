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

    const { empresa_id } = await req.json() as { empresa_id: string };
    if (!empresa_id) return NextResponse.json({ error: 'Falta empresa_id' }, { status: 400 });

    const { data: usuario } = await supabaseAdmin
      .from('usuarios').select('despacho_id').eq('id', user.id).single();
    if (!usuario?.despacho_id) return NextResponse.json({ error: 'Usuario sin despacho' }, { status: 403 });

    const { data: empresa } = await supabaseAdmin
      .from('empresas_clientes')
      .select('id, nombre, rfc, giro, fiel_disponible, sat_ultima_sync')
      .eq('id', empresa_id)
      .eq('despacho_id', usuario.despacho_id)
      .single();
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });

    const tresMesesAtras = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [{ data: cfdis3m }, { data: cfdisMes }] = await Promise.all([
      supabaseAdmin.from('cfdis')
        .select('tipo, subtotal, iva, total, fecha_emision, status, fuente')
        .eq('empresa_id', empresa_id)
        .gte('created_at', tresMesesAtras)
        .order('fecha_emision', { ascending: false })
        .limit(200),
      supabaseAdmin.from('cfdis')
        .select('tipo, total, iva, status')
        .eq('empresa_id', empresa_id)
        .gte('created_at', inicioMes),
    ]);

    const ingresos3m   = (cfdis3m ?? []).filter(c => c.tipo === 'ingreso');
    const egresos3m    = (cfdis3m ?? []).filter(c => c.tipo === 'egreso');
    const nominaCfdi   = (cfdis3m ?? []).filter(c => c.tipo === 'nomina');
    const totalIngMes  = (cfdisMes ?? []).filter(c => c.tipo === 'ingreso').reduce((s, c) => s + Number(c.total ?? 0), 0);
    const totalEgrMes  = (cfdisMes ?? []).filter(c => c.tipo === 'egreso').reduce((s, c) => s + Number(c.total ?? 0), 0);
    const ivaDebido    = (cfdisMes ?? []).filter(c => c.tipo === 'ingreso').reduce((s, c) => s + Number(c.iva ?? 0), 0);
    const ivaAFavor    = (cfdisMes ?? []).filter(c => c.tipo === 'egreso').reduce((s, c) => s + Number(c.iva ?? 0), 0);
    const ivaNeto      = ivaDebido - ivaAFavor;
    const pendientes   = (cfdis3m ?? []).filter(c => c.status === 'pendiente').length;

    const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey || apiKey.includes('PLACEHOLDER')) {
      return NextResponse.json({ estrategia: null, error: 'Claude API key no configurada' });
    }

    const system = `Eres un Contador Público Certificado (CPC) mexicano con 20+ años de experiencia en planeación fiscal para PyMEs y personas morales.
Tu especialidad es ISR, IVA, CFDI 4.0, régimen RESICO, nómina, y deducciones autorizadas bajo la LISR y LIVA.
Responde en español, de forma estructurada y práctica. No uses markdown con asteriscos — usa texto plano con secciones claras.
Sé directo, específico para la situación de ESTA empresa. Máximo 400 palabras.`;

    const userMsg = `Genera una estrategia fiscal para:

Empresa: ${empresa.nombre}
RFC: ${empresa.rfc}
Giro: ${empresa.giro ?? 'No especificado'}
FIEL disponible: ${empresa.fiel_disponible ? 'Sí' : 'No'}
Última sincronización SAT: ${empresa.sat_ultima_sync ? new Date(empresa.sat_ultima_sync).toLocaleDateString('es-MX') : 'Nunca'}

DATOS ÚLTIMOS 3 MESES:
- CFDIs de ingreso: ${ingresos3m.length} (total: ${fmt(ingresos3m.reduce((s, c) => s + Number(c.total ?? 0), 0))})
- CFDIs de egreso: ${egresos3m.length} (total: ${fmt(egresos3m.reduce((s, c) => s + Number(c.total ?? 0), 0))})
- CFDIs de nómina: ${nominaCfdi.length}
- CFDIs pendientes de revisión: ${pendientes}

ESTE MES:
- Ingresos: ${fmt(totalIngMes)}
- Egresos: ${fmt(totalEgrMes)}
- IVA a pagar neto: ${fmt(Math.max(0, ivaNeto))}
- IVA a favor: ${fmt(Math.max(0, -ivaNeto))}

Por favor incluye:
1. SITUACIÓN ACTUAL (2-3 líneas)
2. RIESGOS DETECTADOS (si los hay)
3. ESTRATEGIA RECOMENDADA
4. ACCIONES INMEDIATAS (lista corta, máximo 4 puntos)`;

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 600,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      return NextResponse.json({ estrategia: null, error: `Claude API error: ${txt}` }, { status: 500 });
    }

    const data = await response.json() as { content?: { text?: string }[] };
    const estrategia = data.content?.[0]?.text?.trim() ?? null;

    return NextResponse.json({ estrategia, empresa: { nombre: empresa.nombre, rfc: empresa.rfc } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
