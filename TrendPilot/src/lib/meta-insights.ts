// meta-insights.ts — Jala métricas reales de Meta Marketing API
// Llamado solo desde server-side (route handlers / server actions)

export interface MetaInsights {
  spend:       number   // MXN
  clicks:      number
  impressions: number
  conversions: number   // actions donde action_type = 'purchase'
  revenue:     number   // action_values donde action_type = 'purchase'
}

const EMPTY: MetaInsights = { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 }

export async function fetchCampaignInsights(
  metaCampaignId: string | null | undefined,
): Promise<MetaInsights> {
  if (!metaCampaignId) return EMPTY

  const token = process.env.META_ADS_ACCESS_TOKEN
  if (!token) {
    console.warn('[meta-insights] META_ADS_ACCESS_TOKEN no configurado')
    return EMPTY
  }

  try {
    const url = new URL(`https://graph.facebook.com/v19.0/${metaCampaignId}/insights`)
    url.searchParams.set('fields', 'spend,clicks,impressions,actions,action_values')
    url.searchParams.set('date_preset', 'last_14d')
    url.searchParams.set('access_token', token)

    const res = await fetch(url.toString(), {
      next: { revalidate: 900 },   // cache 15 min
    })

    if (!res.ok) {
      console.error('[meta-insights] API error', res.status, await res.text())
      return EMPTY
    }

    const json = await res.json()
    const data = json.data?.[0]
    if (!data) return EMPTY

    const actions: Array<{ action_type: string; value: string }> = data.actions ?? []
    const actionValues: Array<{ action_type: string; value: string }> = data.action_values ?? []

    const purchases      = actions.find((a) => a.action_type === 'purchase')
    const purchaseValues = actionValues.find((a) => a.action_type === 'purchase')

    return {
      spend:       parseFloat(data.spend        ?? '0'),
      clicks:      parseInt(data.clicks          ?? '0', 10),
      impressions: parseInt(data.impressions     ?? '0', 10),
      conversions: parseInt(purchases?.value     ?? '0', 10),
      revenue:     parseFloat(purchaseValues?.value ?? '0'),
    }
  } catch (e) {
    console.error('[meta-insights] fetchCampaignInsights error:', e)
    return EMPTY
  }
}
