// google-ads.ts — Integración Google Shopping Ads + Merchant Center
// Mock mode automático si no hay credenciales configuradas

export interface MerchantProduct {
  id:          string
  title:       string
  price:       number  // centavos MXN
  brand?:      string
  category?:   string
  image_url?:  string
  product_url: string
}

export interface ShoppingCampaign {
  id:            string
  name:          string
  status:        'enabled' | 'paused' | 'removed'
  budget_daily:  number   // centavos MXN
  impressions:   number
  clicks:        number
  cost:          number   // centavos MXN
  conversions:   number
  revenue:       number   // centavos MXN
  roas:          number
  ctr:           number   // porcentaje
  is_mock:       boolean
}

export interface CampaignMetrics {
  impressions: number
  clicks:      number
  cost:        number
  conversions: number
  revenue:     number
  roas:        number
  ctr:         number
  avg_cpc:     number
  period:      string
}

// ─── Verificar credenciales ───────────────────────────────────────────────────

export function hasGoogleAdsCredentials(): boolean {
  return !!(
    process.env.GOOGLE_ADS_CLIENT_ID         &&
    process.env.GOOGLE_ADS_CLIENT_SECRET     &&
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN   &&
    process.env.GOOGLE_ADS_CUSTOMER_ID       &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN
  )
}

// ─── Mock data realista ───────────────────────────────────────────────────────

const MOCK_CAMPAIGNS: ShoppingCampaign[] = [
  {
    id:           'g1',
    name:         'Shopping — Audífonos Bluetooth Pro',
    status:       'enabled',
    budget_daily: 50000,
    impressions:  12400,
    clicks:       645,
    cost:         48500,
    conversions:  38,
    revenue:      164600,
    roas:         3.40,
    ctr:          5.2,
    is_mock:      true,
  },
  {
    id:           'g2',
    name:         'Shopping — Suplementos colágeno',
    status:       'enabled',
    budget_daily: 35000,
    impressions:  8900,
    clicks:       312,
    cost:         33200,
    conversions:  24,
    revenue:      99600,
    roas:         3.00,
    ctr:          3.5,
    is_mock:      true,
  },
  {
    id:           'g3',
    name:         'Shopping — Leggings deportivos',
    status:       'paused',
    budget_daily: 25000,
    impressions:  4200,
    clicks:       88,
    cost:         12400,
    conversions:  6,
    revenue:      18000,
    roas:         1.45,
    ctr:          2.1,
    is_mock:      true,
  },
]

// ─── Crear producto en Merchant Center ───────────────────────────────────────

export async function createMerchantCenterProduct(
  product: MerchantProduct,
): Promise<{ id: string; is_mock: boolean }> {
  if (!hasGoogleAdsCredentials()) {
    console.warn('[google-ads] Sin credenciales — modo mock')
    return { id: `mock-mc-${Date.now()}`, is_mock: true }
  }

  // TODO: implementar con Google Content API v2.1
  // POST https://shoppingcontent.googleapis.com/content/v2.1/{merchantId}/products
  console.warn('[google-ads] createMerchantCenterProduct: pendiente — modo mock', product.id)
  return { id: `mock-mc-${Date.now()}`, is_mock: true }
}

// ─── Crear campaña de Shopping ────────────────────────────────────────────────

export async function createShoppingCampaign(params: {
  name:         string
  budget_daily: number
  product_id?:  string
  target_roas?: number
}): Promise<ShoppingCampaign> {
  if (!hasGoogleAdsCredentials()) {
    console.warn('[google-ads] Sin credenciales — modo mock')
    return {
      id:           `mock-g-${Date.now()}`,
      name:         params.name,
      status:       'enabled',
      budget_daily: params.budget_daily,
      impressions:  0, clicks: 0, cost: 0,
      conversions:  0, revenue: 0, roas: 0, ctr: 0,
      is_mock:      true,
    }
  }

  // TODO: implementar con Google Ads API v17
  // resource: campaigns, Shopping campaign type, TARGET_ROAS bidding
  console.warn('[google-ads] createShoppingCampaign: pendiente — modo mock', params.name)
  return {
    id:           `mock-g-${Date.now()}`,
    name:         params.name,
    status:       'enabled',
    budget_daily: params.budget_daily,
    impressions:  0, clicks: 0, cost: 0,
    conversions:  0, revenue: 0, roas: 0, ctr: 0,
    is_mock:      true,
  }
}

// ─── Métricas de una campaña ──────────────────────────────────────────────────

export async function getCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
  if (!hasGoogleAdsCredentials()) {
    const mock = MOCK_CAMPAIGNS.find((c) => c.id === campaignId) ?? MOCK_CAMPAIGNS[0]
    return {
      impressions: mock.impressions,
      clicks:      mock.clicks,
      cost:        mock.cost,
      conversions: mock.conversions,
      revenue:     mock.revenue,
      roas:        mock.roas,
      ctr:         mock.ctr,
      avg_cpc:     mock.clicks > 0 ? Math.round(mock.cost / mock.clicks) : 0,
      period:      'últimos 30 días',
    }
  }

  // TODO: GAQL query via Google Ads API v17
  console.warn('[google-ads] getCampaignMetrics: pendiente — modo mock', campaignId)
  return {
    impressions: 0, clicks: 0, cost: 0,
    conversions: 0, revenue: 0, roas: 0, ctr: 0,
    avg_cpc: 0, period: 'sin datos',
  }
}

// ─── Todas las campañas (para dashboard) ─────────────────────────────────────

export async function getAllShoppingCampaigns(): Promise<ShoppingCampaign[]> {
  if (!hasGoogleAdsCredentials()) {
    return MOCK_CAMPAIGNS
  }

  // TODO: GAQL: SELECT campaign.id, campaign.name, metrics.* FROM campaign
  console.warn('[google-ads] getAllShoppingCampaigns: pendiente — modo mock')
  return MOCK_CAMPAIGNS
}

// ─── Resumen agregado para widget ─────────────────────────────────────────────

export async function getGoogleShoppingSummary(): Promise<{
  total_impressions: number
  total_clicks:      number
  total_cost:        number
  total_conversions: number
  avg_roas:          number
  active_campaigns:  number
  is_mock:           boolean
}> {
  const campaigns = await getAllShoppingCampaigns()
  const active    = campaigns.filter((c) => c.status === 'enabled')

  const totals = campaigns.reduce(
    (acc, c) => ({
      impressions: acc.impressions + c.impressions,
      clicks:      acc.clicks      + c.clicks,
      cost:        acc.cost        + c.cost,
      conversions: acc.conversions + c.conversions,
      revenue:     acc.revenue     + c.revenue,
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0 },
  )

  return {
    total_impressions: totals.impressions,
    total_clicks:      totals.clicks,
    total_cost:        totals.cost,
    total_conversions: totals.conversions,
    avg_roas:          totals.cost > 0 ? Math.round((totals.revenue / totals.cost) * 100) / 100 : 0,
    active_campaigns:  active.length,
    is_mock:           !hasGoogleAdsCredentials(),
  }
}
