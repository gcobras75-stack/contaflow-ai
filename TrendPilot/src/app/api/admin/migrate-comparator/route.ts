// Migración DDL — crea la tabla affiliate_clicks en Neon
// Idempotente — se puede llamar múltiples veces de forma segura
// Protegido por WORKER_SECRET o SEED_SECRET

import { NextResponse } from 'next/server'
import { neon }         from '@neondatabase/serverless'

export async function POST(request: Request): Promise<NextResponse> {
  const secret = request.headers.get('x-worker-secret')
  if (!secret || secret !== process.env.WORKER_SECRET) {
    const seedSecret = request.headers.get('x-seed-secret')
    if (!seedSecret || seedSecret !== process.env.SEED_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL no configurada' }, { status: 500 })
  }

  const sql = neon(process.env.DATABASE_URL)
  const results: string[] = []

  try {
    // Crear tabla affiliate_clicks si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS affiliate_clicks (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_slug          TEXT NOT NULL,
        platform_chosen       TEXT,
        time_on_page_seconds  INTEGER,
        cards_hovered         INTEGER NOT NULL DEFAULT 0,
        faq_opened            BOOLEAN NOT NULL DEFAULT FALSE,
        profile_selected      TEXT,
        affiliate_url_clicked TEXT,
        session_id            TEXT,
        device_type           TEXT,
        created_at            TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    results.push('✅ Tabla affiliate_clicks creada o ya existente')

    // Índices
    await sql`CREATE INDEX IF NOT EXISTS affiliate_clicks_slug_idx    ON affiliate_clicks (product_slug)`
    await sql`CREATE INDEX IF NOT EXISTS affiliate_clicks_created_idx ON affiliate_clicks (created_at)`
    results.push('✅ Índices creados o ya existentes')

    return NextResponse.json({ ok: true, results })
  } catch (err) {
    console.error('[migrate-comparator] Error:', err)
    return NextResponse.json({ ok: false, error: String(err), results }, { status: 500 })
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  return POST(request)
}
