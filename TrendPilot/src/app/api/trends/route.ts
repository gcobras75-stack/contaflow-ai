import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/ratelimit'
import { rateLimitResponse, serverErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'

// ─── Tipos internos ──────────────────────────────────────────────────────────

interface MLTrendItem {
  keyword: string
}

interface MLSearchResult {
  paging: { total: number }
  results: Array<{ price: number }>
}

interface TrendRecord {
  keyword:        string
  source:         string
  trend_score:    number
  badge:          string
  is_early_signal: boolean
  total_results:  number
  avg_price:      number
  detected_at:    string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Calcular score 0-100 según competencia y precio
function calculateScore(totalResults: number, avgPrice: number): number {
  let score = 50

  // Ajuste por nivel de competencia
  if (totalResults < 500)        score += 20   // competencia baja → oportunidad
  else if (totalResults <= 2000) score += 10   // competencia media
  else if (totalResults > 10000) score -= 15   // saturado

  // Ajuste por precio (rango ideal para e-commerce MX: 200-3000 MXN)
  if (avgPrice >= 200 && avgPrice <= 3000) score += 15

  // Variación aleatoria para simular dinámica de mercado (+0 a +5)
  score += Math.floor(Math.random() * 6)

  // Asegurar rango 0-100
  return Math.min(100, Math.max(0, score))
}

// Determinar badge según score
function getBadge(score: number): string {
  if (score >= 80) return 'EXPLOSIVO'
  if (score >= 60) return 'EN ALERTA'
  return 'ESTABLE'
}

// Datos de emergencia cuando la API de ML falla y no hay caché
function getMockTrends(): TrendRecord[] {
  const now = new Date().toISOString()
  return [
    { keyword: 'audífonos bluetooth', source: 'mercadolibre', trend_score: 82, badge: 'EXPLOSIVO', is_early_signal: true,  total_results: 320,  avg_price: 450,  detected_at: now },
    { keyword: 'cargador inalámbrico',source: 'mercadolibre', trend_score: 74, badge: 'EN ALERTA', is_early_signal: false, total_results: 680,  avg_price: 280,  detected_at: now },
    { keyword: 'soporte celular auto', source: 'mercadolibre', trend_score: 68, badge: 'EN ALERTA', is_early_signal: false, total_results: 1100, avg_price: 180,  detected_at: now },
    { keyword: 'funda iPhone',        source: 'mercadolibre', trend_score: 55, badge: 'ESTABLE',   is_early_signal: false, total_results: 4200, avg_price: 120,  detected_at: now },
    { keyword: 'teclado mecánico',    source: 'mercadolibre', trend_score: 79, badge: 'EN ALERTA', is_early_signal: true,  total_results: 410,  avg_price: 890,  detected_at: now },
  ]
}

// ─── GET /api/trends ─────────────────────────────────────────────────────────
// Endpoint público — no requiere auth (los vendors ven tendencias libremente)
// Rate limit: 10 req/min por IP

export async function GET(request: NextRequest) {
  // Rate limiting por IP
  const ip = getClientIP(request)
  const rl = checkRateLimit(`${ip}:/api/trends`, RATE_LIMITS.trends)
  if (!rl.allowed) {
    return rateLimitResponse(rl.resetAt)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // 1. Revisar caché en Supabase (datos frescos de las últimas 6 horas)
    const { data: cached, error: cacheError } = await supabase
      .from('trends')
      .select('*')
      .eq('source', 'mercadolibre')
      .gte('detected_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order('trend_score', { ascending: false })
      .limit(20)

    if (!cacheError && cached && cached.length >= 5) {
      // Caché válida — responder inmediatamente
      return NextResponse.json({ data: cached, source: 'cache' })
    }

    // 2. Obtener tendencias actuales de MercadoLibre (API pública, sin auth)
    let keywords: string[] = []

    try {
      const trendsRes = await fetch('https://api.mercadolibre.com/trends/MLM', {
        next: { revalidate: 0 }, // no cachear en Next.js — nosotros controlamos el caché
      })

      if (!trendsRes.ok) throw new Error(`ML trends status ${trendsRes.status}`)

      const trendsData: MLTrendItem[] = await trendsRes.json()
      keywords = trendsData.slice(0, 10).map((t) => t.keyword)
    } catch (mlErr) {
      logServerError(mlErr, 'GET /api/trends — fetch ML trends')

      // Si hay caché aunque sea vieja, devolverla
      if (cached && cached.length > 0) {
        return NextResponse.json({ data: cached, source: 'stale_cache' })
      }

      // Sin caché: datos mock para no romper la UI
      return NextResponse.json({ data: getMockTrends(), source: 'mock' })
    }

    // 3. Para cada keyword, obtener métricas de búsqueda
    const trendsToUpsert: TrendRecord[] = []

    await Promise.allSettled(
      keywords.map(async (keyword) => {
        try {
          const searchRes = await fetch(
            `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(keyword)}&limit=10`,
            { next: { revalidate: 0 } }
          )

          if (!searchRes.ok) return

          const searchData: MLSearchResult = await searchRes.json()
          const totalResults = searchData.paging.total
          const prices = searchData.results.map((r) => r.price).filter((p) => p > 0)
          const avgPrice = prices.length > 0
            ? prices.reduce((a, b) => a + b, 0) / prices.length
            : 0

          const score          = calculateScore(totalResults, avgPrice)
          const badge          = getBadge(score)
          const isEarlySignal  = score >= 75 && totalResults < 1000

          trendsToUpsert.push({
            keyword,
            source:          'mercadolibre',
            trend_score:     score,
            badge,
            is_early_signal: isEarlySignal,
            total_results:   totalResults,
            avg_price:       Math.round(avgPrice),
            detected_at:     new Date().toISOString(),
          })
        } catch (err) {
          logServerError(err, `GET /api/trends — fetch keyword "${keyword}"`)
        }
      })
    )

    if (trendsToUpsert.length === 0) {
      // Ninguna keyword procesada correctamente — devolver caché o mock
      if (cached && cached.length > 0) {
        return NextResponse.json({ data: cached, source: 'stale_cache' })
      }
      return NextResponse.json({ data: getMockTrends(), source: 'mock' })
    }

    // 4. Persistir en Supabase (upsert por keyword + source)
    const { error: upsertError } = await supabase
      .from('trends')
      .upsert(trendsToUpsert, { onConflict: 'keyword,source' })

    if (upsertError) {
      logServerError(upsertError, 'GET /api/trends — upsert')
      // No bloquear la respuesta si el upsert falla
    }

    // Ordenar por score descendente antes de responder
    trendsToUpsert.sort((a, b) => b.trend_score - a.trend_score)

    return NextResponse.json({ data: trendsToUpsert, source: 'live' })
  } catch (err) {
    logServerError(err, 'GET /api/trends')
    return serverErrorResponse()
  }
}

// Responder pre-flight CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
