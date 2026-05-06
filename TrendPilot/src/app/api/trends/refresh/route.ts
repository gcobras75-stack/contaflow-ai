// POST /api/trends/refresh — Refresca tendencias con Google Trends + análisis Claude
// Protegido con x-worker-secret (llamado desde worker Railway cada hora)
// También GET para consultar tendencias + oportunidades IA

import { NextRequest, NextResponse } from 'next/server'
import { logServerError }            from '@/lib/logger'

// ── Google Trends México (endpoint no oficial) ────────────────────────────────

async function fetchMexicoTrends() {
  try {
    const url = 'https://trends.google.com/trends/api/dailytrends'
      + '?hl=es-419&geo=MX&ns=15'

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    })

    if (!res.ok) throw new Error(`Google Trends status ${res.status}`)

    const text = await res.text()
    // Google Trends devuelve ")]}',\n" como prefijo de protección
    const json = JSON.parse(text.replace(/^\)\]\}',?\n/, ''))
    const stories = json.default?.trendingStories ?? []

    return stories.slice(0, 20).map((s: Record<string, unknown>) => ({
      title:   (s.title as string) ?? '',
      traffic: (s.formattedTraffic as string) ?? '',
      articles: ((s.articles as Array<Record<string, unknown>>) ?? []).slice(0, 2).map((a) => ({
        title:  String(a.title  ?? ''),
        url:    String(a.url    ?? ''),
        source: String(a.source ?? ''),
      })),
    }))
  } catch (err) {
    logServerError(err, 'fetchMexicoTrends')
    return []
  }
}

// ── Analizar tendencias con Claude para oportunidades de afiliados ─────────────

async function analyzeTrendsForAffiliates(trends: Array<{ title: string; traffic: string }>) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || trends.length === 0) return { opportunities: [], top_recommendation: null, market_mood: '' }

  const prompt = `Eres el motor de análisis de TrendPilot, plataforma de afiliados en México.
Analiza estas tendencias de México hoy:

${trends.map((t) => `- ${t.title} (${t.traffic})`).join('\n')}

Para cada tendencia, evalúa si hay oportunidad de producto afiliado en MercadoLibre México o SHEIN México.

Devuelve JSON válido (sin markdown, sin \`\`\`json) con este formato exacto:
{
  "opportunities": [
    {
      "trend": "nombre de la tendencia",
      "score": 85,
      "product_idea": "nombre del producto a vender",
      "affiliate_network": "mercadolibre",
      "estimated_commission_pct": 6,
      "reason": "por qué es buena oportunidad en 1 línea",
      "urgency": "alta"
    }
  ],
  "top_recommendation": "el mejor producto para crear campaña ahora",
  "market_mood": "descripción del mood del mercado mexicano hoy en 1 oración"
}

Reglas:
- affiliate_network: solo "mercadolibre" o "shein"
- urgency: solo "alta", "media" o "baja"
- Solo incluye oportunidades con score >= 60
- Máximo 5 oportunidades`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-opus-4-6',
        max_tokens: 1200,
        messages:   [{ role: 'user', content: prompt }],
      }),
      next: { revalidate: 3600 },
    })

    if (!res.ok) throw new Error(`Claude API ${res.status}`)

    const json = await res.json()
    const text = (json.content?.[0]?.text ?? '{}') as string

    // Limpiar posible markdown
    const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    return JSON.parse(clean)
  } catch (err) {
    logServerError(err, 'analyzeTrendsForAffiliates')
    return { opportunities: [], top_recommendation: null, market_mood: '' }
  }
}

// ── POST — worker cron cada hora ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const workerSecret = process.env.WORKER_SECRET
  const xSecret      = request.headers.get('x-worker-secret')
  const bearer       = request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!workerSecret || (xSecret !== workerSecret && bearer !== workerSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const trends      = await fetchMexicoTrends()
    const analysis    = trends.length > 0
      ? await analyzeTrendsForAffiliates(trends)
      : { opportunities: [], top_recommendation: null, market_mood: '' }

    return NextResponse.json({
      ok:             true,
      trending_count: trends.length,
      opportunities:  (analysis.opportunities ?? []).length,
      last_updated:   new Date().toISOString(),
    })
  } catch (err) {
    logServerError(err, 'POST /api/trends/refresh')
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── GET — consulta tendencias + análisis (usado por frontend) ─────────────────

export async function GET() {
  try {
    const trends   = await fetchMexicoTrends()
    const analysis = trends.length > 0
      ? await analyzeTrendsForAffiliates(trends)
      : { opportunities: [], top_recommendation: null, market_mood: '' }

    return NextResponse.json({
      trending_now:       trends,
      opportunities:      analysis.opportunities      ?? [],
      top_recommendation: analysis.top_recommendation ?? null,
      market_mood:        analysis.market_mood        ?? '',
      last_updated:       new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch (err) {
    logServerError(err, 'GET /api/trends/refresh')
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
