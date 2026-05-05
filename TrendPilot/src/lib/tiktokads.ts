// TikTok Ads API — TrendPilot
// Si TIKTOK_ACCESS_TOKEN existe → API real
// Si NO existe → mock estructurado listo para conectar

const TIKTOK_API_URL = 'https://business-api.tiktok.com/open_api/v1.3'

const HAS_TIKTOK = Boolean(process.env.TIKTOK_ACCESS_TOKEN && process.env.TIKTOK_ADVERTISER_ID)

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface TikTokCampaignResult {
  id:     string
  name:   string
  status: string
  mock?:  boolean
}

export interface TikTokAdGroupResult {
  id:          string
  campaign_id: string
  name:        string
  mock?:       boolean
}

export interface TikTokAdResult {
  id:          string
  ad_group_id: string
  name:        string
  mock?:       boolean
}

export interface TikTokStats {
  campaign_id: string
  spend:       number  // centavos MXN
  impressions: number
  clicks:      number
  ctr:         number
  conversions: number
  cost_per_conversion: number  // centavos
  video_play_6s: number
  video_play_75pct: number
  mock?:       boolean
}

export interface TikTokAudience {
  age_groups:   ('13-17' | '18-24' | '25-34' | '35+')[]
  gender:       'MALE' | 'FEMALE' | 'ALL'
  interests:    string[]
  device:       'MOBILE'   // TikTok es solo mobile
  location:     'MX'
}

export interface TikTokCreative {
  caption:    string           // máx 100 chars
  image_url?: string
  video_url?: string
  cta:        string
  landing_url: string
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockId(prefix: string) {
  return `${prefix}_tktk_${Math.random().toString(36).slice(2, 10)}`
}

function mockStats(campaignId: string): TikTokStats {
  const spend = Math.round(150_00 + Math.random() * 400_00)
  const impressions = Math.round(spend * 1.2)
  const clicks      = Math.round(impressions * 0.025)
  const conversions = Math.round(clicks * 0.04)
  return {
    campaign_id:         campaignId,
    spend,
    impressions,
    clicks,
    ctr:                 Number(((clicks / impressions) * 100).toFixed(2)),
    conversions,
    cost_per_conversion: conversions > 0 ? Math.round(spend / conversions) : 0,
    video_play_6s:       Math.round(impressions * 0.6),
    video_play_75pct:    Math.round(impressions * 0.3),
    mock:                true,
  }
}

function tiktokHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Token': process.env.TIKTOK_ACCESS_TOKEN!,
  }
}

// ─── createCampaign ───────────────────────────────────────────────────────────

export async function createCampaign(name: string, budgetCents: number): Promise<TikTokCampaignResult> {
  if (!HAS_TIKTOK) {
    return { id: mockId('camp'), name, status: 'DISABLE', mock: true }
  }

  const advertiserId = process.env.TIKTOK_ADVERTISER_ID!

  const res = await fetch(`${TIKTOK_API_URL}/campaign/create/`, {
    method:  'POST',
    headers: tiktokHeaders(),
    body:    JSON.stringify({
      advertiser_id:    advertiserId,
      campaign_name:    name,
      objective_type:   'PRODUCT_SALES',
      budget_mode:      'BUDGET_MODE_DAY',
      budget:           budgetCents / 100,  // TikTok usa unidades, no centavos
      operation_status: 'DISABLE',
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`TikTok createCampaign: ${JSON.stringify(err)}`)
  }

  const json = await res.json()
  return { id: String(json.data?.campaign_id), name, status: 'DISABLE' }
}

// ─── createAdGroup ────────────────────────────────────────────────────────────

export async function createAdGroup(
  campaignId: string,
  audience:   TikTokAudience,
  dailyBudgetCents: number,
): Promise<TikTokAdGroupResult> {
  if (!HAS_TIKTOK) {
    return { id: mockId('adgrp'), campaign_id: campaignId, name: 'TrendPilot AdGroup', mock: true }
  }

  const advertiserId = process.env.TIKTOK_ADVERTISER_ID!

  const ageMap = {
    '13-17': 'AGE_13_17',
    '18-24': 'AGE_18_24',
    '25-34': 'AGE_25_34',
    '35+':   'AGE_35_54',
  }

  const res = await fetch(`${TIKTOK_API_URL}/adgroup/create/`, {
    method:  'POST',
    headers: tiktokHeaders(),
    body:    JSON.stringify({
      advertiser_id:    advertiserId,
      campaign_id:      campaignId,
      adgroup_name:     'TrendPilot AdGroup',
      placements:       ['PLACEMENT_TIKTOK'],
      age:              audience.age_groups.map((a) => ageMap[a]),
      gender:           audience.gender,
      location_ids:     ['MX'],
      budget:           dailyBudgetCents / 100,
      budget_mode:      'BUDGET_MODE_DAY',
      schedule_type:    'SCHEDULE_START_END',
      optimization_goal:'CONVERT',
      billing_event:    'OCPM',
      operation_status: 'DISABLE',
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`TikTok createAdGroup: ${JSON.stringify(err)}`)
  }

  const json = await res.json()
  return { id: String(json.data?.adgroup_id), campaign_id: campaignId, name: 'TrendPilot AdGroup' }
}

// ─── createAd ────────────────────────────────────────────────────────────────

export async function createAd(adGroupId: string, creative: TikTokCreative): Promise<TikTokAdResult> {
  if (!HAS_TIKTOK) {
    return { id: mockId('ad'), ad_group_id: adGroupId, name: creative.caption.slice(0, 30), mock: true }
  }

  const advertiserId = process.env.TIKTOK_ADVERTISER_ID!

  const res = await fetch(`${TIKTOK_API_URL}/ad/create/`, {
    method:  'POST',
    headers: tiktokHeaders(),
    body:    JSON.stringify({
      advertiser_id: advertiserId,
      adgroup_id:    adGroupId,
      creatives:     [{
        ad_name:      creative.caption.slice(0, 30),
        ad_text:      creative.caption,
        landing_page_url: creative.landing_url,
        call_to_action: creative.cta,
        image_ids:    creative.image_url ? [creative.image_url] : undefined,
      }],
      operation_status: 'DISABLE',
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`TikTok createAd: ${JSON.stringify(err)}`)
  }

  const json = await res.json()
  return {
    id:          String(json.data?.ad_ids?.[0]),
    ad_group_id: adGroupId,
    name:        creative.caption.slice(0, 30),
  }
}

// ─── getCampaignStats ─────────────────────────────────────────────────────────

export async function getCampaignStats(campaignId: string): Promise<TikTokStats> {
  if (!HAS_TIKTOK || campaignId.includes('tktk')) {
    return mockStats(campaignId)
  }

  const advertiserId = process.env.TIKTOK_ADVERTISER_ID!
  const now          = new Date()
  const startDate    = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
  const endDate      = now.toISOString().slice(0, 10)

  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    service_type:  'AUCTION',
    report_type:   'BASIC',
    data_level:    'AUCTION_CAMPAIGN',
    dimensions:    JSON.stringify(['campaign_id']),
    metrics:       JSON.stringify(['spend', 'impressions', 'clicks', 'conversion', 'cost_per_conversion', 'video_play_6s', 'video_watched_75p']),
    start_date:    startDate,
    end_date:      endDate,
    filters:       JSON.stringify([{ field_name: 'campaign_id', filter_type: 'IN', filter_value: JSON.stringify([campaignId]) }]),
    page_size:     '1',
  })

  const res = await fetch(`${TIKTOK_API_URL}/report/integrated/get/?${params}`, {
    headers: tiktokHeaders(),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`TikTok getStats: ${JSON.stringify(err)}`)
  }

  const json = await res.json()
  const row  = json.data?.list?.[0]?.metrics ?? {}

  const spend = Math.round(Number(row.spend ?? 0) * 100)
  const impressions = Number(row.impressions ?? 0)
  const clicks      = Number(row.clicks ?? 0)

  return {
    campaign_id:         campaignId,
    spend,
    impressions,
    clicks,
    ctr:                 impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
    conversions:         Number(row.conversion ?? 0),
    cost_per_conversion: Math.round(Number(row.cost_per_conversion ?? 0) * 100),
    video_play_6s:       Number(row.video_play_6s ?? 0),
    video_play_75pct:    Number(row.video_watched_75p ?? 0),
  }
}

// ─── pauseCampaign ────────────────────────────────────────────────────────────

export async function pauseCampaign(campaignId: string): Promise<void> {
  if (!HAS_TIKTOK || campaignId.includes('tktk')) return

  const advertiserId = process.env.TIKTOK_ADVERTISER_ID!
  await fetch(`${TIKTOK_API_URL}/campaign/status/update/`, {
    method:  'POST',
    headers: tiktokHeaders(),
    body:    JSON.stringify({
      advertiser_id:    advertiserId,
      campaign_ids:     [campaignId],
      operation_status: 'DISABLE',
    }),
  })
}
