import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, forbiddenResponse, serverErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { askClaude } from '@/lib/claude'

interface MLSeller {
  id:             string
  nickname:       string
  permalink:      string
  seller_reputation?: { transactions: { total: number }; level_id: string }
}

interface MLResult {
  price:  number
  seller: MLSeller
  condition: string
}

interface MLSearchResponse {
  results: MLResult[]
}

export interface SellerCandidate {
  rank:         number
  name:         string
  permalink:    string
  score:        number
  sales_count:  number
  avg_price:    number
  level:        string
  proposal?:    string
}

export interface SellerOpportunity {
  keyword:      string
  trend_score:  number
  candidates:   SellerCandidate[]
  found_at:     string
}

// Puntúa un seller en base a ventas, reputación y precio
function scoreCandidate(seller: MLSeller, price: number, avgPrice: number): number {
  let score = 50

  // Ventas
  const total = seller.seller_reputation?.transactions?.total ?? 0
  if (total >= 1000) score += 25
  else if (total >= 200) score += 15
  else if (total >= 50)  score += 8

  // Nivel de reputación
  const level = seller.seller_reputation?.level_id ?? ''
  if (level.includes('5_green'))     score += 20
  else if (level.includes('4_green')) score += 12
  else if (level.includes('3_green')) score += 6

  // Precio competitivo vs promedio
  if (avgPrice > 0) {
    const diff = ((price - avgPrice) / avgPrice) * 100
    if (diff <= 5)  score += 5
    if (diff > 20)  score -= 10
  }

  return Math.min(100, Math.max(0, score))
}

// GET /api/seller-hunter?keyword=...
export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  const url     = new URL(request.url)
  const keyword = url.searchParams.get('keyword')?.trim()

  if (!keyword) {
    return NextResponse.json({ error: 'keyword requerido' }, { status: 400 })
  }

  try {
    // Buscar en MercadoLibre
    const mlRes = await fetch(
      `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(keyword)}&sort=best_seller&limit=10`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!mlRes.ok) throw new Error(`ML search ${mlRes.status}`)

    const mlData: MLSearchResponse = await mlRes.json()

    if (!mlData.results || mlData.results.length === 0) {
      return NextResponse.json({ data: { keyword, candidates: [], found_at: new Date().toISOString() } })
    }

    // Precio promedio
    const prices   = mlData.results.map((r) => r.price).filter((p) => p > 0)
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0

    // Deduplicar por seller y puntuar
    const seen     = new Set<string>()
    const scored: SellerCandidate[] = []

    for (const result of mlData.results) {
      const s = result.seller
      if (!s?.id || seen.has(s.id)) continue
      seen.add(s.id)

      const score = scoreCandidate(s, result.price, avgPrice)
      scored.push({
        rank:        0,
        name:        s.nickname ?? 'Vendedor',
        permalink:   s.permalink ?? '',
        score,
        sales_count: s.seller_reputation?.transactions?.total ?? 0,
        avg_price:   Math.round(result.price),
        level:       s.seller_reputation?.level_id ?? 'sin_datos',
      })
    }

    // Top 3 por score
    const top3 = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((c, i) => ({ ...c, rank: i + 1 }))

    // Generar propuesta con Claude para el #1
    if (top3.length > 0) {
      try {
        const raw = await askClaude([{
          role:    'user',
          content: `Genera un mensaje breve y atractivo de WhatsApp para contactar a un seller de MercadoLibre llamado "${top3[0].name}".
El mensaje es de parte de TrendPilot, una plataforma de marketing digital.
El producto es: "${keyword}" y tiene alta demanda actualmente.
El mensaje debe:
- Ser en español informal y amigable
- Máximo 3 líneas
- Mencionar que no hay costo fijo, solo comisión del 25% sobre ventas
- Incluir la URL trendpilot.marketing
Solo el mensaje, sin comillas ni explicaciones.`,
        }], { maxTokens: 150 })

        top3[0].proposal = raw.trim()
      } catch {
        top3[0].proposal = `Hola ${top3[0].name}! Detectamos que tu ${keyword} tiene alta demanda esta semana. Queremos promoverlo — sin costo fijo, solo pagas si hay ventas (25%). ¿Te interesa? → trendpilot.marketing`
      }
    }

    const opportunity: SellerOpportunity = {
      keyword,
      trend_score: 75,
      candidates:  top3,
      found_at:    new Date().toISOString(),
    }

    return NextResponse.json({ data: opportunity })
  } catch (err) {
    logServerError(err, 'GET /api/seller-hunter')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
