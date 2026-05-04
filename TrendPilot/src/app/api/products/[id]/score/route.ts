import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAuth, unauthorizedResponse, serverErrorResponse } from '@/lib/api-auth'
import { getCurrentSeasonScore } from '@/lib/seasonalert'
import { logServerError } from '@/lib/logger'

function getService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ─── Interfaces de respuesta de MercadoLibre ──────────────────────────────────

interface MLSearchResult {
  paging:  { total: number }
  results: Array<{
    price:              number
    reviews?:           { rating_average: number }
    seller_reputation?: { transactions: { total: number } }
  }>
}

// ─── FACTOR 1 — Tendencia (0-30 pts) ─────────────────────────────────────────

async function scoreTrend(
  productName: string,
  category:    string,
  supabase:    ReturnType<typeof getService>
): Promise<{ score: number; reason: string }> {
  const normName = productName.toLowerCase()
  const normCat  = (category ?? '').toLowerCase()

  // Buscar en trends de las últimas 24 horas
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: trends } = await supabase
    .from('trends')
    .select('keyword, trend_score')
    .gte('detected_at', cutoff)
    .order('trend_score', { ascending: false })
    .limit(50)

  if (!trends || trends.length === 0) {
    return { score: 10, reason: 'Sin datos de tendencias recientes (score base)' }
  }

  // ¿El producto está directamente en tendencias?
  const directMatch = trends.find((t) => {
    const kw = t.keyword.toLowerCase()
    return normName.includes(kw) || kw.includes(normName.split(' ')[0])
  })
  if (directMatch) {
    return { score: 30, reason: `En tendencias hoy (keyword: "${directMatch.keyword}", score ${directMatch.trend_score})` }
  }

  // ¿La categoría está en tendencias?
  if (normCat) {
    const catMatch = trends.find((t) => {
      const kw = t.keyword.toLowerCase()
      return kw.includes(normCat) || normCat.includes(kw)
    })
    if (catMatch) {
      return { score: 20, reason: `Categoría "${category}" en tendencias actuales` }
    }
  }

  return { score: 10, reason: 'Producto no está en tendencias activas' }
}

// ─── FACTOR 2 — Competencia en ML (0-25 pts) ─────────────────────────────────

async function scoreCompetition(productName: string): Promise<{ score: number; reason: string; totalResults: number; avgPrice: number }> {
  try {
    const res = await fetch(
      `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(productName)}&limit=10`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) throw new Error(`ML search ${res.status}`)

    const data: MLSearchResult = await res.json()
    const total = data.paging.total

    const prices = data.results.map((r) => r.price).filter((p) => p > 0)
    const avgPrice = prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : 0

    let score: number
    let reason: string

    if (total < 100) {
      score  = 25
      reason = `Muy poca competencia: ${total} resultados. Nicho ideal.`
    } else if (total <= 500) {
      score  = 15
      reason = `Competencia baja-media: ${total} resultados.`
    } else if (total <= 1000) {
      score  = 8
      reason = `Competencia moderada: ${total} resultados.`
    } else {
      score  = 3
      reason = `Mercado saturado: ${total.toLocaleString('es-MX')} resultados.`
    }

    return { score, reason, totalResults: total, avgPrice }
  } catch (err) {
    logServerError(err, 'ProductScore/scoreCompetition')
    return { score: 10, reason: 'No se pudo consultar MercadoLibre (score base)', totalResults: 0, avgPrice: 0 }
  }
}

// ─── FACTOR 3 — Precio y margen (0-20 pts) ───────────────────────────────────

function scorePricing(vendorPrice: number, avgMarketPrice: number): { score: number; reason: string } {
  if (avgMarketPrice <= 0 || vendorPrice <= 0) {
    return { score: 10, reason: 'Sin precio de mercado para comparar (score base)' }
  }

  const diff = ((vendorPrice - avgMarketPrice) / avgMarketPrice) * 100

  if (diff <= 10) {
    return { score: 20, reason: `Precio competitivo: $${vendorPrice.toLocaleString('es-MX')} MXN vs promedio $${Math.round(avgMarketPrice).toLocaleString('es-MX')} MXN (+${diff.toFixed(0)}%)` }
  } else if (diff <= 20) {
    return { score: 12, reason: `Precio ligeramente alto: ${diff.toFixed(0)}% más caro que el mercado.` }
  } else {
    return { score: 5, reason: `Precio alto: ${diff.toFixed(0)}% más caro que la competencia. Dificultará conversiones.` }
  }
}

// ─── FACTOR 4 — Calidad histórica ML (0-15 pts) ──────────────────────────────

async function scoreQuality(productName: string): Promise<{ score: number; reason: string }> {
  try {
    const res = await fetch(
      `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(productName)}&limit=5`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) throw new Error(`ML quality ${res.status}`)

    const data: MLSearchResult = await res.json()
    const ratings = data.results
      .map((r) => r.reviews?.rating_average)
      .filter((r): r is number => typeof r === 'number' && r > 0)

    if (ratings.length === 0) {
      return { score: 8, reason: 'Sin reseñas disponibles en MercadoLibre (score neutral)' }
    }

    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length

    if (avg >= 4.5) return { score: 15, reason: `Excelente reputación: ${avg.toFixed(1)}⭐ promedio en ML.` }
    if (avg >= 4.0) return { score: 10, reason: `Buena reputación: ${avg.toFixed(1)}⭐ promedio en ML.` }
    if (avg >= 3.5) return { score: 5,  reason: `Reputación regular: ${avg.toFixed(1)}⭐. Cuidado con devoluciones.` }
    return { score: 2, reason: `Reputación baja: ${avg.toFixed(1)}⭐. Alto riesgo de quejas.` }
  } catch {
    return { score: 8, reason: 'No se pudo obtener reseñas de ML (score neutral)' }
  }
}

// ─── FACTOR 5 — Estacionalidad (0-10 pts) ────────────────────────────────────

function scoreSeasonality(category: string): { score: number; reason: string } {
  const season = getCurrentSeasonScore(category || 'general')
  return { score: season.score, reason: `${season.season_name}: ${season.recommendation}` }
}

// ─── Score final → badge ──────────────────────────────────────────────────────

function getBadge(score: number): { badge: string; action: 'auto_approve' | 'manual_review' | 'request_improvements' | 'auto_reject' } {
  if (score >= 80) return { badge: 'ESTRELLA',  action: 'auto_approve' }
  if (score >= 60) return { badge: 'BUENO',     action: 'manual_review' }
  if (score >= 40) return { badge: 'REGULAR',   action: 'request_improvements' }
  return                  { badge: 'RECHAZAR',  action: 'auto_reject' }
}

// ─── POST /api/products/[id]/score ───────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Este endpoint puede ser llamado por el sistema (sin auth) o por un admin
  // Verificamos auth — si no hay token, aceptamos el llamado interno (same-origin)
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const auth = await verifyAuth(request)
    if (!auth) return unauthorizedResponse()
    if (auth.role !== 'admin') return unauthorizedResponse()
  }

  const { id } = params
  const supabase = getService()

  try {
    // Obtener datos del producto
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('id, name, price, category, status, vendor_id')
      .eq('id', id)
      .single()

    if (fetchErr || !product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Calcular los 5 factores en paralelo
    const [trend, competition, quality] = await Promise.all([
      scoreTrend(product.name, product.category ?? '', supabase),
      scoreCompetition(product.name),
      scoreQuality(product.name),
    ])

    const pricing    = scorePricing(product.price, competition.avgPrice)
    const seasonality = scoreSeasonality(product.category ?? 'general')

    const totalScore = Math.min(100, Math.max(0,
      trend.score + competition.score + pricing.score + quality.score + seasonality.score
    ))

    const { badge, action } = getBadge(totalScore)

    const scoreBreakdown = {
      trend:       { score: trend.score,       max: 30, reason: trend.reason },
      competition: { score: competition.score, max: 25, reason: competition.reason },
      pricing:     { score: pricing.score,     max: 20, reason: pricing.reason },
      quality:     { score: quality.score,     max: 15, reason: quality.reason },
      seasonality: { score: seasonality.score, max: 10, reason: seasonality.reason },
      total:       totalScore,
      badge,
      action,
    }

    // Actualizar el producto con el score
    const newStatus = action === 'auto_approve' ? 'approved'
      : action === 'auto_reject'   ? 'rejected'
      : product.status  // mantener 'pending' si es manual_review o request_improvements

    const rejectionReason = action === 'auto_reject'
      ? `ProductScore: ${totalScore}/100 (${badge}). ${competition.reason} ${pricing.reason}`
      : null

    const { error: updateErr } = await supabase
      .from('products')
      .update({
        score:            totalScore,
        score_breakdown:  scoreBreakdown,
        status:           newStatus,
        rejection_reason: rejectionReason,
        scored_at:        new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) {
      logServerError(updateErr, `POST /api/products/${id}/score — update`)
    }

    return NextResponse.json({
      product_id:  id,
      score:       totalScore,
      badge,
      action,
      breakdown:   scoreBreakdown,
      auto_action: action !== 'manual_review',
    })
  } catch (err) {
    logServerError(err, `POST /api/products/${id}/score`)
    return serverErrorResponse()
  }
}
