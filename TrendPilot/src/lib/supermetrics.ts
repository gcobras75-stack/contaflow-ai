// Supermetrics Marketing Analytics — TrendPilot
// MCP server: https://mcp.supermetrics.com/mcp
// Query API: https://api.supermetrics.com/enterprise/v2/query/data/json
//
// Prioridad de fuentes:
//   1. Supermetrics (si está configurado)
//   2. Meta Ads API directa (fallback)
//   3. Mock con datos realistas
//
// Variables requeridas:
//   SUPERMETRICS_API_KEY        — supermetrics.com → API → Keys
//   SUPERMETRICS_DS_ACCOUNT_ID  — ID de la cuenta de Facebook Ads en Supermetrics
//   META_ADS_ACCESS_TOKEN       — fallback directo a Meta Ads API
//   META_AD_ACCOUNT_ID          — ID de la cuenta de Meta Ads

const SUPERMETRICS_API   = 'https://api.supermetrics.com/enterprise/v2/query/data/json'
const META_GRAPH_URL     = 'https://graph.facebook.com/v19.0'

const HAS_SUPERMETRICS = Boolean(
  process.env.SUPERMETRICS_API_KEY && process.env.SUPERMETRICS_DS_ACCOUNT_ID,
)

const HAS_META_DIRECT = Boolean(
  process.env.META_ADS_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID,
)

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type DataSource = 'live' | 'meta_direct' | 'demo'

export interface SupermetricsMetrics {
  campaign_id:  string
  spend:        number  // MXN centavos
  impressions:  number
  clicks:       number
  ctr:          number  // porcentaje
  conversions:  number
  roas:         number
  cpm:          number  // costo por mil impresiones, centavos
  reach:        number
  date_start:   string  // ISO date
  date_end:     string
  source:       DataSource
}

export interface SupermetricsOverview {
  total_spend:       number  // centavos
  total_conversions: number
  avg_roas:          number
  avg_cpm:           number
  avg_ctr:           number
  daily_data:        DailySnapshot[]
  source:            DataSource
  mock?:             boolean  // compat legacy
}

export interface DailySnapshot {
  date:         string   // YYYY-MM-DD
  spend:        number   // centavos
  revenue:      number   // centavos estimados
  impressions:  number
  clicks:       number
  conversions:  number
}

export interface TopAd {
  ad_id:       string
  ad_name:     string
  ctr:         number
  roas:        number
  spend:       number   // centavos
  clicks:      number
  conversions: number
  source:      DataSource
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockMetrics(campaignId: string): SupermetricsMetrics {
  const spend       = Math.round(15000_00 + Math.random() * 50000_00)
  const impressions = Math.round(spend * 0.85)
  const clicks      = Math.round(impressions * 0.025)
  const conversions = Math.round(clicks * 0.04)
  const revenue     = conversions * Math.round(350_00 + Math.random() * 800_00)
  return {
    campaign_id:  campaignId,
    spend,
    impressions,
    clicks,
    ctr:          Number(((clicks / impressions) * 100).toFixed(2)),
    conversions,
    roas:         spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
    cpm:          impressions > 0 ? Math.round((spend / impressions) * 1000) : 0,
    reach:        Math.round(impressions * 0.72),
    date_start:   new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    date_end:     new Date().toISOString().slice(0, 10),
    source:       'demo',
  }
}

function mockDailyData(): DailySnapshot[] {
  const days: DailySnapshot[] = []
  for (let i = 29; i >= 0; i--) {
    const date   = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    const spend  = Math.round(2500_00 + Math.random() * 8000_00)
    const roas   = 1.8 + Math.random() * 2.5
    days.push({
      date,
      spend,
      revenue:     Math.round(spend * roas),
      impressions: Math.round(spend * 0.8),
      clicks:      Math.round(spend * 0.02),
      conversions: Math.round(spend * 0.001),
    })
  }
  return days
}

function mockOverview(): SupermetricsOverview {
  const daily    = mockDailyData()
  const totSpend = daily.reduce((s, d) => s + d.spend, 0)
  const totRev   = daily.reduce((s, d) => s + d.revenue, 0)
  const totConv  = daily.reduce((s, d) => s + d.conversions, 0)
  const totImpr  = daily.reduce((s, d) => s + d.impressions, 0)
  const totClicks = daily.reduce((s, d) => s + d.clicks, 0)
  return {
    total_spend:       totSpend,
    total_conversions: totConv,
    avg_roas:          totSpend > 0 ? Number((totRev / totSpend).toFixed(2)) : 0,
    avg_cpm:           totImpr > 0 ? Math.round((totSpend / totImpr) * 1000) : 0,
    avg_ctr:           totImpr > 0 ? Number(((totClicks / totImpr) * 100).toFixed(2)) : 0,
    daily_data:        daily,
    source:            'demo',
    mock:              true,
  }
}

function mockTopAds(): TopAd[] {
  const names = [
    'Audífonos Pro — Video 15s',
    'Bolsas ECO — Carrusel',
    'Suplementos — Imagen estática',
    'Leggings — Stories reel',
    'Aretes artesanales — Video unboxing',
  ]
  return names.map((name, i) => ({
    ad_id:       `ad_mock_${i}`,
    ad_name:     name,
    ctr:         Number((3.5 - i * 0.4).toFixed(2)),
    roas:        Number((4.2 - i * 0.5).toFixed(2)),
    spend:       Math.round(5000_00 + Math.random() * 20000_00),
    clicks:      Math.round(800 + Math.random() * 2000),
    conversions: Math.round(40 + Math.random() * 150),
    source:      'demo',
  }))
}

// ─── Meta Ads API directa (fallback) ─────────────────────────────────────────

async function fetchMetaDirectInsights(campaignId: string): Promise<SupermetricsMetrics | null> {
  if (!HAS_META_DIRECT || campaignId.includes('mock')) return null

  const token     = process.env.META_ADS_ACCESS_TOKEN!
  const fields    = 'spend,impressions,clicks,reach,actions,cpm'
  const dateEnd   = new Date().toISOString().slice(0, 10)
  const dateStart = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  try {
    const res = await fetch(
      `${META_GRAPH_URL}/${campaignId}/insights?fields=${fields}&access_token=${token}&date_preset=last_30d`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return null

    const json    = await res.json()
    const d       = json.data?.[0] ?? {}

    const spend       = Math.round(Number(d.spend ?? 0) * 100)
    const impressions = Number(d.impressions ?? 0)
    const clicks      = Number(d.clicks ?? 0)
    const reach       = Number(d.reach ?? 0)
    const cpm         = Math.round(Number(d.cpm ?? 0) * 100)
    const actions     = (d.actions as Array<{ action_type: string; value: string }> | undefined) ?? []
    const conversions = Number(actions.find((a) => a.action_type === 'purchase')?.value ?? 0)
    // Estimación ROAS sin cost_per_action_type en esta llamada
    const revenue     = conversions * 300_00

    return {
      campaign_id:  campaignId,
      spend,
      impressions,
      clicks,
      ctr:          impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      conversions,
      roas:         spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
      cpm,
      reach,
      date_start:   dateStart,
      date_end:     dateEnd,
      source:       'meta_direct',
    }
  } catch {
    return null
  }
}

async function fetchMetaAccountOverview(): Promise<SupermetricsOverview | null> {
  if (!HAS_META_DIRECT) return null

  const token     = process.env.META_ADS_ACCESS_TOKEN!
  const accountId = (process.env.META_AD_ACCOUNT_ID ?? '').replace('act_', '')

  try {
    const res = await fetch(
      `${META_GRAPH_URL}/act_${accountId}/insights?fields=spend,impressions,clicks,reach,actions,cpm&date_preset=last_30d&level=account&time_increment=1&access_token=${token}`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return null

    const json = await res.json()
    const rows = (json.data ?? []) as Array<Record<string, unknown>>

    if (!rows.length) return null

    const daily: DailySnapshot[] = rows.map((row) => {
      const spend       = Math.round(Number(row.spend ?? 0) * 100)
      const impressions = Number(row.impressions ?? 0)
      const clicks      = Number(row.clicks ?? 0)
      const actions     = (row.actions as Array<{ action_type: string; value: string }> | undefined) ?? []
      const conversions = Number(actions.find((a) => a.action_type === 'purchase')?.value ?? 0)
      return {
        date:        String(row.date_start ?? ''),
        spend,
        revenue:     conversions * 300_00,
        impressions,
        clicks,
        conversions,
      }
    })

    const totSpend  = daily.reduce((s, d) => s + d.spend, 0)
    const totRev    = daily.reduce((s, d) => s + d.revenue, 0)
    const totConv   = daily.reduce((s, d) => s + d.conversions, 0)
    const totImpr   = daily.reduce((s, d) => s + d.impressions, 0)
    const totClicks = daily.reduce((s, d) => s + d.clicks, 0)

    return {
      total_spend:       totSpend,
      total_conversions: totConv,
      avg_roas:          totSpend > 0 ? Number((totRev / totSpend).toFixed(2)) : 0,
      avg_cpm:           totImpr > 0 ? Math.round((totSpend / totImpr) * 1000) : 0,
      avg_ctr:           totImpr > 0 ? Number(((totClicks / totImpr) * 100).toFixed(2)) : 0,
      daily_data:        daily,
      source:            'meta_direct',
    }
  } catch {
    return null
  }
}

// ─── getCampaignMetrics ───────────────────────────────────────────────────────
//
// Obtiene métricas reales de una campaña.
// Prioridad: Supermetrics → Meta directo → Mock

export async function getCampaignMetrics(campaignId: string): Promise<SupermetricsMetrics> {
  if (!HAS_SUPERMETRICS || campaignId.includes('mock')) {
    const metaDirect = await fetchMetaDirectInsights(campaignId)
    return metaDirect ?? mockMetrics(campaignId)
  }

  const apiKey    = process.env.SUPERMETRICS_API_KEY!
  const dsAccount = process.env.SUPERMETRICS_DS_ACCOUNT_ID!
  const dateEnd   = new Date().toISOString().slice(0, 10)
  const dateStart = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  try {
    const res = await fetch(SUPERMETRICS_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        json: {
          api_key:          apiKey,
          ds_id:            'FBA',
          ds_accounts:      [dsAccount],
          date_range_type:  'custom',
          start_date:       dateStart,
          end_date:         dateEnd,
          fields:           ['spend', 'impressions', 'clicks', 'reach', 'actions', 'cost_per_action_type', 'cpm'],
          filter_string:    `{"operator":"AND","conditions":[{"field":"campaign_id","operator":"equals","value":"${campaignId}"}]}`,
        },
      }),
    })

    if (!res.ok) throw new Error(`Supermetrics ${res.status}`)

    const json = await res.json()
    const row  = json.data?.[0]

    if (!row) {
      const metaDirect = await fetchMetaDirectInsights(campaignId)
      return metaDirect ?? mockMetrics(campaignId)
    }

    const spend       = Math.round(Number(row.spend ?? 0) * 100)
    const impressions = Number(row.impressions ?? 0)
    const clicks      = Number(row.clicks ?? 0)
    const reach       = Number(row.reach ?? 0)
    const cpm         = Math.round(Number(row.cpm ?? 0) * 100)

    const actions     = (row.actions as Array<{ action_type: string; value: string }> | undefined) ?? []
    const conversions = Number(actions.find((a) => a.action_type === 'purchase')?.value ?? 0)
    const revenue     = Math.round(Number(
      (row.cost_per_action_type as Array<{ action_type: string; value: string }> | undefined)
        ?.find((a) => a.action_type === 'purchase')?.value ?? 0,
    ) * 100)

    return {
      campaign_id:  campaignId,
      spend,
      impressions,
      clicks,
      ctr:          impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      conversions,
      roas:         spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
      cpm,
      reach,
      date_start:   dateStart,
      date_end:     dateEnd,
      source:       'live',
    }
  } catch {
    const metaDirect = await fetchMetaDirectInsights(campaignId)
    return metaDirect ?? mockMetrics(campaignId)
  }
}

// ─── getAccountOverview ───────────────────────────────────────────────────────
//
// Resumen general de todas las campañas.
// Prioridad: Supermetrics → Meta directo → Mock

export async function getAccountOverview(): Promise<SupermetricsOverview> {
  if (!HAS_SUPERMETRICS) {
    const metaDirect = await fetchMetaAccountOverview()
    return metaDirect ?? mockOverview()
  }

  const apiKey    = process.env.SUPERMETRICS_API_KEY!
  const dsAccount = process.env.SUPERMETRICS_DS_ACCOUNT_ID!
  const dateEnd   = new Date().toISOString().slice(0, 10)
  const dateStart = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  try {
    const res = await fetch(SUPERMETRICS_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        json: {
          api_key:          apiKey,
          ds_id:            'FBA',
          ds_accounts:      [dsAccount],
          date_range_type:  'custom',
          start_date:       dateStart,
          end_date:         dateEnd,
          fields:           ['date', 'spend', 'impressions', 'clicks', 'purchase_roas', 'actions', 'cpm'],
          dimensions:       ['date'],
        },
      }),
    })

    if (!res.ok) throw new Error(`Supermetrics ${res.status}`)

    const json  = await res.json()
    const rows  = (json.data ?? []) as Array<Record<string, unknown>>

    const daily: DailySnapshot[] = rows.map((row) => {
      const spend       = Math.round(Number(row.spend ?? 0) * 100)
      const impressions = Number(row.impressions ?? 0)
      const clicks      = Number(row.clicks ?? 0)
      const roas        = Number(row.purchase_roas ?? 0)
      const actions     = (row.actions as Array<{ action_type: string; value: string }> | undefined) ?? []
      const conversions = Number(actions.find((a) => a.action_type === 'purchase')?.value ?? 0)
      return {
        date:        String(row.date ?? ''),
        spend,
        revenue:     Math.round(spend * roas),
        impressions,
        clicks,
        conversions,
      }
    })

    const totSpend  = daily.reduce((s, d) => s + d.spend, 0)
    const totRev    = daily.reduce((s, d) => s + d.revenue, 0)
    const totConv   = daily.reduce((s, d) => s + d.conversions, 0)
    const totImpr   = daily.reduce((s, d) => s + d.impressions, 0)
    const totClicks = daily.reduce((s, d) => s + d.clicks, 0)

    return {
      total_spend:       totSpend,
      total_conversions: totConv,
      avg_roas:          totSpend > 0 ? Number((totRev / totSpend).toFixed(2)) : 0,
      avg_cpm:           totImpr > 0 ? Math.round((totSpend / totImpr) * 1000) : 0,
      avg_ctr:           totImpr > 0 ? Number(((totClicks / totImpr) * 100).toFixed(2)) : 0,
      daily_data:        daily,
      source:            'live',
    }
  } catch {
    const metaDirect = await fetchMetaAccountOverview()
    return metaDirect ?? mockOverview()
  }
}

// ─── getTopPerformingAds ──────────────────────────────────────────────────────
//
// Top 5 anuncios por CTR y por ROAS

export async function getTopPerformingAds(): Promise<{ byCtr: TopAd[]; byRoas: TopAd[] }> {
  if (!HAS_SUPERMETRICS) {
    const ads  = mockTopAds()
    return {
      byCtr:  [...ads].sort((a, b) => b.ctr  - a.ctr).slice(0, 5),
      byRoas: [...ads].sort((a, b) => b.roas - a.roas).slice(0, 5),
    }
  }

  const apiKey    = process.env.SUPERMETRICS_API_KEY!
  const dsAccount = process.env.SUPERMETRICS_DS_ACCOUNT_ID!

  try {
    const res = await fetch(SUPERMETRICS_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        json: {
          api_key:         apiKey,
          ds_id:           'FBA',
          ds_accounts:     [dsAccount],
          date_range_type: 'last_30_days',
          fields:          ['ad_id', 'ad_name', 'inline_link_clicks', 'impressions', 'spend', 'purchase_roas', 'actions'],
          dimensions:      ['ad_id', 'ad_name'],
          max_rows:        50,
        },
      }),
    })

    if (!res.ok) throw new Error(`Supermetrics ${res.status}`)

    const json = await res.json()
    const rows = (json.data ?? []) as Array<Record<string, unknown>>

    const ads: TopAd[] = rows.map((row) => {
      const spend       = Math.round(Number(row.spend ?? 0) * 100)
      const impressions = Number(row.impressions ?? 0)
      const clicks      = Number(row.inline_link_clicks ?? 0)
      const roas        = Number(row.purchase_roas ?? 0)
      const actions     = (row.actions as Array<{ action_type: string; value: string }> | undefined) ?? []
      const conversions = Number(actions.find((a) => a.action_type === 'purchase')?.value ?? 0)
      return {
        ad_id:       String(row.ad_id ?? ''),
        ad_name:     String(row.ad_name ?? ''),
        ctr:         impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
        roas,
        spend,
        clicks,
        conversions,
        source:      'live',
      }
    })

    return {
      byCtr:  [...ads].sort((a, b) => b.ctr  - a.ctr).slice(0, 5),
      byRoas: [...ads].sort((a, b) => b.roas - a.roas).slice(0, 5),
    }
  } catch {
    const ads = mockTopAds()
    return {
      byCtr:  [...ads].sort((a, b) => b.ctr  - a.ctr).slice(0, 5),
      byRoas: [...ads].sort((a, b) => b.roas - a.roas).slice(0, 5),
    }
  }
}

export { HAS_SUPERMETRICS }
