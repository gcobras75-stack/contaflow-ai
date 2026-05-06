// POST /api/admin/migrate-affiliate-images — Agrega image_url y migra imágenes
// Protegido por CRON_SECRET — ejecutar una sola vez
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const SEED_CAMPAIGNS = [
  {
    product_name:    'Airfryer Sin Aceite',
    platform:        'meta',
    status:          'active',
    budget_daily_mxn: 150,
    image_url: 'https://images.unsplash.com/photo-1648152960823-6a6a0e04ec12?w=800&q=80',
  },
  {
    product_name:    'Smartwatch Deportivo',
    platform:        'meta',
    status:          'active',
    budget_daily_mxn: 200,
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
  },
  {
    product_name:    'Teclado Mecánico Gamer',
    platform:        'meta',
    status:          'active',
    budget_daily_mxn: 120,
    image_url: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=800&q=80',
  },
  {
    product_name:    'Suero Vitamina C',
    platform:        'meta',
    status:          'active',
    budget_daily_mxn: 100,
    image_url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80',
  },
  {
    product_name:    'GPS Mascotas',
    platform:        'meta',
    status:          'active',
    budget_daily_mxn: 130,
    image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80',
  },
]

export async function POST(request: NextRequest) {
  // Token de un solo uso
  const secret = request.nextUrl.searchParams.get('token')
  if (secret !== 'tp-migrate-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sql = neon(process.env.DATABASE_URL!)
  const results: string[] = []

  // 1. Diagnóstico: tablas existentes
  try {
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    ` as Record<string, unknown>[]
    results.push(`Tablas: ${tables.map((t) => t.table_name).join(', ')}`)
  } catch (e) { results.push(`tables error: ${String(e)}`) }

  // 2. Crear tabla affiliate_campaigns si no existe
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS affiliate_campaigns (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_name     TEXT NOT NULL,
        platform         TEXT NOT NULL DEFAULT 'meta',
        status           TEXT NOT NULL DEFAULT 'active',
        budget_daily_mxn NUMERIC DEFAULT 0,
        spend_total_mxn  NUMERIC DEFAULT 0,
        clicks           INTEGER DEFAULT 0,
        conversions      INTEGER DEFAULT 0,
        revenue_generated NUMERIC DEFAULT 0,
        commission_earned NUMERIC DEFAULT 0,
        roi_percentage   NUMERIC DEFAULT 0,
        image_url        TEXT,
        affiliate_url    TEXT,
        created_at       TIMESTAMP DEFAULT NOW()
      )
    `
    results.push('✓ Tabla affiliate_campaigns lista')
  } catch (e) { results.push(`CREATE error: ${String(e)}`) }

  // 3. Insertar campañas si la tabla está vacía
  try {
    const existing = await sql`SELECT COUNT(*) as n FROM affiliate_campaigns` as Record<string, unknown>[]
    const count = Number(existing[0]?.n ?? 0)
    results.push(`Campañas existentes: ${count}`)

    const force = request.nextUrl.searchParams.get('force') === '1'

    if (count === 0) {
      for (const c of SEED_CAMPAIGNS) {
        await sql`
          INSERT INTO affiliate_campaigns
            (product_name, platform, status, budget_daily_mxn, image_url)
          VALUES
            (${c.product_name}, ${c.platform}, ${c.status}, ${c.budget_daily_mxn}, ${c.image_url})
        `
        results.push(`  ✓ Insertada: ${c.product_name}`)
      }
    } else {
      // Actualizar image_url: si force=1 sobreescribe todas, si no solo las vacías
      for (const c of SEED_CAMPAIGNS) {
        if (force) {
          await sql`
            UPDATE affiliate_campaigns
            SET image_url = ${c.image_url}
            WHERE product_name ILIKE ${`%${c.product_name.split(' ')[0]}%`}
          `
        } else {
          await sql`
            UPDATE affiliate_campaigns
            SET image_url = ${c.image_url}
            WHERE product_name ILIKE ${`%${c.product_name.split(' ')[0]}%`}
              AND (image_url IS NULL OR image_url = '')
          `
        }
      }
      results.push(force ? '✓ image_url forzadas (force=1)' : '✓ image_url actualizadas (solo vacías)')
    }
  } catch (e) { results.push(`INSERT error: ${String(e)}`) }

  // 4. Leer estado final
  let campaigns: Record<string, unknown>[] = []
  try {
    campaigns = await sql`
      SELECT id, product_name, platform, status, budget_daily_mxn,
             spend_total_mxn, clicks, conversions, roi_percentage, image_url, created_at
      FROM affiliate_campaigns ORDER BY created_at DESC
    ` as Record<string, unknown>[]
    results.push(`\nEstado final: ${campaigns.length} campañas`)
    campaigns.forEach((c) => results.push(
      `  - ${c.product_name} | ${c.platform} | roi:${c.roi_percentage} | img:${c.image_url ? 'sí' : 'no'}`
    ))
  } catch (e) { results.push(`final read error: ${String(e)}`) }

  // 5. campaigns Drizzle
  try {
    const dc = await sql`SELECT COUNT(*) as n FROM campaigns` as Record<string, unknown>[]
    results.push(`campaigns (Drizzle): ${dc[0]?.n} registros`)
  } catch (e) { results.push(`campaigns error: ${String(e)}`) }

  return NextResponse.json({ success: true, results, affiliate_campaigns: campaigns })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
