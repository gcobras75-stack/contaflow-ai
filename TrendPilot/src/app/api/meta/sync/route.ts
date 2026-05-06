// POST /api/meta/sync — Sincroniza campañas Meta → Neon
// Protegido con x-worker-secret o Authorization: Bearer WORKER_SECRET
// Llamado cada 15 minutos desde el worker Railway

import { NextRequest, NextResponse } from 'next/server'
import { neon }                      from '@neondatabase/serverless'
import { fetchCampaignInsights }     from '@/lib/meta-api'

export const maxDuration = 60

function isAuthorized(request: NextRequest): boolean {
  const workerSecret = process.env.WORKER_SECRET
  if (!workerSecret) return false

  const xSecret = request.headers.get('x-worker-secret')
  if (xSecret === workerSecret) return true

  const bearer = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (bearer === workerSecret) return true

  return false
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sql = neon(process.env.DATABASE_URL!)

  try {
    // 1. Obtener todas las campañas con meta_campaign_id configurado
    const campaigns = await sql`
      SELECT id, name, meta_campaign_id
      FROM affiliate_campaigns
      WHERE meta_campaign_id IS NOT NULL
        AND meta_campaign_id != ''
    ` as Array<{ id: number; name: string; meta_campaign_id: string }>

    if (campaigns.length === 0) {
      return NextResponse.json({
        ok:      true,
        synced:  0,
        message: 'Sin campañas con meta_campaign_id configurado',
      })
    }

    let synced = 0
    const errors: string[] = []

    // 2. Para cada campaña, obtener insights de Meta y actualizar DB
    for (const campaign of campaigns) {
      try {
        const insights = await fetchCampaignInsights(campaign.meta_campaign_id)

        if (insights.spend > 0 || insights.impressions > 0) {
          await sql`
            UPDATE affiliate_campaigns
            SET
              meta_spend       = ${insights.spend},
              meta_clicks      = ${insights.clicks},
              meta_impressions = ${insights.impressions},
              total_conversions = ${insights.conversions}
            WHERE id = ${campaign.id}
          `
          synced++
        }
      } catch (err) {
        errors.push(`campaña ${campaign.id}: ${String(err)}`)
      }
    }

    return NextResponse.json({
      ok:     true,
      synced,
      total:  campaigns.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('[meta/sync]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
