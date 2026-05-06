// GET /api/campaigns/by-slug/[slug] — Campaña afiliada por slug
// Incluye métricas calculadas con datos reales de Meta si está configurado
export const revalidate = 900   // cache 15 min

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { fetchCampaignInsights } from '@/lib/meta-insights'
import { calculateMetrics } from '@/lib/campaign-metrics'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { slug } = params

  try {
    const sql = neon(process.env.DATABASE_URL!)

    const rows = await sql`
      SELECT id, product_name, slug, status, image_url,
             product_price, commission_rate, affiliate_network, affiliate_url,
             meta_campaign_id, meta_spend, meta_clicks, meta_impressions,
             total_conversions, total_commissions, roi_percentage,
             budget_daily_mxn, spend_total_mxn, created_at
      FROM affiliate_campaigns
      WHERE slug = ${slug}
      LIMIT 1
    ` as Record<string, unknown>[]

    if (!rows.length) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    }

    const row = rows[0]

    // Jalamos métricas de Meta si hay meta_campaign_id configurado
    const metaId = row.meta_campaign_id as string | null
    const live = await fetchCampaignInsights(metaId)

    // Si hay datos de Meta, actualizamos en DB (fire and forget)
    if (metaId && live.spend > 0) {
      sql`
        UPDATE affiliate_campaigns
        SET meta_spend       = ${live.spend},
            meta_clicks      = ${live.clicks},
            meta_impressions = ${live.impressions},
            total_conversions = ${live.conversions}
        WHERE slug = ${slug}
      `.catch((e) => console.error('[by-slug] update meta error:', e))
    }

    const metrics = calculateMetrics({
      meta_spend:        live.spend         || Number(row.meta_spend        ?? 0),
      meta_clicks:       live.clicks        || Number(row.meta_clicks       ?? 0),
      total_conversions: live.conversions   || Number(row.total_conversions ?? 0),
      product_price:     Number(row.product_price    ?? 0),
      commission_rate:   Number(row.commission_rate  ?? 6),
    })

    return NextResponse.json({
      data: {
        id:               String(row.id),
        name:             String(row.product_name),
        slug:             String(row.slug ?? slug),
        status:           String(row.status ?? 'active'),
        image_url:        (row.image_url as string | null) ?? null,
        product_price:    Number(row.product_price   ?? 0),
        commission_rate:  Number(row.commission_rate ?? 6),
        affiliate_network:String(row.affiliate_network ?? 'mercadolibre'),
        affiliate_url:    (row.affiliate_url as string | null) ?? null,
        metrics: {
          spend:             metrics.has_data ? (live.spend || Number(row.meta_spend ?? 0)) : 0,
          clicks:            metrics.has_data ? (live.clicks || Number(row.meta_clicks ?? 0)) : 0,
          impressions:       metrics.has_data ? (live.impressions || Number(row.meta_impressions ?? 0)) : 0,
          conversions:       metrics.has_data ? (live.conversions || Number(row.total_conversions ?? 0)) : 0,
          comision_total:    metrics.comision_total,
          roi:               metrics.roi,
          ganancia_operador: metrics.ganancia_operador,
          ganancia_antonio:  metrics.ganancia_antonio,
          cpc:               metrics.cpc,
          has_data:          metrics.has_data,
        },
      },
    })
  } catch (err) {
    console.error('[by-slug] GET error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
