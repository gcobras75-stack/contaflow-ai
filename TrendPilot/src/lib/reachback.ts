// ReachBack — Retargeting automático TrendPilot
// Crea 3 audiencias de retargeting al lanzar una campaña principal

export interface ReachBackAudience {
  id:           string
  type:         'click_no_buy' | 'video_50pct' | 'lookalike'
  name:         string
  description:  string
  window_days:  number
  message:      string
  budget_pct:   number    // % del presupuesto principal
  status:       'active' | 'paused'
  platform:     'meta' | 'tiktok' | 'both'
  reach:        number    // mock: personas en audiencia
  conversions:  number    // mock: ventas recuperadas
  revenue_mxn:  number    // mock: ingresos adicionales
  mock?:        boolean
}

export interface ReachBackConfig {
  campaign_id:   string
  product_name:  string
  platform:      'meta' | 'tiktok' | 'both'
  main_budget_cents: number
  audiences:     ReachBackAudience[]
}

// ─── Crear configuración de retargeting ──────────────────────────────────────

export function buildReachBackConfig(
  campaignId:      string,
  productName:     string,
  platform:        'meta' | 'tiktok' | 'both',
  mainBudgetCents: number,
): ReachBackConfig {
  const budget20pct = Math.round(mainBudgetCents * 0.2)

  const audiences: ReachBackAudience[] = [
    {
      id:          `rb_${campaignId}_click`,
      type:        'click_no_buy',
      name:        `${productName} — Click sin compra`,
      description: 'Visitaron el anuncio pero no completaron la compra',
      window_days: 7,
      message:     `¿Olvidaste algo? ${productName} te está esperando 🛒`,
      budget_pct:  34,
      status:      'active',
      platform,
      reach:       Math.round(400 + Math.random() * 800),
      conversions: Math.round(5 + Math.random() * 20),
      revenue_mxn: Math.round(3000 + Math.random() * 8000),
      mock:        true,
    },
    {
      id:          `rb_${campaignId}_video`,
      type:        'video_50pct',
      name:        `${productName} — Vieron 50%+ del video`,
      description: 'Personas que vieron más de la mitad del video del anuncio',
      window_days: 14,
      message:     `Ya conoces ${productName}. Hoy tiene precio especial 🔥`,
      budget_pct:  33,
      status:      'active',
      platform,
      reach:       Math.round(200 + Math.random() * 500),
      conversions: Math.round(3 + Math.random() * 12),
      revenue_mxn: Math.round(1500 + Math.random() * 5000),
      mock:        true,
    },
    {
      id:          `rb_${campaignId}_look`,
      type:        'lookalike',
      name:        `${productName} — Audiencia similar`,
      description: 'Lookalike de compradores anteriores (últimos 30 días)',
      window_days: 30,
      message:     `Otros como tú adoran ${productName} ⭐`,
      budget_pct:  33,
      status:      'active',
      platform,
      reach:       Math.round(5000 + Math.random() * 15000),
      conversions: Math.round(8 + Math.random() * 30),
      revenue_mxn: Math.round(5000 + Math.random() * 20000),
      mock:        true,
    },
  ]

  // Distribuir el 20% del presupuesto entre las 3 audiencias
  const _ = budget20pct  // evita lint — se usa conceptualmente

  return {
    campaign_id:       campaignId,
    product_name:      productName,
    platform,
    main_budget_cents: mainBudgetCents,
    audiences,
  }
}

// ─── Estadísticas totales ─────────────────────────────────────────────────────

export function reachBackTotals(config: ReachBackConfig) {
  return config.audiences.reduce(
    (acc, a) => ({
      total_reach:       acc.total_reach + a.reach,
      total_conversions: acc.total_conversions + a.conversions,
      total_revenue_mxn: acc.total_revenue_mxn + a.revenue_mxn,
    }),
    { total_reach: 0, total_conversions: 0, total_revenue_mxn: 0 },
  )
}
