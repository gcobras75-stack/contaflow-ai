// Cliente Meta Ads API para TrendPilot

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0'

interface AdSetConfig {
  campaignId: string
  name: string
  dailyBudget: number
  targetingSpec: Record<string, unknown>
  startTime?: string
}

interface AdCreativeConfig {
  name: string
  imageUrl: string
  headline: string
  body: string
  callToAction: string
  linkUrl: string
}

// Crear una campaña en Meta Ads
export async function createMetaCampaign(
  name: string,
  objective: string = 'OUTCOME_SALES'
) {
  const token = process.env.META_ADS_ACCESS_TOKEN!
  const adAccountId = process.env.META_AD_ACCOUNT_ID!

  const response = await fetch(
    `${META_GRAPH_URL}/act_${adAccountId}/campaigns`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        objective,
        status: 'PAUSED', // siempre iniciar pausada, activar manualmente
        access_token: token,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Meta Ads error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

// Obtener métricas de una campaña
export async function getCampaignInsights(campaignId: string) {
  const token = process.env.META_ADS_ACCESS_TOKEN!

  const fields = 'spend,impressions,clicks,actions,cost_per_action_type,roas'
  const response = await fetch(
    `${META_GRAPH_URL}/${campaignId}/insights?fields=${fields}&access_token=${token}`
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Meta insights error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

// Pausar una campaña
export async function pauseMetaCampaign(campaignId: string) {
  const token = process.env.META_ADS_ACCESS_TOKEN!

  const response = await fetch(`${META_GRAPH_URL}/${campaignId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'PAUSED',
      access_token: token,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Meta pause error: ${JSON.stringify(error)}`)
  }

  return response.json()
}
