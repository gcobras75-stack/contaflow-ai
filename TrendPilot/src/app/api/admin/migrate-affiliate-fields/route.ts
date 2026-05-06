// POST /api/admin/migrate-affiliate-fields — Agrega campos a affiliate_campaigns
// Ejecutar una sola vez con ?token=tp-fields-2026
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const CAMPAIGN_DATA = [
  {
    keyword:          'smartwatch',
    slug:             'smartwatch-deportivo',
    product_price:    899.00,
    commission_rate:  6.0,
    affiliate_network:'mercadolibre',
    affiliate_url:    'https://mercadolibre.com.mx/smartwatch?affiliateId=GCOBRAS',
  },
  {
    keyword:          'airfryer',
    slug:             'airfryer-sin-aceite',
    product_price:    1299.00,
    commission_rate:  6.0,
    affiliate_network:'mercadolibre',
    affiliate_url:    'https://mercadolibre.com.mx/airfryer?affiliateId=GCOBRAS',
  },
  {
    keyword:          'teclado',
    slug:             'teclado-mecanico-gamer',
    product_price:    749.00,
    commission_rate:  6.0,
    affiliate_network:'mercadolibre',
    affiliate_url:    'https://mercadolibre.com.mx/teclado-gamer?affiliateId=GCOBRAS',
  },
  {
    keyword:          'suero',
    slug:             'suero-vitamina-c',
    product_price:    349.00,
    commission_rate:  20.0,
    affiliate_network:'shein',
    affiliate_url:    'https://shein.com.mx/suero-vitamina-c?affiliateId=4544144225',
  },
  {
    keyword:          'gps',
    slug:             'gps-mascotas',
    product_price:    599.00,
    commission_rate:  6.0,
    affiliate_network:'mercadolibre',
    affiliate_url:    'https://mercadolibre.com.mx/gps-mascotas?affiliateId=GCOBRAS',
  },
]

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('token')
  if (secret !== 'tp-fields-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sql = neon(process.env.DATABASE_URL!)
  const results: string[] = []

  // 1. Agregar columnas nuevas
  try {
    await sql`
      ALTER TABLE affiliate_campaigns
        ADD COLUMN IF NOT EXISTS slug               VARCHAR(100),
        ADD COLUMN IF NOT EXISTS product_price      DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS commission_rate    DECIMAL(5,2)  DEFAULT 6.0,
        ADD COLUMN IF NOT EXISTS affiliate_network  VARCHAR(50)   DEFAULT 'mercadolibre',
        ADD COLUMN IF NOT EXISTS affiliate_url      TEXT,
        ADD COLUMN IF NOT EXISTS meta_campaign_id   TEXT,
        ADD COLUMN IF NOT EXISTS meta_spend         DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS meta_clicks        INTEGER       DEFAULT 0,
        ADD COLUMN IF NOT EXISTS meta_impressions   INTEGER       DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_conversions  INTEGER       DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_commissions  DECIMAL(10,2) DEFAULT 0
    `
    results.push('✓ Columnas agregadas')
  } catch (e) { results.push(`ALTER error: ${String(e)}`) }

  // 2. Actualizar cada campaña con slug, precio y datos de afiliado
  for (const c of CAMPAIGN_DATA) {
    try {
      await sql`
        UPDATE affiliate_campaigns
        SET
          slug              = ${c.slug},
          product_price     = ${c.product_price},
          commission_rate   = ${c.commission_rate},
          affiliate_network = ${c.affiliate_network},
          affiliate_url     = ${c.affiliate_url}
        WHERE product_name ILIKE ${`%${c.keyword}%`}
      `
      results.push(`  ✓ ${c.slug}: $${c.product_price} ${c.commission_rate}% ${c.affiliate_network}`)
    } catch (e) { results.push(`  ✗ ${c.keyword}: ${String(e)}`) }
  }

  // 3. Leer estado final
  let rows: Record<string, unknown>[] = []
  try {
    rows = await sql`
      SELECT id, product_name, slug, product_price, commission_rate,
             affiliate_network, affiliate_url, image_url
      FROM affiliate_campaigns ORDER BY created_at DESC
    ` as Record<string, unknown>[]
    results.push(`\nEstado final: ${rows.length} campañas`)
  } catch (e) { results.push(`read error: ${String(e)}`) }

  return NextResponse.json({ success: true, results, campaigns: rows })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
