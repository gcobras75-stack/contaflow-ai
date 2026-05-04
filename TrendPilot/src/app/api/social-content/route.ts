// /api/social-content — Genera posts de redes sociales con Claude
import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, forbiddenResponse, serverErrorResponse, validationErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { askClaude } from '@/lib/claude'
import { z } from 'zod'

const GenerateSchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'tiktok', 'whatsapp']),
  style:    z.enum(['educational', 'promotional', 'testimonial', 'viral']),
  topic:    z.string().min(2).max(200),
})

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  facebook:  'Post para grupo de Facebook de vendedores. Máximo 500 caracteres. Puede incluir emojis. Tono amigable y comunidad.',
  instagram: 'Caption de Instagram Story. Máximo 150 caracteres. Muy visual, emojis estratégicos, gancho inmediato.',
  tiktok:    'Caption de TikTok. Máximo 150 caracteres. Lenguaje joven, trending, CTAs directos.',
  whatsapp:  'Estado de WhatsApp. Máximo 139 caracteres. Conciso, personal, con emoji inicial.',
}

const STYLE_INSTRUCTIONS: Record<string, string> = {
  educational:  'Comparte un dato curioso o tip útil sobre el producto que aporte valor al lector.',
  promotional:  'Destaca la oferta, beneficio o propuesta de valor única. Urgencia sin presión excesiva.',
  testimonial:  'Narra la historia breve de un cliente satisfecho. Primera persona o citado.',
  viral:        'Abre con un hook sorprendente. Pregunta retórica o dato impactante que genere interacción.',
}

// Hashtags por plataforma y tema
function suggestHashtags(platform: string, topic: string): string[] {
  if (platform === 'whatsapp') return []  // WhatsApp estados no usan hashtags

  const base = topic.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quitar tildes
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .filter((w) => w.length > 3)
    .slice(0, 2)
    .map((w) => `#${w}`)

  const common = platform === 'tiktok'
    ? ['#fyp', '#parati', '#mexico']
    : ['#ecommerce', '#vendedores', '#mexico']

  return Array.from(new Set([...base, ...common])).slice(0, 5)
}

export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const body   = await request.json().catch(() => ({}))
    const parsed = GenerateSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const { platform, style, topic } = parsed.data

    const prompt = `Eres el equipo de contenido de TrendPilot, plataforma de marketing IA para vendedores en México.

Genera un post para ${platform.toUpperCase()} sobre: "${topic}"

Instrucciones de plataforma:
${PLATFORM_INSTRUCTIONS[platform]}

Estilo requerido:
${STYLE_INSTRUCTIONS[style]}

Reglas adicionales:
- En español mexicano casual y natural
- Menciona el producto "${topic}" de forma natural
- NO menciones precios específicos
- NO uses comillas al inicio o final
- Solo el texto del post, sin explicaciones ni notas

Responde ÚNICAMENTE con el texto del post.`

    const content = await askClaude(
      [{ role: 'user', content: prompt }],
      {
        maxTokens: 200,
        systemPrompt: 'Eres experto en marketing de contenidos para redes sociales en México. Writes concise, engaging social media posts in natural Mexican Spanish.',
      },
    )

    const hashtags = suggestHashtags(platform, topic)

    return NextResponse.json({ content: content.trim(), hashtags })
  } catch (err) {
    logServerError(err, 'POST /api/social-content')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
