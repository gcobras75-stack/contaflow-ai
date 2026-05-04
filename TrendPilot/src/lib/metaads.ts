// Meta Ads API — TrendPilot
// Si META_ADS_ACCESS_TOKEN existe → API real
// Si NO existe → mock estructurado listo para conectar

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0'

const HAS_META = Boolean(process.env.META_ADS_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID)

// Normaliza el account ID: acepta "act_642461001728694" o "642461001728694"
function getAccountId(): string {
  const raw = process.env.META_AD_ACCOUNT_ID ?? ''
  return raw.startsWith('act_') ? raw.slice(4) : raw
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface MetaCampaignResult {
  id:     string
  name:   string
  status: string
  mock?:  boolean
}

export interface MetaAdSetResult {
  id:          string
  campaign_id: string
  name:        string
  mock?:       boolean
}

export interface MetaAdResult {
  id:         string
  ad_set_id:  string
  name:       string
  mock?:      boolean
}

export interface MetaInsights {
  campaign_id:  string
  spend:        number  // MXN centavos
  impressions:  number
  clicks:       number
  ctr:          number  // porcentaje
  conversions:  number
  roas:         number  // return on ad spend
  reach:        number
  mock?:        boolean
}

export interface MetaAudience {
  age_min:    number
  age_max:    number
  genders:    number[]  // 1=male, 2=female
  interests:  string[]
  cities:     string[]
  best_hours: string[]
}

export interface MetaCreative {
  headline:     string
  description:  string
  image_url:    string
  cta_type:     string
  link_url:     string
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockId(prefix: string) {
  return `${prefix}_mock_${Math.random().toString(36).slice(2, 10)}`
}

function mockInsights(campaignId: string): MetaInsights {
  const spend = Math.round(200_00 + Math.random() * 500_00)  // centavos
  const impressions = Math.round(spend * 0.8)
  const clicks      = Math.round(impressions * 0.02)
  const conversions = Math.round(clicks * 0.05)
  const sales       = conversions * Math.round(300_00 + Math.random() * 700_00)
  return {
    campaign_id: campaignId,
    spend,
    impressions,
    clicks,
    ctr:         Number(((clicks / impressions) * 100).toFixed(2)),
    conversions,
    roas:        spend > 0 ? Number((sales / spend).toFixed(2)) : 0,
    reach:       Math.round(impressions * 0.7),
    mock:        true,
  }
}

// ─── createCampaign ───────────────────────────────────────────────────────────

export async function createCampaign(
  name: string,
  objective: string = 'OUTCOME_SALES',
): Promise<MetaCampaignResult> {
  if (!HAS_META) {
    return { id: mockId('camp'), name, status: 'PAUSED', mock: true }
  }

  const token       = process.env.META_ADS_ACCESS_TOKEN!
  const adAccountId = getAccountId()

  const res = await fetch(`${META_GRAPH_URL}/act_${adAccountId}/campaigns`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      name,
      objective,
      status:                         'PAUSED',
      special_ad_categories:          [],
      is_adset_budget_sharing_enabled: false,
      access_token:                   token,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Meta createCampaign: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  return { id: data.id, name, status: 'PAUSED' }
}

// ─── createAdSet ──────────────────────────────────────────────────────────────

export async function createAdSet(
  campaignId: string,
  audience: MetaAudience,
  dailyBudgetCents: number,
): Promise<MetaAdSetResult> {
  if (!HAS_META) {
    return { id: mockId('adset'), campaign_id: campaignId, name: 'TrendPilot AdSet', mock: true }
  }

  const token       = process.env.META_ADS_ACCESS_TOKEN!
  const adAccountId = getAccountId()

  const targeting = {
    age_min:          audience.age_min,
    age_max:          audience.age_max,
    genders:          audience.genders,
    geo_locations:    { countries: ['MX'], cities: audience.cities.map((c) => ({ key: c })) },
    flexible_spec:    [{ interests: audience.interests.map((i) => ({ name: i })) }],
    // Desactivar Advantage Audience (requerido por la API v19)
    targeting_automation: { advantage_audience: 0 },
  }

  const res = await fetch(`${META_GRAPH_URL}/act_${adAccountId}/adsets`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      campaign_id:        campaignId,
      name:               'TrendPilot AdSet',
      daily_budget:       dailyBudgetCents,
      billing_event:      'IMPRESSIONS',
      optimization_goal:  'LINK_CLICKS',
      bid_strategy:       'LOWEST_COST_WITHOUT_CAP',
      targeting,
      status:             'PAUSED',
      access_token:       token,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Meta createAdSet: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  return { id: data.id, campaign_id: campaignId, name: 'TrendPilot AdSet' }
}

// ─── createAd ────────────────────────────────────────────────────────────────

export async function createAd(
  adSetId: string,
  creative: MetaCreative,
): Promise<MetaAdResult> {
  if (!HAS_META) {
    return { id: mockId('ad'), ad_set_id: adSetId, name: creative.headline, mock: true }
  }

  const token       = process.env.META_ADS_ACCESS_TOKEN!
  const adAccountId = getAccountId()
  const pageId      = process.env.META_PAGE_ID

  // Si no hay PAGE_ID configurado, devolver resultado con advertencia
  if (!pageId) {
    console.warn('[Meta] META_PAGE_ID no configurado — createAd omitido (campaña creada sin anuncio)')
    return { id: mockId('ad_nopageid'), ad_set_id: adSetId, name: creative.headline, mock: true }
  }

  // Crear creative object
  const creativeRes = await fetch(`${META_GRAPH_URL}/act_${adAccountId}/adcreatives`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      name:              creative.headline,
      object_story_spec: {
        page_id:   pageId,
        link_data: {
          message:        creative.description,
          link:           creative.link_url,
          image_url:      creative.image_url,
          name:           creative.headline,
          call_to_action: { type: creative.cta_type, value: { link: creative.link_url } },
        },
      },
      access_token: token,
    }),
  })

  if (!creativeRes.ok) {
    const err = await creativeRes.json()
    throw new Error(`Meta createAdCreative: ${JSON.stringify(err)}`)
  }

  const creativeData = await creativeRes.json()

  // Crear el anuncio
  const adRes = await fetch(`${META_GRAPH_URL}/act_${adAccountId}/ads`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      adset_id:    adSetId,
      name:        creative.headline,
      creative:    { creative_id: creativeData.id },
      status:      'PAUSED',
      access_token: token,
    }),
  })

  if (!adRes.ok) {
    const err = await adRes.json()
    throw new Error(`Meta createAd: ${JSON.stringify(err)}`)
  }

  const adData = await adRes.json()
  return { id: adData.id, ad_set_id: adSetId, name: creative.headline }
}

// ─── getCampaignInsights ──────────────────────────────────────────────────────

export async function getCampaignInsights(campaignId: string): Promise<MetaInsights> {
  if (!HAS_META || campaignId.includes('mock')) {
    return mockInsights(campaignId)
  }

  const token  = process.env.META_ADS_ACCESS_TOKEN!
  const fields = 'spend,impressions,clicks,reach,actions,cost_per_action_type'

  const res = await fetch(
    `${META_GRAPH_URL}/${campaignId}/insights?fields=${fields}&access_token=${token}&date_preset=last_30d`,
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Meta getInsights: ${JSON.stringify(err)}`)
  }

  const json = await res.json()
  const d    = json.data?.[0] ?? {}

  const spend       = Math.round(Number(d.spend ?? 0) * 100)   // convertir a centavos
  const impressions = Number(d.impressions ?? 0)
  const clicks      = Number(d.clicks ?? 0)
  const reach       = Number(d.reach ?? 0)

  const conversions = (d.actions as Array<{ action_type: string; value: string }> | undefined)
    ?.find((a) => a.action_type === 'purchase')?.value ?? 0

  const purchase_value = (d.cost_per_action_type as Array<{ action_type: string; value: string }> | undefined)
    ?.find((a) => a.action_type === 'purchase')?.value ?? 0

  return {
    campaign_id: campaignId,
    spend,
    impressions,
    clicks,
    ctr:         impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
    conversions: Number(conversions),
    roas:        spend > 0 ? Number((Number(purchase_value) / (spend / 100)).toFixed(2)) : 0,
    reach,
  }
}

// ─── pauseCampaign ────────────────────────────────────────────────────────────

export async function pauseCampaign(campaignId: string): Promise<void> {
  if (!HAS_META || campaignId.includes('mock')) return

  const token = process.env.META_ADS_ACCESS_TOKEN!
  const res   = await fetch(`${META_GRAPH_URL}/${campaignId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status: 'PAUSED', access_token: token }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Meta pauseCampaign: ${JSON.stringify(err)}`)
  }
}

// ─── resumeCampaign ───────────────────────────────────────────────────────────

export async function resumeCampaign(campaignId: string): Promise<void> {
  if (!HAS_META || campaignId.includes('mock')) return

  const token = process.env.META_ADS_ACCESS_TOKEN!
  const res   = await fetch(`${META_GRAPH_URL}/${campaignId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status: 'ACTIVE', access_token: token }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Meta resumeCampaign: ${JSON.stringify(err)}`)
  }
}

// ─── exchangeForLongLivedToken ────────────────────────────────────────────────
//
// Convierte un token de corta duración (del flujo OAuth de usuario) en uno de
// larga duración (~60 días). Los System User tokens son permanentes y no necesitan
// este intercambio.
//
// Uso: llama después de obtener el token de acceso del usuario en el flujo OAuth.

export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string
  token_type:   string
  expires_in:   number   // segundos
}> {
  const appId     = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!

  const url = new URL(`${META_GRAPH_URL}/oauth/access_token`)
  url.searchParams.set('grant_type',         'fb_exchange_token')
  url.searchParams.set('client_id',          appId)
  url.searchParams.set('client_secret',      appSecret)
  url.searchParams.set('fb_exchange_token',  shortLivedToken)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Meta exchangeToken error: ${JSON.stringify(err)}`)
  }

  return res.json()
}

// ─── getAdAccounts ────────────────────────────────────────────────────────────
//
// Lista las cuentas de anuncios a las que el token tiene acceso.
// Útil para identificar el META_AD_ACCOUNT_ID correcto.

export async function getAdAccounts(): Promise<Array<{
  id:           string    // formato: act_XXXXXX
  name:         string
  currency:     string
  account_status: number  // 1=activa, 2=deshabilitada
}>> {
  if (!HAS_META) {
    return [{ id: 'act_mock_123456', name: 'TrendPilot Mock Account', currency: 'MXN', account_status: 1 }]
  }

  const token = process.env.META_ADS_ACCESS_TOKEN!
  const res   = await fetch(
    `${META_GRAPH_URL}/me/adaccounts?fields=id,name,currency,account_status&access_token=${token}`,
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Meta getAdAccounts: ${JSON.stringify(err)}`)
  }

  const json = await res.json()
  return json.data ?? []
}

// ─── subscribeWebhook ─────────────────────────────────────────────────────────
//
// Suscribe la ad account a eventos de webhook.
// Llamar una vez después de configurar el webhook en Meta App Dashboard.
// Requiere META_APP_ID configurado.

export async function subscribeAdAccountToWebhook(): Promise<void> {
  if (!HAS_META) {
    console.log('[Meta] Modo mock — subscribeWebhook omitido')
    return
  }

  const token     = process.env.META_ADS_ACCESS_TOKEN!
  const accountId = getAccountId()

  // Suscribir la app a la ad account para recibir eventos
  const res = await fetch(`${META_GRAPH_URL}/act_${accountId}/subscribed_apps`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ access_token: token }),
  })

  if (!res.ok) {
    const err = await res.json()
    console.warn('[Meta] subscribeWebhook error (no crítico):', JSON.stringify(err))
    return
  }

  console.log('[Meta] Ad account suscrita al webhook ✅')
}

// ─── updateBudget ─────────────────────────────────────────────────────────────

export async function updateBudget(campaignId: string, dailyBudgetCents: number): Promise<void> {
  if (!HAS_META || campaignId.includes('mock')) return

  const token = process.env.META_ADS_ACCESS_TOKEN!

  // Primero obtener el ad set de la campaña
  const setsRes = await fetch(
    `${META_GRAPH_URL}/${campaignId}/adsets?fields=id&access_token=${token}`,
  )

  if (!setsRes.ok) return
  const { data: sets } = await setsRes.json()

  for (const adSet of sets ?? []) {
    await fetch(`${META_GRAPH_URL}/${adSet.id}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ daily_budget: dailyBudgetCents, access_token: token }),
    })
  }
}
