// meta-api.ts — API completa de Meta Ads para TrendPilot
// Consolida fetchAllMetaCampaigns, insights, datos diarios y resumen de cuenta
// Solo se usa desde server-side (route handlers)

const META_BASE = 'https://graph.facebook.com/v19.0'

function getToken() { return process.env.META_ADS_ACCESS_TOKEN ?? '' }
function getAccount() { return process.env.META_AD_ACCOUNT_ID ?? '' }

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MetaCampaignSummary {
  id:             string
  name:           string
  status:         string
  daily_budget?:  number
  lifetime_budget?: number
}

export interface MetaCampaignInsights {
  spend:           number   // MXN
  clicks:          number
  impressions:     number
  reach:           number
  ctr:             number   // %
  cpc:             number   // MXN
  conversions:     number   // purchase actions
  conversionValue: number   // revenue MXN
}

export interface MetaDailyInsight {
  date:      string   // YYYY-MM-DD
  spend:     number
  clicks:    number
  purchases: number
}

export interface MetaAccountSummary {
  spend:       number
  clicks:      number
  impressions: number
  conversions: number
  revenue:     number
}

const EMPTY_INSIGHTS: MetaCampaignInsights = {
  spend: 0, clicks: 0, impressions: 0, reach: 0,
  ctr: 0, cpc: 0, conversions: 0, conversionValue: 0,
}

// ── 1. Traer TODAS las campañas de la cuenta Meta ──────────────────────────

export async function fetchAllMetaCampaigns(): Promise<MetaCampaignSummary[]> {
  const token   = getToken()
  const account = getAccount()
  if (!token || !account) return []

  try {
    const url = `${META_BASE}/${account}/campaigns`
      + `?fields=id,name,status,daily_budget,lifetime_budget`
      + `&access_token=${token}`

    const res = await fetch(url, { next: { revalidate: 900 } })
    if (!res.ok) {
      console.error('[meta-api] fetchAllMetaCampaigns error', res.status)
      return []
    }
    const json = await res.json()
    return (json.data ?? []) as MetaCampaignSummary[]
  } catch (e) {
    console.error('[meta-api] fetchAllMetaCampaigns:', e)
    return []
  }
}

// ── 2. Traer insights de UNA campaña ──────────────────────────────────────

export async function fetchCampaignInsights(
  campaignId: string,
  datePreset = 'last_14d',
): Promise<MetaCampaignInsights> {
  const token = getToken()
  if (!token || !campaignId) return EMPTY_INSIGHTS

  try {
    const url = `${META_BASE}/${campaignId}/insights`
      + `?fields=spend,clicks,impressions,reach,actions,action_values,ctr,cpc`
      + `&date_preset=${datePreset}`
      + `&access_token=${token}`

    const res = await fetch(url, { next: { revalidate: 900 } })
    if (!res.ok) {
      console.error(`[meta-api] fetchCampaignInsights error for ${campaignId}:`, res.status)
      return EMPTY_INSIGHTS
    }
    const json = await res.json()
    const d = json.data?.[0]
    if (!d) return EMPTY_INSIGHTS

    const purchases      = (d.actions ?? []).find((a: { action_type: string }) => a.action_type === 'purchase')
    const purchaseValues = (d.action_values ?? []).find((a: { action_type: string }) => a.action_type === 'purchase')

    return {
      spend:           parseFloat(d.spend       || '0'),
      clicks:          parseInt(d.clicks         || '0', 10),
      impressions:     parseInt(d.impressions    || '0', 10),
      reach:           parseInt(d.reach          || '0', 10),
      ctr:             parseFloat(d.ctr          || '0'),
      cpc:             parseFloat(d.cpc          || '0'),
      conversions:     purchases      ? parseInt(purchases.value,      10) : 0,
      conversionValue: purchaseValues ? parseFloat(purchaseValues.value)   : 0,
    }
  } catch (e) {
    console.error(`[meta-api] fetchCampaignInsights ${campaignId}:`, e)
    return EMPTY_INSIGHTS
  }
}

// ── 3. Traer insights diarios para gráfica ────────────────────────────────

export async function fetchDailyInsights(
  campaignId: string,
  days = 14,
): Promise<MetaDailyInsight[]> {
  const token = getToken()
  if (!token || !campaignId) return []

  try {
    const url = `${META_BASE}/${campaignId}/insights`
      + `?fields=spend,clicks,actions`
      + `&date_preset=last_${days}d`
      + `&time_increment=1`
      + `&access_token=${token}`

    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const json = await res.json()

    return (json.data ?? []).map((d: Record<string, unknown>) => ({
      date:      d.date_start as string,
      spend:     parseFloat((d.spend as string) || '0'),
      clicks:    parseInt((d.clicks as string)   || '0', 10),
      purchases: ((d.actions as Array<{ action_type: string; value: string }> | undefined) ?? [])
        .find((a) => a.action_type === 'purchase')?.value ?? 0,
    }))
  } catch (e) {
    console.error(`[meta-api] fetchDailyInsights ${campaignId}:`, e)
    return []
  }
}

// ── 4. Resumen total de la cuenta (este mes) ──────────────────────────────

export async function fetchAccountSummary(): Promise<MetaAccountSummary | null> {
  const token   = getToken()
  const account = getAccount()
  if (!token || !account) return null

  try {
    const url = `${META_BASE}/${account}/insights`
      + `?fields=spend,clicks,impressions,actions,action_values`
      + `&date_preset=this_month`
      + `&access_token=${token}`

    const res = await fetch(url, { next: { revalidate: 900 } })
    if (!res.ok) return null
    const json = await res.json()
    const d = json.data?.[0]
    if (!d) return null

    const purchases      = (d.actions ?? []).find((a: { action_type: string }) => a.action_type === 'purchase')
    const purchaseValues = (d.action_values ?? []).find((a: { action_type: string }) => a.action_type === 'purchase')

    return {
      spend:       parseFloat(d.spend    || '0'),
      clicks:      parseInt(d.clicks      || '0', 10),
      impressions: parseInt(d.impressions || '0', 10),
      conversions: purchases      ? parseInt(purchases.value,      10) : 0,
      revenue:     purchaseValues ? parseFloat(purchaseValues.value)   : 0,
    }
  } catch (e) {
    console.error('[meta-api] fetchAccountSummary:', e)
    return null
  }
}
