// Endpoint de inicialización: crea/actualiza los 3 usuarios del sistema
// Protegido por WORKER_SECRET (cabecera x-worker-secret)
// Idempotente — se puede llamar múltiples veces de forma segura

import { NextResponse } from 'next/server'
import { neon }         from '@neondatabase/serverless'
import bcrypt           from 'bcryptjs'

interface SeedUser {
  name:     string
  email:    string
  password: string
  role:     string
  region:   string | null
}

const SEED_USERS: SeedUser[] = [
  {
    name:     'Antonio Gutierrez',
    email:    'antonio@automatia.mx',
    password: 'TrendPilot2026*',
    role:     'superadmin',
    region:   null,          // superadmin ve todas las regiones
  },
  {
    name:     'Manuel Gutierrez',
    email:    'manuel@trendpilot.marketing',
    password: 'ManuelTP2026*',
    role:     'admin',
    region:   'sinaloa',
  },
  {
    name:     'Andrea Gutierrez',
    email:    'andrea@trendpilot.marketing',
    password: 'AndreaTP2026*',
    role:     'supervisor',
    region:   'sureste',
  },
]

export async function POST(request: Request): Promise<NextResponse> {
  // Verificación con el mismo secret del worker Railway
  const secret = request.headers.get('x-worker-secret')
  if (!secret || secret !== process.env.WORKER_SECRET) {
    // Fallback: verificar con SEED_SECRET si existe
    const seedSecret = request.headers.get('x-seed-secret')
    if (!seedSecret || seedSecret !== process.env.SEED_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL no configurada' }, { status: 500 })
  }

  const sql = neon(process.env.DATABASE_URL)
  const results: Array<{ email: string; action: string; error?: string }> = []

  try {
    // ── 1. Agregar valores al enum user_role si no existen ────────────────────
    // PostgreSQL 12+ permite ALTER TYPE ... ADD VALUE IF NOT EXISTS
    await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin'`
    await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor'`

    // ── 2. Agregar columna region a profiles si no existe ─────────────────────
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region text`
  } catch (err) {
    // Si falla la migración DDL, reportar pero continuar
    console.error('[seed-users] DDL error:', err)
    results.push({ email: 'DDL', action: 'error', error: String(err) })
  }

  // ── 3. Crear o actualizar cada usuario ────────────────────────────────────
  for (const user of SEED_USERS) {
    try {
      const hash = await bcrypt.hash(user.password, 12)

      // Verificar si existe
      const existing = await sql`
        SELECT id FROM profiles WHERE email = ${user.email} LIMIT 1
      `

      if (existing.length > 0) {
        // Actualizar contraseña, rol y región
        await sql`
          UPDATE profiles
          SET password_hash = ${hash},
              name          = ${user.name},
              role          = ${user.role},
              region        = ${user.region}
          WHERE email = ${user.email}
        `
        results.push({ email: user.email, action: 'updated' })
      } else {
        // Insertar nuevo usuario (sin vendor_id — son admins/supervisores)
        await sql`
          INSERT INTO profiles (email, password_hash, name, role, region)
          VALUES (${user.email}, ${hash}, ${user.name}, ${user.role}, ${user.region})
        `
        results.push({ email: user.email, action: 'created' })
      }
    } catch (err) {
      console.error(`[seed-users] Error con ${user.email}:`, err)
      results.push({ email: user.email, action: 'error', error: String(err) })
    }
  }

  return NextResponse.json({
    ok: true,
    message: 'Seed completado',
    results,
  })
}

// También acepta GET para facilitar llamadas desde el navegador con header personalizado
export async function GET(request: Request): Promise<NextResponse> {
  return POST(request)
}
