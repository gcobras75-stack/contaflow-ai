// Cliente TikTok Ads API para TrendPilot

const TIKTOK_API_URL = 'https://business-api.tiktok.com/open_api/v1.3'

function getTikTokHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Token': process.env.TIKTOK_ACCESS_TOKEN!,
  }
}

// Crear campaña en TikTok Ads
export async function createTikTokCampaign(
  name: string,
  budget: number,
  advertiserId: string
) {
  const response = await fetch(`${TIKTOK_API_URL}/campaign/create/`, {
    method: 'POST',
    headers: getTikTokHeaders(),
    body: JSON.stringify({
      advertiser_id: advertiserId,
      campaign_name: name,
      objective_type: 'PRODUCT_SALES',
      budget_mode: 'BUDGET_MODE_DAY',
      budget,
      operation_status: 'DISABLE', // iniciar pausada
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`TikTok Ads error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

// Obtener métricas de campaña TikTok
export async function getTikTokCampaignMetrics(
  campaignId: string,
  advertiserId: string,
  startDate: string,
  endDate: string
) {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    service_type: 'AUCTION',
    report_type: 'BASIC',
    data_level: 'AUCTION_CAMPAIGN',
    dimensions: JSON.stringify(['campaign_id']),
    metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'conversion']),
    start_date: startDate,
    end_date: endDate,
    filters: JSON.stringify([{ field_name: 'campaign_id', filter_type: 'IN', filter_value: JSON.stringify([campaignId]) }]),
    page: '1',
    page_size: '10',
  })

  const response = await fetch(
    `${TIKTOK_API_URL}/report/integrated/get/?${params}`,
    { headers: getTikTokHeaders() }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`TikTok metrics error: ${JSON.stringify(error)}`)
  }

  return response.json()
}
