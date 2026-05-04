// /api/lead-finder — Listar leads y disparar búsqueda de prospectos
import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, forbiddenResponse, serverErrorResponse, validationErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { getLeads, getLeadStats, upsertLeadBySellerId, getRecentSellerIds } from '@/lib/queries/leads'
import { searchMLProspects, getMockLeads } from '@/lib/leadfinder'
import { getTrends } from '@/lib/queries/trends'
import { z } from 'zod'

// GET /api/lead-finder — lista leads con filtros
export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  const url = new URL(request.url)
  const page        = Math.max(1, Number(url.searchParams.get('page')  ?? 1))
  const limit       = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50)))
  const status      = url.searchParams.get('status')      ?? undefined
  const temperature = url.searchParams.get('temperature') ?? undefined
  const source      = url.searchParams.get('source')      ?? undefined
  const minScore    = url.searchParams.get('minScore') ? Number(url.searchParams.get('minScore')) : undefined

  try {
    const [result, stats] = await Promise.all([
      getLeads({ page, limit, status, temperature, source, minScore }),
      getLeadStats(),
    ])
    return NextResponse.json({ data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total }, stats })
  } catch (err) {
    logServerError(err, 'GET /api/lead-finder')
    return serverErrorResponse()
  }
}

// POST /api/lead-finder — busca nuevos prospectos y los persiste
const SearchSchema = z.object({
  keyword:     z.string().min(2).max(100).optional(),
  use_trends:  z.boolean().default(true),
  use_mock:    z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const body   = await request.json().catch(() => ({}))
    const parsed = SearchSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const { keyword, use_trends, use_mock } = parsed.data

    // Obtener keywords de búsqueda
    let keywords: Array<{ keyword: string; score: number }> = []
    if (keyword) {
      keywords = [{ keyword, score: 75 }]
    } else if (use_trends) {
      const trends = await getTrends(10)
      keywords = trends.map((t) => ({ keyword: t.keyword, score: t.trend_score }))
    }

    // IDs ya contactados (deduplicación 30 días)
    const recentIds = new Set(await getRecentSellerIds())

    let prospects = use_mock ? getMockLeads() : []

    if (!use_mock && keywords.length > 0) {
      const searches = await Promise.allSettled(
        keywords.slice(0, 5).map((k) => searchMLProspects(k.keyword, k.score))
      )
      for (const r of searches) {
        if (r.status === 'fulfilled') prospects.push(...r.value)
      }
    }

    // Deduplicar y filtrar ya contactados
    const seen    = new Set<string>()
    const fresh   = prospects.filter((p) => {
      if (seen.has(p.seller_id) || recentIds.has(p.seller_id)) return false
      seen.add(p.seller_id)
      return true
    })

    // Persistir en DB
    let saved = 0
    for (const p of fresh) {
      const result = await upsertLeadBySellerId(p.seller_id, {
        source:            p.source,
        seller_id:         p.seller_id,
        seller_name:       p.seller_name,
        seller_nickname:   p.seller_nickname,
        product_name:      p.product_name,
        product_url:       p.product_url,
        product_thumbnail: p.product_thumbnail,
        product_price:     p.product_price,
        estimated_sales:   p.estimated_sales,
        ml_level:          p.ml_level,
        city:              p.city,
        lead_score:        p.lead_score,
        lead_temperature:  p.lead_temperature,
        trend_keyword:     p.trend_keyword,
        status:            'new',
      })
      if (result) saved++
    }

    return NextResponse.json({ ok: true, found: prospects.length, saved, deduplicated: prospects.length - fresh.length })
  } catch (err) {
    logServerError(err, 'POST /api/lead-finder')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
