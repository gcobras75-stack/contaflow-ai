import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// Cargar .env.local para que db:generate y db:migrate funcionen en desarrollo
dotenv.config({ path: '.env.local' })

export default defineConfig({
  schema:  './src/lib/schema.ts',
  out:     './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
