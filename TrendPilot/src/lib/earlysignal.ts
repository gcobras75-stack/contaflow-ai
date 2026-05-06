// EarlySignal — Detector temprano de oportunidades de tendencia
// Detecta productos con potencial ANTES de que exploten

export interface EarlySignalOpportunity {
  id:           string
  keyword:      string
  category:     string
  score:        number   // 0-100 — qué tan buena es la oportunidad
  signals:      SignalType[]
  competition:  'muy baja' | 'baja' | 'media'
  windowWeeks:  number   // ventana estimada de oportunidad
  priceMXN?:    number
  detected_at:  string
}

export type SignalType =
  | 'accelerated_growth'   // Subió >50% en búsquedas en 7 días
  | 'new_in_trends'        // Apareció en top trends por primera vez
  | 'seasonal_anticipation'// Empieza a moverse 6 semanas antes del pico
  | 'tiktok_viral'         // Hashtags creciendo >100% (mock)

export const SIGNAL_LABELS: Record<SignalType, { label: string; emoji: string; color: string }> = {
  accelerated_growth:    { label: 'Crecimiento acelerado',   emoji: '📈', color: 'text-brand-green'   },
  new_in_trends:         { label: 'Nuevo en tendencias',     emoji: '⚡', color: 'text-brand-yellow'  },
  seasonal_anticipation: { label: 'Anticipación estacional', emoji: '📅', color: 'text-brand-primary' },
  tiktok_viral:          { label: 'Viral en TikTok',         emoji: '🎵', color: 'text-[#FF0050]'     },
}

// ─── Detectar señales desde tendencias actuales ───────────────────────────────

export interface RawTrend {
  keyword:         string
  trend_score:     number
  is_early_signal: boolean
  historical_data?: Record<string, unknown>
  detected_at:     string
}

export function detectEarlySignals(trends: RawTrend[]): EarlySignalOpportunity[] {
  const opportunities: EarlySignalOpportunity[] = []

  for (const trend of trends) {
    const signals: SignalType[] = []

    // Señal 1 — Está marcado como early signal (alta tendencia, baja competencia)
    if (trend.is_early_signal) {
      signals.push('accelerated_growth')
    }

    // Señal 2 — Score muy alto → nuevo en tendencias
    if (trend.trend_score >= 80) {
      signals.push('new_in_trends')
    }

    // Señal 3 — Detectado recientemente (últimas 12 horas)
    const detectedMs = new Date(trend.detected_at).getTime()
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000
    if (detectedMs > twelveHoursAgo && trend.trend_score >= 70) {
      signals.push('seasonal_anticipation')
    }

    // Solo incluir si tiene al menos 1 señal y score suficiente
    if (signals.length === 0 || trend.trend_score < 65) continue

    const totalResults = (trend.historical_data?.total_results as number) ?? 0
    const competition: EarlySignalOpportunity['competition'] =
      totalResults < 100 ? 'muy baja' :
      totalResults < 500 ? 'baja' :
      'media'

    const avgPrice = (trend.historical_data?.avg_price as number) ?? 0

    // Score de oportunidad: combina trend_score + penalización por competencia
    const compPenalty = totalResults < 100 ? 0 : totalResults < 500 ? 5 : 15
    const oppScore = Math.min(100, trend.trend_score - compPenalty + signals.length * 3)

    opportunities.push({
      id:           `es-${trend.keyword.replace(/\s+/g, '-').toLowerCase()}`,
      keyword:      trend.keyword,
      category:     (trend.historical_data?.category as string) ?? 'general',
      score:        Math.round(oppScore),
      signals,
      competition,
      windowWeeks:  signals.includes('accelerated_growth') ? 3 : 5,
      priceMXN:     avgPrice > 0 ? Math.round(avgPrice) : undefined,
      detected_at:  trend.detected_at,
    })
  }

  // Ordenar por score descendente
  return opportunities.sort((a, b) => b.score - a.score).slice(0, 5)
}

// ─── Mock data para cuando no hay trends en DB ───────────────────────────────

export const MOCK_EARLY_SIGNALS: EarlySignalOpportunity[] = [
  {
    id:          'es-bolsas-ecologicas-tela',
    keyword:     'Bolsas ecológicas tela',
    category:    'moda sustentable',
    score:       91,
    signals:     ['accelerated_growth', 'new_in_trends', 'tiktok_viral'],
    competition: 'muy baja',
    windowWeeks: 3,
    priceMXN:    180,
    detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id:          'es-suplementos-colageno',
    keyword:     'Suplementos colágeno',
    category:    'salud y bienestar',
    score:       84,
    signals:     ['accelerated_growth', 'seasonal_anticipation'],
    competition: 'baja',
    windowWeeks: 4,
    priceMXN:    450,
    detected_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id:          'es-aretes-plata-artesanal',
    keyword:     'Aretes plata artesanal',
    category:    'joyería',
    score:       79,
    signals:     ['new_in_trends', 'tiktok_viral'],
    competition: 'muy baja',
    windowWeeks: 5,
    priceMXN:    320,
    detected_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
]
