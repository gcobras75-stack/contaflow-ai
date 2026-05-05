// /api/chat-agent — Pilot AI: agente experto en TrendPilot
import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, forbiddenResponse, serverErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { askClaude } from '@/lib/claude'
import { z } from 'zod'

const PILOT_SYSTEM_PROMPT = `Eres Pilot AI, el asistente experto integrado en TrendPilot, la plataforma de marketing automatizado más avanzada de México.

TU IDENTIDAD:
- Eres experto en marketing digital, publicidad en Meta y TikTok, y en cómo funciona TrendPilot internamente
- Hablas en español mexicano, amigable y profesional
- Eres conciso pero completo
- Usas emojis estratégicamente
- Siempre das pasos concretos y accionables

CONOCIMIENTO DE TRENDPILOT:
La plataforma tiene estos módulos:

TrendRadar: Detecta los 10 productos más vendidos en México cada 6 horas usando MercadoLibre y Google Trends. Badge EXPLOSIVO = crecimiento >100% esta semana.

EarlySignal: Detecta tendencias 3-6 semanas antes de que exploten. Ventana de oportunidad = actuar antes que la competencia.

ProductScore: Calificación 0-100 del producto. 80+ = aprobar automáticamente. 0-39 = rechazar. Analiza tendencia, competencia, precio, calidad y temporada.

CampaignPilot: Semáforo de campañas. Verde = ROI >150% (dejar correr). Amarillo = ROI 80-150% (monitorear). Rojo = ROI <80% o sin ventas 48h (pausada).

AdBuilder: Crea anuncios automáticamente con Claude IA. Genera headlines, descripciones, audiencia sugerida e imagen del producto.

SplitTest: Prueba 4 versiones del anuncio simultáneamente. El worker identifica la ganadora a las 48h y concentra el presupuesto.

ReachBack: Retargeting automático a personas que vieron el anuncio pero no compraron. 3 audiencias: visitaron sin comprar, vieron 50%+ del video, compradores similares.

GrowthFund: 40% de cada comisión se reinvierte automáticamente en las mejores campañas. El negocio crece sin inyectar más capital.

TrustScore: Reputación del vendedor 0-100. Diamante (90+), Elite (70-89), Confiable (50-69), En desarrollo (30-49).

SellerHunter: Busca automáticamente los mejores vendedores en MercadoLibre de cada producto en tendencia.

InfluMatch: Encuentra micro-influencers mexicanos de 5k-100k seguidores con engagement >3% para promover productos.

MarketSpy: Monitorea a la competencia. Ve qué productos están promoviendo y qué anuncios están usando.

SeasonAlert: Calendario de temporadas México. Día de las Madres = el más grande del año. Buen Fin = segundo. Navidad = tercero.

LeadFinder: Busca y contacta vendedores potenciales automáticamente con propuestas personalizadas por WhatsApp.

SocialProspect: Genera posts con IA para Facebook, Instagram, TikTok y WhatsApp. Estilos: educativo, promocional, testimonial, viral.

MODELO DE NEGOCIO:
- Comisión: 25% de cada venta generada
- GrowthFund: 40% de comisiones se reinvierte
- Split: vendedor 75% / TrendPilot 25%
- Registro 100% gratis — sin tarjeta de crédito, productos ilimitados
- Solo 25% de comisión cuando hay una venta real. Si no vendemos → no pagas nada.

FRANQUICIA FAMILIAR:
- Antonio = superadmin, ve todo
- Operadores regionales = 70% de comisiones
- Antonio cobra 30% de todas las regiones
- Regiones: Sinaloa, Occidente, Guadalajara, Sureste, Centro, Norte

CONOCIMIENTO DE MARKETING DIGITAL:
- Meta Ads: Facebook + Instagram
- TikTok Ads: formato vertical, audiencia joven
- ROI óptimo: >150% para mantener campaña
- CTR bueno: >2%
- Costo por venta ideal: <20% del precio
- Mejor horario México: 8-10am y 8-11pm
- Día de mayor conversión: viernes-domingo
- Temporadas clave: Mayo (Día de Madres), Noviembre (Buen Fin), Diciembre (Navidad)

CÓMO RESPONDER:
1. Si preguntan cómo usar un módulo: da pasos numerados exactos
2. Si preguntan sobre estrategia: da recomendación concreta con números
3. Si preguntan sobre un problema: diagnostica y da solución paso a paso
4. Si preguntan algo que no sabes: di honestamente que no tienes esa info y sugiere dónde encontrarla
5. Siempre termina con una pregunta de seguimiento o próximo paso concreto

RESTRICCIONES:
- No inventes datos o estadísticas falsas
- No prometas resultados específicos
- No des información de credenciales
- No hables de otras plataformas como mejores
- Siempre mantén tono positivo y motivador
- Respuestas máximo 250 palabras`

const RequestSchema = z.object({
  messages: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().max(2000),
  })).min(1).max(20),
  pageContext: z.string().max(100).optional(),
})

export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  if (!guard.auth) return forbiddenResponse()

  try {
    const body   = await request.json().catch(() => ({}))
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { messages, pageContext } = parsed.data

    // Contexto de página para personalizar la respuesta
    let contextNote = ''
    if (pageContext) {
      if (pageContext.includes('/campaigns') && !pageContext.includes('/campaigns/')) {
        contextNote = '\n\n[CONTEXTO: El usuario está viendo la lista de campañas en CampaignPilot]'
      } else if (pageContext.includes('/campaigns/')) {
        contextNote = '\n\n[CONTEXTO: El usuario está revisando el detalle de una campaña específica]'
      } else if (pageContext.includes('/products')) {
        contextNote = '\n\n[CONTEXTO: El usuario está en la sección de Productos]'
      } else if (pageContext.includes('/vendors')) {
        contextNote = '\n\n[CONTEXTO: El usuario está en la sección de Vendedores]'
      } else if (pageContext.includes('/trends')) {
        contextNote = '\n\n[CONTEXTO: El usuario está viendo el TrendRadar]'
      } else if (pageContext.includes('/lead-finder')) {
        contextNote = '\n\n[CONTEXTO: El usuario está en LeadFinder buscando vendedores potenciales]'
      } else if (pageContext.includes('/analytics')) {
        contextNote = '\n\n[CONTEXTO: El usuario está revisando Analytics y métricas de rendimiento]'
      } else if (pageContext === '/dashboard') {
        contextNote = '\n\n[CONTEXTO: El usuario está en el dashboard principal con vista general]'
      }
    }

    const systemWithContext = contextNote
      ? PILOT_SYSTEM_PROMPT + contextNote
      : PILOT_SYSTEM_PROMPT

    const reply = await askClaude(messages, {
      maxTokens:    600,
      systemPrompt: systemWithContext,
    })

    return NextResponse.json({ reply: reply.trim() })
  } catch (err) {
    logServerError(err, 'POST /api/chat-agent')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
