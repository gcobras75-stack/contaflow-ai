/**
 * Seed: crea el usuario admin inicial de TrendPilot.
 * Uso: npm run db:seed
 * Requiere DATABASE_URL en .env.local
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as bcrypt from 'bcryptjs'
import * as schema from '../lib/schema'

const ADMIN_EMAIL    = 'antonio@automatia.mx'
const ADMIN_NAME     = 'Antonio'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'TrendPilot2025!'

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL no configurado en .env.local')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)
  const db  = drizzle(sql, { schema })

  // Verificar si ya existe
  const existing = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.email, ADMIN_EMAIL))
    .limit(1)

  if (existing.length > 0) {
    console.log(`✅  Admin ya existe: ${ADMIN_EMAIL}`)
    process.exit(0)
  }

  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  const [profile] = await db
    .insert(schema.profiles)
    .values({
      email:         ADMIN_EMAIL,
      name:          ADMIN_NAME,
      password_hash,
      role:          'admin',
      vendor_id:     null,
    })
    .returning()

  console.log(`✅  Admin creado:`)
  console.log(`    Email:    ${profile.email}`)
  console.log(`    Nombre:   ${profile.name}`)
  console.log(`    Role:     ${profile.role}`)
  console.log(`    Password: ${ADMIN_PASSWORD}`)
  console.log(`\n⚠️   Cambia la contraseña en producción.`)
}

main().catch((err) => {
  console.error('❌  Error en seed:', err)
  process.exit(1)
})
