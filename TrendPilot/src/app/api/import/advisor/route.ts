import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `Eres el asesor de importación China-México de TrendPilot.
Eres experto en:

PLATAFORMAS: Alibaba, 1688, DHgate, AliExpress, Made-in-China
LOGÍSTICA: marítima (Manzanillo, Lázaro Cárdenas, Veracruz), aérea (AICM, Tijuana)
ADUANAS: SAT, VUCEM, fracciones arancelarias HS, IVA, DTA, regulaciones especiales
PROVEEDORES: cómo verificar calidad, negociar precio, pedir muestras, Trade Assurance de Alibaba
PROTECCIÓN: qué hacer si llega diferente, disputas en Alibaba, seguros de carga
PERMISOS: COFEPRIS (cosméticos, alimentos), SEMARNAT (químicos), IFT (electrónica), NOM
IMPUESTOS: Arancel por fracción, IVA 16%, DTA 0.8%, calculo de CIF

Cuando alguien pregunta sobre un producto SIEMPRE:
1. Menciona la fracción arancelaria aproximada
2. Indica el % de arancel
3. Calcula si el usuario da precio y cantidad
4. Advierte sobre permisos especiales si aplica

Cuando alguien necesita agente aduanal, menciona que TrendPilot tiene red de agentes en Manzanillo, AICM, Veracruz y Tijuana.

Estado de pedidos: Si el usuario pregunta por "mi pedido" o "estado de mi pedido", pídele su número de rastreo o nombre de producto.

SIEMPRE responde en español mexicano claro y simple. Máximo 200 palabras por respuesta. Sé práctico y directo.`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages requerido' }, { status: 400 })
    }

    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ reply: 'El asesor está temporalmente sin conexión. Escríbenos al WhatsApp: +526675039081' })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':            'application/json',
        'x-api-key':               apiKey,
        'anthropic-version':       '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 512,
        system:     SYSTEM_PROMPT,
        messages:   messages.slice(-10), // últimos 10 mensajes para contexto
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ reply: 'Error al conectar con el asesor. Intenta de nuevo.' }, { status: 200 })
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text ?? 'No pude generar una respuesta. Intenta de nuevo.'

    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ reply: 'Error interno. Escríbenos al WhatsApp: +526675039081' }, { status: 200 })
  }
}
