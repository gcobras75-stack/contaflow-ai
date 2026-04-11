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

    const body = await req.json() as {
      empresa_id: string;
      banco: string;
      periodo: string;
      estado_id?: string;
    };
    const { empresa_id, banco, periodo } = body;

    if (!empresa_id || !banco) {
      return NextResponse.json({ error: 'Falta empresa_id o banco' }, { status: 400 });
    }

    const { data: usuario } = await supabaseAdmin
      .from('usuarios').select('despacho_id').eq('id', user.id).single();

    // Permitir acceso si el usuario tiene empresa_id asignada o es contador del despacho de la empresa
    const { data: empresa } = await supabaseAdmin
      .from('empresas_clientes')
      .select('id, nombre, rfc, giro')
      .eq('id', empresa_id)
      .single();
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });

    // Obtener CFDIs del período (mes del estado de cuenta)
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: cfdis } = await supabaseAdmin
      .from('cfdis')
      .select('tipo, total, iva, fecha_emision, rfc_emisor, rfc_receptor, fuente, status')
      .eq('empresa_id', empresa_id)
      .gte('created_at', inicioMes)
      .order('fecha_emision', { ascending: true })
      .limit(100);

    const ingresos = (cfdis ?? []).filter(c => c.tipo === 'ingreso');
    const egresos  = (cfdis ?? []).filter(c => c.tipo === 'egreso');
    const nomina   = (cfdis ?? []).filter(c => c.tipo === 'nomina');
    const pendientes = (cfdis ?? []).filter(c => c.status === 'pendiente');

    const totalIng = ingresos.reduce((s, c) => s + Number(c.total ?? 0), 0);
    const totalEgr = egresos.reduce((s, c) => s + Number(c.total ?? 0), 0);
    const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey || apiKey.includes('PLACEHOLDER')) {
      return NextResponse.json({ analisis: null, error: 'Claude API key no configurada' });
    }

    const system = `Eres un contador público mexicano especialista en conciliación bancaria y revisión de estados de cuenta.
Tu tarea es analizar los datos de un estado de cuenta junto con los CFDIs del período y generar:
1. Una conciliación preliminar
2. Alertas de posibles faltantes de facturas o comprobantes
3. Observaciones sobre gastos inusuales o relevantes

Responde en español. Sé específico y práctico. Máximo 350 palabras. Usa texto plano, sin markdown.`;

    const userMsg = `Analiza el estado de cuenta y los comprobantes de:

Empresa: ${empresa.nombre} (${empresa.rfc})
Banco: ${banco}
Período: ${periodo ?? 'Mes actual'}

CFDI REGISTRADOS ESTE PERÍODO:
- Facturas de ingreso: ${ingresos.length} por ${fmt(totalIng)}
- Facturas de egreso: ${egresos.length} por ${fmt(totalEgr)}
- Nómina: ${nomina.length} comprobante(s)
- CFDIs pendientes de validar: ${pendientes.length}
- Balance CFDIs: ${fmt(totalIng - totalEgr)}

${pendientes.length > 0 ? `ATENCIÓN: Hay ${pendientes.length} CFDIs pendientes de aprobación que podrían afectar la conciliación.` : ''}

${egresos.length === 0 ? 'ALERTA: No hay facturas de egreso registradas este mes. Verificar si todos los gastos están comprobados.' : ''}
${ingresos.length === 0 ? 'ALERTA: No hay facturas de ingreso registradas este mes.' : ''}

Por favor proporciona:
1. CONCILIACIÓN PRELIMINAR (estado de los registros)
2. ALERTAS (faltantes de facturas, gastos sin comprobar)
3. RECOMENDACIONES para completar la conciliación`;

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ analisis: null, error: 'Error al llamar a Claude' }, { status: 500 });
    }

    const data = await response.json() as { content?: { text?: string }[] };
    const analisis = data.content?.[0]?.text?.trim() ?? null;

    // Guardar análisis en el estado de cuenta si se proporcionó estado_id
    if (body.estado_id && analisis) {
      await supabaseAdmin
        .from('estados_cuenta')
        .update({ observaciones: analisis, status: 'revisado' })
        .eq('id', body.estado_id);
    }

    return NextResponse.json({
      analisis,
      resumen: { ingresos: ingresos.length, egresos: egresos.length, totalIng, totalEgr, pendientes: pendientes.length },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
