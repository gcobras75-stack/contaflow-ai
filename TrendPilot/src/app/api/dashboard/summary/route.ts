// GET /api/dashboard/summary — Resumen consolidado del dashboard
// Combina: campañas activas + comisiones afiliados + resumen Meta Ads
// Protegido con sesión NextAuth o worker secret

import { NextRequest, NextResponse }     from 'next/server'
import { neon }                           from '@neondatabase/serverless'
import { guardRoute, serverErrorResponse } from '@/lib/api-auth'
import { logServerError }                  from '@/lib/logger'
import { fetchAccountSummary }             from '@/lib/meta-api'
import { getAffiliateCommissionSummary }   from '@/lib/ml-affiliates'
import { getCommissions }                  from '@/lib/queries/commissions'

export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'vendors')
  if (guard instanceof NextResponse) return guard

  const sql = neon(process.env.DATABASE_URL!)

  try {
    // Ejecutar consultas en paralelo
    const [
      affiliateCampaigns,
      commissionSummary,
      metaSummary,
      drizzleCommissions,
    ] = await Promise.allSettled([
      // Campañas afiliadas con métricas
      sql`
        SELECT
          id, name, slug, status, image_url,
          product_price, commission_rate, affiliate_network, affiliate_url,
          meta_spend, meta_clicks, meta_impressions,
          total_conversions, total_commissions
        FROM affiliate_campaigns
        ORDER BY created_at DESC
        LIMIT 20
      `,
      // Comisiones de redes afiliadas (este mes)
      getAffiliateCommissionSummary({ period: 'this_month' }),
      // Resumen de cuenta Meta (este mes)
      fetchAccountSummary(),
      // Comisiones Drizzle (pagos de vendedores)
      getCommissions(1, 50),
    ])

    // ── Procesar campañas ──
    const rawCampaigns = affiliateCampaigns.status === 'fulfilled'
      ? (affiliateCampaigns.value as Record<string, unknown>[])
      : []

    const campaigns = rawCampaigns.map((c) => {
      const spend       = Number(c.meta_spend       ?? 0)
      const conversions = Number(c.total_conversions ?? 0)
      const price       = Number(c.product_price     ?? 0)
      const rate        = Number(c.commission_rate   ?? 0)
      const commission  = conversions * price * (rate / 100)
      const roi         = spend > 0 ? ((commission - spend) / spend) * 100 : 0
      return {
        id:               c.id,
        name:             c.name,
        slug:             c.slug,
        status:           c.status,
        image_url:        c.image_url,
        meta_spend:       spend,
        meta_clicks:      Number(c.meta_clicks      ?? 0),
        conversions,
        commission_total: commission,
        roi:              Math.round(roi * 10) / 10,
      }
    })

    // ── Procesar comisiones afiliados ──
    const affComm = commissionSummary.status === 'fulfilled'
      ? commissionSummary.value
      : { total_commissions: 0, approved_commissions: 0, pending_commissions: 0,
          operator_total: 0, antonio_total: 0, by_network: {}, recent: [] }

    // ── Procesar Meta ──
    const meta = metaSummary.status === 'fulfilled' && metaSummary.value
      ? metaSummary.value
      : { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 }

    const accountRoi = meta.spend > 0
      ? Math.round(((meta.revenue - meta.spend) / meta.spend) * 100)
      : 0

    // ── GrowthFund (30% de comisiones afiliados aprobadas) ──
    const growthFundAccumulated = affComm.antonio_total
    const growthFundReinvested  = 0   // pendiente conectar con campaigns budget_fund
    const growthFundAvailable   = growthFundAccumulated - growthFundReinvested

    return NextResponse.json({
      meta: {
        total_spend:       meta.spend,
        total_clicks:      meta.clicks,
        total_impressions: meta.impressions,
        total_conversions: meta.conversions,
        account_roi:       accountRoi,
      },
      commissions: {
        total:          affComm.total_commissions,
        approved:       affComm.approved_commissions,
        pending:        affComm.pending_commissions,
        operator_share: affComm.operator_total,
        antonio_share:  affComm.antonio_total,
        by_network:     affComm.by_network,
      },
      campaigns,
      growthfund: {
        accumulated: growthFundAccumulated,
        reinvested:  growthFundReinvested,
        available:   growthFundAvailable,
      },
      recent_commissions: affComm.recent.slice(0, 5),
      last_updated:       new Date().toISOString(),
    })
  } catch (err) {
    logServerError(err, 'GET /api/dashboard/summary')
    return serverErrorResponse()
  }
}
