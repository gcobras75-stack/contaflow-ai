/**
 * Chat con Asesor Fiscal ContaFlow para el cliente (dueño de negocio).
 * Responde en lenguaje simple, sin tecnicismos, conociendo el giro y régimen del negocio.
 *
 * POST { messages: [{role, content}], empresa_id? }
 * → { respuesta: string }
 */
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

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey || apiKey.includes('PLACEHOLDER')) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 });
    }

    const { messages } = await req.json() as {
      messages: { role: string; content: string }[];
    };

    // Obtener datos del negocio del cliente
    const { data: usr } = await supabaseAdmin
      .from('usuarios')
      .select('empresa_id, nombre')
      .eq('id', user.id)
      .single();

    let contextoNegocio = '';
    if (usr?.empresa_id) {
      const { data: empresa } = await supabaseAdmin
        .from('empresas_clientes')
        .select('nombre, giro, regimen_fiscal, rfc')
        .eq('id', usr.empresa_id)
        .single();

      if (empresa) {
        contextoNegocio = `
INFORMACIÓN DEL NEGOCIO DEL CLIENTE:
- Nombre del negocio: ${empresa.nombre}
- Giro / Actividad: ${empresa.giro ?? 'No especificado'}
- Régimen fiscal: ${empresa.regimen_fiscal ?? 'No especificado'}
- RFC: ${empresa.rfc}
- Nombre del dueño: ${usr.nombre ?? 'Cliente'}

Personaliza tus respuestas considerando su giro y régimen fiscal específico.`;
      }
    }

    const systemPrompt = `Eres el Asesor Fiscal Virtual de ContaFlow AI. Tu nombre es "Asesor ContaFlow".

Eres un experto en contabilidad y leyes fiscales mexicanas con 20 años de experiencia ayudando a pequeños y medianos empresarios. Conoces a fondo:
- ISR (Impuesto Sobre la Renta) para personas físicas y morales
- IVA (Impuesto al Valor Agregado) y su traslado
- RESICO (Régimen Simplificado de Confianza) — el régimen favorito de los pequeños empresarios
- RIF y Régimen General de Ley
- CFDI 4.0 y facturas electrónicas
- Deducciones autorizadas según el SAT
- Declaraciones provisionales y anuales
- IMSS, INFONAVIT para empleados
- Multas, recargos y cómo evitarlos
- Estrategias legales para pagar menos impuestos

${contextoNegocio}

CÓMO DEBES RESPONDER:
1. Habla como si fuera una conversación con un amigo que es contador — amigable, directo y claro
2. NUNCA uses jerga contable sin explicarla. Si debes usar un término técnico, explícalo en una frase
3. Da respuestas concretas y accionables — el empresario quiere saber QUÉ HACER, no solo teoría
4. Cuando hables de fechas, sé específico (ej: "el 17 de mayo" no "a fin de mes")
5. Si el empresario puede ahorrar dinero legalmente, díselo
6. Sé empático — muchos empresarios le tienen miedo al SAT, tranquilízalos
7. Respuestas cortas y puntuales — máximo 3 párrafos salvo que sea necesario más detalle
8. Usa emojis ocasionalmente para hacer la conversación más amigable 📊💡✅
9. Si no sabes algo con certeza, dilo y recomienda consultar con su contador directamente
10. Siempre recuerda que trabajas junto al contador del cliente, no en su lugar

TEMAS QUE DOMINAS:
- ¿Cuánto voy a pagar de impuestos este mes/año?
- ¿Qué gastos puedo deducir en mi negocio?
- ¿Cómo funciona el RESICO?
- ¿Cuándo son mis declaraciones?
- ¿Qué pasa si no declaro a tiempo?
- ¿Cómo le facturo a mis clientes?
- ¿Puedo deducir mi carro / celular / gasolina?
- ¿Cómo contrato empleados y qué pago al IMSS?
- ¿Qué es el IVA y cuándo lo tengo que pagar?
- Estrategias para reducir impuestos legalmente`;

    // Solo los últimos 10 mensajes para no exceder tokens
    const historial = messages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: 1024,
        system:     systemPrompt,
        messages:   historial,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Error al procesar tu pregunta' }, { status: 500 });
    }

    const data = await response.json() as { content?: { text?: string }[] };
    const respuesta = data.content?.[0]?.text?.trim() ?? 'No pude procesar tu pregunta, intenta de nuevo.';

    return NextResponse.json({ respuesta });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
