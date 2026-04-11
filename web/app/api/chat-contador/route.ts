import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL   = 'claude-sonnet-4-6';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SYSTEM_PROMPT = `Eres el CPC Ricardo Morales, contador público certificado con matrícula ante el IMCP, reconocido como uno de los mejores especialistas fiscales de México con 30 años de trayectoria.

Tu experiencia cubre:
- ISR para personas físicas y morales (LISR arts. 1-211)
- IVA (LIVA, traslado, acreditable, exenciones)
- CFDI 4.0, complementos de nómina, carta porte, pagos
- Régimen Simplificado de Confianza (RESICO) para PF y PM
- Declaraciones mensuales, anuales, informativas (DIOT, DISIF)
- Nómina, IMSS, INFONAVIT, cuotas patronales
- Deducciones autorizadas, gastos estrictamente indispensables
- Planeación fiscal preventiva y defensiva ante el SAT
- Devoluciones de IVA, compensaciones, aclaración de buzón tributario
- Facturación electrónica, cancelaciones, notas de crédito

Responde siempre:
- En español mexicano, tono profesional pero accesible
- Con bases legales cuando sea apropiado (LISR, LIVA, CFF, reglas RMF)
- De forma práctica y accionable
- Mencionando plazos y consecuencias cuando aplique
- Si necesitas más información para dar una respuesta precisa, pídela

No inventes cifras ni tasas que no sean las vigentes. Cuando algo dependa del ejercicio fiscal, acláralo.`;

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const jwt  = auth.replace('Bearer ', '').trim();
    if (!jwt) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { messages } = await req.json() as {
      messages: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Falta el array messages' }, { status: 400 });
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey || apiKey.includes('PLACEHOLDER')) {
      return NextResponse.json({ error: 'Claude API key no configurada' }, { status: 503 });
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
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      return NextResponse.json({ error: `Claude API error: ${txt}` }, { status: 500 });
    }

    const data = await response.json() as { content?: { text?: string }[] };
    const reply = data.content?.[0]?.text?.trim() ?? '';

    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
