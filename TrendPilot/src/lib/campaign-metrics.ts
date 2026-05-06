// campaign-metrics.ts — Cálculo centralizado de métricas de campañas afiliadas
// Split: 70% operador / 30% GrowthFund (Antonio)

export interface CampaignMetricsInput {
  meta_spend:         number   // MXN gastados en Meta
  meta_clicks:        number
  total_conversions:  number
  product_price:      number   // MXN precio del producto
  commission_rate:    number   // porcentaje ej. 6 o 20
}

export interface CampaignMetricsOutput {
  comision_total:    number   // conversiones × precio × (rate/100)
  roi:               number   // % ROI
  ganancia_operador: number   // 70% de comisión
  ganancia_antonio:  number   // 30% de comisión (GrowthFund)
  cpc:               number   // costo por clic
  has_data:          boolean  // false si aún sin datos de Meta
}

export function calculateMetrics(campaign: CampaignMetricsInput): CampaignMetricsOutput {
  const comision_total = campaign.total_conversions
    * campaign.product_price
    * (campaign.commission_rate / 100)

  const roi = campaign.meta_spend > 0
    ? ((comision_total - campaign.meta_spend) / campaign.meta_spend) * 100
    : 0

  return {
    comision_total,
    roi:               Math.round(roi * 10) / 10,
    ganancia_operador: comision_total * 0.70,
    ganancia_antonio:  comision_total * 0.30,
    cpc: campaign.meta_clicks > 0
      ? campaign.meta_spend / campaign.meta_clicks
      : 0,
    has_data: campaign.meta_spend > 0 || campaign.total_conversions > 0,
  }
}
