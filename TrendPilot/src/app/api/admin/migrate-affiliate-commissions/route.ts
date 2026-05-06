// POST /api/admin/migrate-affiliate-commissions?token=tp-commissions-2026
// Crea la tabla affiliate_commissions en Neon con índices
// One-shot migration — idempotente (IF NOT EXISTS)

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function POST(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token')
  if (token !== 'tp-commissions-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sql = neon(process.env.DATABASE_URL!)

  try {
    // Crear tabla
    await sql`
      CREATE TABLE IF NOT EXISTS affiliate_commissions (
        id               SERIAL PRIMARY KEY,
        campaign_id      INTEGER,
        network          VARCHAR(50)    NOT NULL,
        transaction_id   VARCHAR(200)   UNIQUE,
        product_name     VARCHAR(300),
        sale_amount      DECIMAL(10,2)  DEFAULT 0,
        commission_rate  DECIMAL(5,2)   DEFAULT 0,
        commission_amount DECIMAL(10,2) DEFAULT 0,
        status           VARCHAR(50)    DEFAULT 'pending',
        click_date       TIMESTAMP,
        sale_date        TIMESTAMP,
        approval_date    TIMESTAMP,
        region           VARCHAR(100),
        operator_share   DECIMAL(10,2)  DEFAULT 0,
        antonio_share    DECIMAL(10,2)  DEFAULT 0,
        raw_data         JSONB,
        created_at       TIMESTAMP DEFAULT NOW()
      )
    `

    // Índices
    await sql`
      CREATE INDEX IF NOT EXISTS idx_commissions_network
        ON affiliate_commissions(network)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_commissions_status
        ON affiliate_commissions(status)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_commissions_sale_date
        ON affiliate_commissions(sale_date)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_commissions_campaign
        ON affiliate_commissions(campaign_id)
    `

    return NextResponse.json({
      ok: true,
      message: 'Tabla affiliate_commissions creada correctamente',
    })
  } catch (err) {
    console.error('[migrate-affiliate-commissions]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
