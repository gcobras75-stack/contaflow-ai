// POST /api/admin/migrate-affiliate-images
// Crea/migra la tabla affiliate_campaigns con esquema completo
// ?token=tp-migrate-2026            → seed imágenes en campañas vacías
// ?token=tp-migrate-2026&alter=1    → ALTER TABLE + actualiza slug/price/meta columns
// ?token=tp-migrate-2026&force=1    → sobreescribe image_url aunque ya tenga valor
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const SEED_CAMPAIGNS = [
  {
    product_name:      'Airfryer Sin Aceite',
    slug:              'airfryer-sin-aceite',
    platform:          'meta',
    status:            'active',
    budget_daily_mxn:  150,
    product_price:     1299,
    commission_rate:   6,
    affiliate_network: 'mercadolibre',
    affiliate_url:     'https://www.mercadolibre.com.mx/freidoras-de-aire',
    image_url: 'https://images.unsplash.com/photo-1648152960823-6a6a0e04ec12?w=800&q=80',
  },
  {
    product_name:      'Smartwatch Deportivo',
    slug:              'smartwatch-deportivo',
    platform:          'meta',
    status:            'active',
    budget_daily_mxn:  200,
    product_price:     899,
    commission_rate:   7,
    affiliate_network: 'mercadolibre',
    affiliate_url:     'https://www.mercadolibre.com.mx/smartwatches',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
  },
  {
    product_name:      'Teclado Mecánico Gamer',
    slug:              'teclado-mecanico-gamer',
    platform:          'meta',
    status:            'active',
    budget_daily_mxn:  120,
    product_price:     1499,
    commission_rate:   6,
    affiliate_network: 'mercadolibre',
    affiliate_url:     'https://www.mercadolibre.com.mx/teclados-mecanicos',
    image_url: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=800&q=80',
  },
  {
    product_name:      'Suero Vitamina C',
    slug:              'suero-vitamina-c',
    platform:          'meta',
    status:            'active',
    budget_daily_mxn:  100,
    product_price:     549,
    commission_rate:   8,
    affiliate_network: 'mercadolibre',
    affiliate_url:     'https://www.mercadolibre.com.mx/suero-vitamina-c',
    image_url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80',
  },
  {
    product_name:      'GPS Mascotas',
    slug:              'gps-mascotas',
    platform:          'meta',
    status:            'active',
    budget_daily_mxn:  130,
    product_price:     1099,
    commission_rate:   7,
    affiliate_network: 'mercadolibre',
    affiliate_url:     'https://www.mercadolibre.com.mx/gps-mascotas',
    image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80',
  },
]

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('token')
  if (secret !== 'tp-migrate-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const alter = request.nextUrl.searchParams.get('alter') === '1'
  const force = request.nextUrl.searchParams.get('force') === '1'
  const sql   = neon(process.env.DATABASE_URL!)
  const results: string[] = []

  // ── 1. Diagnóstico: tablas existentes ──────────────────────────────────────
  try {
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    ` as Record<string, unknown>[]
    results.push(`Tablas: ${tables.map((t) => t.table_name).join(', ')}`)
  } catch (e) { results.push(`tables error: ${String(e)}`) }

  // ── 2. Crear tabla con esquema base si no existe ───────────────────────────
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
        revenue_generated  NUMERIC DEFAULT 0,
        commission_earned  NUMERIC DEFAULT 0,
        roi_percentage     NUMERIC DEFAULT 0,
        image_url        TEXT,
        affiliate_url    TEXT,
        created_at       TIMESTAMP DEFAULT NOW()
      )
    `
    results.push('✓ Tabla affiliate_campaigns lista (base)')
  } catch (e) { results.push(`CREATE error: ${String(e)}`) }

  // ── 3. ALTER TABLE: agregar columnas faltantes ────────────────────────────
  if (alter) {
    const alterCols: [string, string][] = [
      ['name',              'TEXT'],
      ['slug',              'TEXT'],
      ['product_price',     'NUMERIC DEFAULT 0'],
      ['commission_rate',   'NUMERIC DEFAULT 6'],
      ['affiliate_network', "TEXT DEFAULT 'mercadolibre'"],
      ['meta_campaign_id',  'TEXT'],
      ['meta_spend',        'NUMERIC DEFAULT 0'],
      ['meta_clicks',       'INTEGER DEFAULT 0'],
      ['meta_impressions',  'INTEGER DEFAULT 0'],
      ['total_conversions', 'INTEGER DEFAULT 0'],
      ['total_commissions', 'NUMERIC DEFAULT 0'],
    ]

    for (const [col, type] of alterCols) {
      try {
        await sql.unsafe(`ALTER TABLE affiliate_campaigns ADD COLUMN IF NOT EXISTS ${col} ${type}`)
        results.push(`  ✓ Columna ${col} lista`)
      } catch (e) { results.push(`  ALTER ${col} error: ${String(e)}`) }
    }

    // Agregar índice único en slug (si no existe)
    try {
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS affiliate_campaigns_slug_idx ON affiliate_campaigns(slug) WHERE slug IS NOT NULL`
      results.push('  ✓ Índice único en slug')
    } catch (e) { results.push(`  INDEX slug error: ${String(e)}`) }
  }

  // ── 4. Insertar / actualizar campañas ─────────────────────────────────────
  try {
    const existing = await sql`SELECT COUNT(*) as n FROM affiliate_campaigns` as Record<string, unknown>[]
    const count = Number(existing[0]?.n ?? 0)
    results.push(`Campañas existentes: ${count}`)

    if (count === 0) {
      // Inserción fresca con todos los campos
      for (const c of SEED_CAMPAIGNS) {
        await sql`
          INSERT INTO affiliate_campaigns
            (product_name, platform, status, budget_daily_mxn, image_url,
             affiliate_url, affiliate_network)
          VALUES
            (${c.product_name}, ${c.platform}, ${c.status}, ${c.budget_daily_mxn},
             ${c.image_url}, ${c.affiliate_url}, ${c.affiliate_network})
        `
        results.push(`  ✓ Insertada: ${c.product_name}`)
      }
    } else {
      // Actualizar campos que pueden estar vacíos
      for (const c of SEED_CAMPAIGNS) {
        // image_url
        if (force) {
          await sql`
            UPDATE affiliate_campaigns SET image_url = ${c.image_url}
            WHERE product_name ILIKE ${`%${c.product_name.split(' ')[0]}%`}
          `
        } else {
          await sql`
            UPDATE affiliate_campaigns SET image_url = ${c.image_url}
            WHERE product_name ILIKE ${`%${c.product_name.split(' ')[0]}%`}
              AND (image_url IS NULL OR image_url = '')
          `
        }

        // Campos del alter (solo si alter=1) — usa queries parametrizadas
        if (alter) {
          try {
            const keyword = `%${c.product_name.split(' ')[0]}%`
            await sql`
              UPDATE affiliate_campaigns
              SET
                name              = COALESCE(name, ${c.product_name}),
                slug              = COALESCE(slug, ${c.slug}),
                product_price     = CASE WHEN product_price IS NULL OR product_price = 0
                                         THEN ${c.product_price}::numeric ELSE product_price END,
                commission_rate   = CASE WHEN commission_rate IS NULL OR commission_rate <= 0
                                         THEN ${c.commission_rate}::numeric ELSE commission_rate END,
                affiliate_network = COALESCE(NULLIF(affiliate_network, ''), ${c.affiliate_network}),
                affiliate_url     = COALESCE(NULLIF(affiliate_url, ''), ${c.affiliate_url})
              WHERE product_name ILIKE ${keyword}
            `
            results.push(`  ✓ ${c.slug} actualizado`)
          } catch (e) { results.push(`  UPDATE data ${c.slug} error: ${String(e)}`) }
        }
      }
      results.push(force ? '✓ image_url forzadas' : '✓ image_url actualizadas (vacías)')
      if (alter) results.push('✓ slug, price, commission, network actualizados')
    }
  } catch (e) { results.push(`INSERT/UPDATE error: ${String(e)}`) }

  // ── 5. Estado final ────────────────────────────────────────────────────────
  let campaigns: Record<string, unknown>[] = []
  try {
    campaigns = await sql`
      SELECT id, product_name, platform, status, budget_daily_mxn,
             image_url, affiliate_url, created_at
      FROM affiliate_campaigns ORDER BY created_at DESC
    ` as Record<string, unknown>[]

    // Leer columnas extra si existen (después del alter)
    if (alter) {
      try {
        const full = await sql`
          SELECT id, product_name, name, slug, product_price, commission_rate,
                 affiliate_network, meta_campaign_id, image_url
          FROM affiliate_campaigns ORDER BY created_at DESC
        ` as Record<string, unknown>[]
        campaigns = full
      } catch { /* columnas aún no existen */ }
    }

    results.push(`\nEstado final: ${campaigns.length} campañas`)
    campaigns.forEach((c) => results.push(
      `  - ${c.product_name} | slug:${c.slug ?? 'n/a'} | price:${c.product_price ?? 'n/a'} | img:${c.image_url ? 'sí' : 'no'}`
    ))
  } catch (e) { results.push(`final read error: ${String(e)}`) }

  // ── 6. Contar campaigns Drizzle ────────────────────────────────────────────
  try {
    const dc = await sql`SELECT COUNT(*) as n FROM campaigns` as Record<string, unknown>[]
    results.push(`campaigns (Drizzle): ${dc[0]?.n} registros`)
  } catch (e) { results.push(`campaigns error: ${String(e)}`) }

  return NextResponse.json({ success: true, alter, results, affiliate_campaigns: campaigns })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
