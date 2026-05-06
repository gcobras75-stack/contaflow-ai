import { NextRequest, NextResponse } from 'next/server'
import { eq, and, gte, lte } from 'drizzle-orm'
import {
  guardRoute, forbiddenResponse, serverErrorResponse, validationErrorResponse,
} from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { askClaude } from '@/lib/claude'
import { db } from '@/lib/db'
import { influencers } from '@/lib/schema'

// GET /api/influmatch?niche=moda&min_followers=5000&max_followers=100000
export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  const url    = new URL(request.url)
  const niche  = url.searchParams.get('niche')?.toLowerCase()
  const minF   = Number(url.searchParams.get('min_followers') ?? 5000)
  const maxF   = Number(url.searchParams.get('max_followers') ?? 100000)
  const status = url.searchParams.get('status')

  try {
    const conditions = [
      gte(influencers.followers, minF),
      lte(influencers.followers, maxF),
    ]

    if (status) conditions.push(eq(influencers.status, status as 'contacted' | 'active' | 'rejected'))

    let rows = await db.select().from(influencers).where(and(...conditions))

    // Filtrar por niche si se especificó
    if (niche) {
      rows = rows.filter((r) => r.niche?.toLowerCase().includes(niche))
    }

    // Ordenar por engagement_rate desc
    rows.sort((a, b) => Number(b.engagement_rate ?? 0) - Number(a.engagement_rate ?? 0))

    return NextResponse.json({ data: rows })
  } catch (err) {
    logServerError(err, 'GET /api/influmatch')
    return serverErrorResponse()
  }
}

// POST /api/influmatch — agregar influencer o generar propuesta
export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const body = await request.json()

    // Modo: generar propuesta Claude
    if (body.action === 'generate_proposal') {
      const { handle, niche, product_name } = body
      if (!handle || !product_name) return validationErrorResponse('handle y product_name requeridos')

      const raw = await askClaude([{
        role:    'user',
        content: `Genera un mensaje breve y atractivo para contactar a un micro-influencer mexicano @${handle} que hace contenido sobre ${niche ?? 'lifestyle'}.
El mensaje es de parte de TrendPilot, plataforma de marketing digital.
El producto es: "${product_name}".
El mensaje debe:
- Ser en español informal y amigable
- Máximo 4 líneas
- Mencionar que le mandamos muestra gratis
- Mencionar 15% de comisión por cada venta generada
- Terminar con una pregunta abierta
Solo el mensaje, sin comillas ni explicaciones adicionales.`,
      }], { maxTokens: 200 })

      return NextResponse.json({ proposal: raw.trim() })
    }

    // Modo: actualizar status de influencer
    if (body.action === 'update_status') {
      const { id, status } = body
      if (!id || !status) return validationErrorResponse('id y status requeridos')

      await db.update(influencers)
        .set({ status: status as 'contacted' | 'active' | 'rejected' })
        .where(eq(influencers.id, id))

      return NextResponse.json({ ok: true })
    }

    // Modo: agregar influencer nuevo
    const { platform, handle, followers, engagement_rate, niche, contact_email } = body
    if (!platform || !handle || !followers) return validationErrorResponse('platform, handle y followers requeridos')

    const [row] = await db.insert(influencers).values({
      platform,
      handle,
      followers:       Number(followers),
      engagement_rate: engagement_rate ? String(engagement_rate) : null,
      niche,
      contact_email,
      status:          'contacted',
    }).returning()

    return NextResponse.json({ data: row }, { status: 201 })
  } catch (err) {
    logServerError(err, 'POST /api/influmatch')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
