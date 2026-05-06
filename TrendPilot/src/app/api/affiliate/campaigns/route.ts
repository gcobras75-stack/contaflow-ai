// GET /api/affiliate/campaigns — Campañas reales desde affiliate_campaigns
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth'
import { NextRequest } from 'next/server'

type SemColor = 'green' | 'yellow' | 'red'

function roiToSemaphore(roi: number | null | undefined): SemColor {
  const r = Number(roi ?? 0)
  if (r > 150) return 'green'
  if (r >= 0)  return 'yellow'
  return 'red'
}

function toMXNcents(mxn: unknown): number {
  const n = Number(mxn ?? 0)
  return isNaN(n) ? 0 : Math.round(n * 100)
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()

  try {
    const sql = neon(process.env.DATABASE_URL!)

    // Intentar con image_url; si no existe la columna, reintentar sin ella
    let rows: Record<string, unknown>[]
    try {
      rows = await sql`
        SELECT id, platform, status, product_name, image_url,
               budget_daily_mxn, spend_total_mxn, clicks, conversions,
               COALESCE(revenue_generated, 0) AS revenue_generated,
               COALESCE(commission_earned,  0) AS commission_earned,
               COALESCE(roi_percentage,     0) AS roi_percentage,
               created_at
        FROM affiliate_campaigns
        ORDER BY created_at DESC
      ` as Record<string, unknown>[]
    } catch {
      rows = await sql`
        SELECT id, platform, status, product_name,
               budget_daily_mxn, spend_total_mxn, clicks, conversions,
               COALESCE(revenue_generated, 0) AS revenue_generated,
               COALESCE(commission_earned,  0) AS commission_earned,
               COALESCE(roi_percentage,     0) AS roi_percentage,
               created_at
        FROM affiliate_campaigns
        ORDER BY created_at DESC
      ` as Record<string, unknown>[]
    }

    const data = rows.map((r) => ({
      id:                 String(r.id),
      name:               String(r.product_name ?? 'Producto'),
      product_name:       String(r.product_name ?? 'Producto'),
      vendor_name:        'Super Afiliado',
      platform:           String(r.platform ?? 'meta'),
      semaphore_color:    roiToSemaphore(r.roi_percentage as number),
      status:             String(r.status ?? 'active'),
      budget_total:       toMXNcents(r.budget_daily_mxn) * 30,   // 30 días en centavos
      budget_spent:       toMXNcents(r.spend_total_mxn),
      sales_generated:    toMXNcents(r.revenue_generated),
      commissions_earned: toMXNcents(r.commission_earned),
      product_image:      (r.image_url as string | null) ?? null,
      clicks:             Number(r.clicks        ?? 0),
      conversions:        Number(r.conversions   ?? 0),
      roi_percentage:     Number(r.roi_percentage ?? 0),
      created_at:         String(r.created_at ?? ''),
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[affiliate/campaigns] GET error:', err)
    return NextResponse.json({ data: [], error: String(err) }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
