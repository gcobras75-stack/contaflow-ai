// GET /api/admin/db-check — Diagnóstico de tablas en Neon (solo superadmin)
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { verifyAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()
  if (auth.role !== 'superadmin' && auth.role !== 'admin') return forbiddenResponse()

  const sql = neon(process.env.DATABASE_URL!)
  const results: Record<string, unknown> = {}

  // 1. Tablas existentes
  try {
    results.tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `
  } catch (e) { results.tables_error = String(e) }

  // 2. Campañas afiliadas
  try {
    results.affiliate_campaigns = await sql`
      SELECT id, product_name, status, platform,
             spend_total_mxn, revenue_generated, commission_earned,
             roi_percentage, clicks, conversions, created_at
      FROM affiliate_campaigns ORDER BY created_at DESC
    `
  } catch (e) { results.affiliate_campaigns_error = String(e) }

  // 3. image_url en affiliate_campaigns
  try {
    results.affiliate_images = await sql`
      SELECT id, product_name, image_url FROM affiliate_campaigns
    `
  } catch (e) { results.affiliate_images_error = String(e) }

  // 4. Campañas en tabla campaigns (Drizzle)
  try {
    results.campaigns = await sql`
      SELECT id, name, status, platform, semaphore_color,
             budget_spent, sales_generated, created_at
      FROM campaigns ORDER BY created_at DESC
    `
  } catch (e) { results.campaigns_error = String(e) }

  // 5. affiliate_products
  try {
    results.affiliate_products = await sql`
      SELECT id, name, image_url, platform, price_mxn, affiliate_url
      FROM affiliate_products LIMIT 10
    `
  } catch (e) { results.affiliate_products_error = String(e) }

  return NextResponse.json(results, { status: 200 })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
