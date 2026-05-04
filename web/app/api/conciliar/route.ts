import { NextRequest, NextResponse } from 'next/server';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

type Movimiento = {
  fecha: string | null;
  concepto: string;
  referencia: string | null;
  cargo: number;
  abono: number;
};

type EstadoAnalizado = {
  banco: string | null;
  periodo: string | null;
  cuenta: string | null;
  saldo_inicial: number | null;
  saldo_final: number | null;
  movimientos: Movimiento[];
};

type CFDI = {
  id: string;
  uuid_sat: string | null;
  tipo: string | null;
  total: number | null;
  fecha_emision: string | null;
  status: string;
};

async function llamarClaude(system: string, userContent: string): Promise<unknown> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey || apiKey.startsWith('sk-ant-PLACEHOLDER')) {
    throw new Error('CLAUDE_API_KEY no configurada. Agrega tu API key de Anthropic en las variables de entorno.');
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json() as { content?: { text?: string }[] };
  const text = data.content?.[0]?.text ?? '';

  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ?? text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1] ?? jsonMatch[0]); } catch (_) { /* devuelve texto */ }
  }
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { contenido?: string; cfdis?: CFDI[] };
    const { contenido, cfdis = [] } = body;

    if (!contenido?.trim()) {
      return NextResponse.json(
        { error: 'Se requiere el contenido del estado de cuenta.' },
        { status: 400 },
      );
    }

    // ── Paso 1: Analizar estado de cuenta ────────────────────────────────────
    const systemEstado = `Eres un asistente contable especializado en estados de cuenta bancarios mexicanos.
Analiza el texto del estado de cuenta y extrae TODOS los movimientos.
Responde SOLO con JSON válido en este formato exacto:
{
  "banco": "nombre del banco",
  "periodo": "mes año",
  "cuenta": "últimos 4 dígitos si aparecen",
  "saldo_inicial": 0.00,
  "saldo_final": 0.00,
  "movimientos": [
    {
      "fecha": "YYYY-MM-DD",
      "concepto": "descripción del movimiento",
      "referencia": "número de referencia si existe",
      "cargo": 0.00,
      "abono": 0.00
    }
  ]
}
Usa null para campos que no puedas identificar. Los montos siempre como número decimal.`;

    const estadoAnalizado = await llamarClaude(
      systemEstado,
      `Analiza este estado de cuenta:\n\n${contenido}`,
    ) as EstadoAnalizado;

    // ── Paso 2: Conciliar contra CFDIs (si hay datos de ambos lados) ─────────
    let conciliacion = null;
    const movimientos = estadoAnalizado?.movimientos ?? [];

    if (cfdis.length > 0 && movimientos.length > 0) {
      const systemConc = `Eres un contador experto en conciliación bancaria para empresas mexicanas.
Compara los movimientos bancarios contra los CFDIs registrados.
Responde SOLO con JSON válido en este formato:
{
  "pagados": [
    { "cfdi_uuid": "...", "movimiento_concepto": "...", "monto": 0.00, "fecha": "YYYY-MM-DD" }
  ],
  "pendientes": [
    { "cfdi_uuid": "...", "total": 0.00, "fecha_emision": "YYYY-MM-DD", "motivo": "sin movimiento bancario" }
  ],
  "sin_cfdi": [
    { "concepto": "...", "monto": 0.00, "fecha": "YYYY-MM-DD", "sugerencia": "..." }
  ],
  "resumen": {
    "total_conciliado": 0.00,
    "total_pendiente": 0.00,
    "total_sin_cfdi": 0.00,
    "porcentaje_conciliacion": 0
  }
}`;

      conciliacion = await llamarClaude(
        systemConc,
        `Realiza la conciliación:\n${JSON.stringify({ movimientos, cfdis }, null, 2)}`,
      );
    }

    return NextResponse.json({ estadoAnalizado, conciliacion });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
