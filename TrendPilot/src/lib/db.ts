import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL no configurada. Agrega tu Neon connection string en .env.local\n' +
    'Ejemplo: DATABASE_URL=postgresql://usuario:password@host/db?sslmode=require'
  )
}

const sql = neon(process.env.DATABASE_URL)
export const db = drizzle(sql, { schema })
