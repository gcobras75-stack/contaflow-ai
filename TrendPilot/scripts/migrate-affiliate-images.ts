/**
 * Agrega columna image_url a affiliate_campaigns y asigna imágenes por keyword.
 * Uso: npx tsx scripts/migrate-affiliate-images.ts
 */
import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

// Busca DATABASE_URL en .env.local o .env.temp (Vercel pull)
dotenv.config({ path: '.env.local' })
if (!process.env.DATABASE_URL) dotenv.config({ path: '.env.temp' })

const IMAGES: Array<{ keywords: string[]; url: string }> = [
  { keywords: ['airfryer', 'freidora'],       url: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=300&q=80' },
  { keywords: ['smartwatch', 'reloj'],        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80' },
  { keywords: ['teclado'],                    url: 'https://images.unsplash.com/photo-1601445638532-3c6f6c3aa1d6?w=300&q=80' },
  { keywords: ['vitamina', 'suero', 'serum'], url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&q=80' },
  { keywords: ['gps', 'mascota', 'perro'],    url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&q=80' },
]

function getImageUrl(productName: string): string | null {
  const lower = productName.toLowerCase()
  for (const { keywords, url } of IMAGES) {
    if (keywords.some((k) => lower.includes(k))) return url
  }
  return null
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no configurada en .env.local')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)

  console.log('🔧 Agregando columna image_url...')
  await sql`ALTER TABLE affiliate_campaigns ADD COLUMN IF NOT EXISTS image_url TEXT`
  console.log('✓ Columna lista\n')

  const rows = await sql`SELECT id, product_name FROM affiliate_campaigns`
  console.log(`📋 ${rows.length} campañas encontradas:\n`)

  for (const row of rows) {
    const name = String(row.product_name)
    const url  = getImageUrl(name)
    if (url) {
      await sql`UPDATE affiliate_campaigns SET image_url = ${url} WHERE id = ${row.id}`
      console.log(`  ✓ ${name}\n    → ${url}`)
    } else {
      console.log(`  - ${name} → sin imagen (usará emoji)`)
    }
  }

  console.log('\n✅ Migración completa')
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
