import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/ratelimit'
import { rateLimitResponse, serverErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { getTrends, saveTrends } from '@/lib/queries/trends'

interface MLTrendItem    { keyword: string }
interface MLSearchResult { paging: { total: number }; results: Array<{ price: number }> }

interface TrendRecord {
  keyword: string; source: 'google' | 'mercadolibre' | 'tiktok'
  trend_score: number; is_early_signal: boolean
  historical_data?: Record<string, unknown>
}

function calculateScore(totalResults: number, avgPrice: number): number {
  let score = 50
  if (totalResults < 500)        score += 20
  else if (totalResults <= 2000) score += 10
  else if (totalResults > 10000) score -= 15
  if (avgPrice >= 200 && avgPrice <= 3000) score += 15
  score += Math.floor(Math.random() * 6)
  return Math.min(100, Math.max(0, score))
}

function getMockTrends(): TrendRecord[] {
  return [
    { keyword: 'audífonos bluetooth',  source: 'mercadolibre', trend_score: 82, is_early_signal: true  },
    { keyword: 'cargador inalámbrico', source: 'mercadolibre', trend_score: 74, is_early_signal: false },
    { keyword: 'soporte celular auto', source: 'mercadolibre', trend_score: 68, is_early_signal: false },
    { keyword: 'funda iPhone',         source: 'mercadolibre', trend_score: 55, is_early_signal: false },
    { keyword: 'teclado mecánico',     source: 'mercadolibre', trend_score: 79, is_early_signal: true  },
  ]
}

// GET /api/trends — público con rate limit
export async function GET(request: NextRequest) {
  const ip = getClientIP(request)
  const rl = checkRateLimit(`${ip}:/api/trends`, RATE_LIMITS.trends)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    // 1. Revisar caché en Neon (datos frescos de las últimas 6 horas)
    const cached = await getTrends(20)
    const freshCutoff = Date.now() - 6 * 60 * 60 * 1000
    const fresh = cached.filter((t) => new Date(t.detected_at).getTime() > freshCutoff)

    if (fresh.length >= 5) {
      return NextResponse.json({ data: fresh, source: 'cache' })
    }

    // 2. Obtener tendencias de MercadoLibre
    let keywords: string[] = []
    try {
      const res = await fetch('https://api.mercadolibre.com/trends/MLM', { next: { revalidate: 0 } })
      if (!res.ok) throw new Error(`ML trends status ${res.status}`)
      const data: MLTrendItem[] = await res.json()
      keywords = data.slice(0, 10).map((t) => t.keyword)
    } catch (mlErr) {
      logServerError(mlErr, 'GET /api/trends — fetch ML trends')
      if (cached.length > 0) return NextResponse.json({ data: cached, source: 'stale_cache' })
      return NextResponse.json({ data: getMockTrends(), source: 'mock' })
    }

    // 3. Métricas por keyword
    const toSave: TrendRecord[] = []
    await Promise.allSettled(
      keywords.map(async (keyword) => {
        try {
          const res = await fetch(`https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(keyword)}&limit=10`, { next: { revalidate: 0 } })
          if (!res.ok) return
          const data: MLSearchResult = await res.json()
          const prices     = data.results.map((r) => r.price).filter((p) => p > 0)
          const avgPrice   = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
          const score      = calculateScore(data.paging.total, avgPrice)
          toSave.push({ keyword, source: 'mercadolibre', trend_score: score, is_early_signal: score >= 75 && data.paging.total < 1000, historical_data: { total_results: data.paging.total, avg_price: Math.round(avgPrice) } })
        } catch (err) {
          logServerError(err, `GET /api/trends — keyword "${keyword}"`)
        }
      })
    )

    if (toSave.length === 0) {
      if (cached.length > 0) return NextResponse.json({ data: cached, source: 'stale_cache' })
      return NextResponse.json({ data: getMockTrends(), source: 'mock' })
    }

    // 4. Persistir en Neon
    await saveTrends(toSave).catch((err) => logServerError(err, 'GET /api/trends — save'))

    toSave.sort((a, b) => b.trend_score - a.trend_score)
    return NextResponse.json({ data: toSave, source: 'live' })
  } catch (err) {
    logServerError(err, 'GET /api/trends')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
