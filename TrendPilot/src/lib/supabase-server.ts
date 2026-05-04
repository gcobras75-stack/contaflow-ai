import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente Supabase para uso en Server Components, Server Actions y Route Handlers.
// Utiliza el patrón getAll/setAll requerido por @supabase/ssr ≥ 0.5
export async function createSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Leer todas las cookies del request
        getAll() {
          return cookieStore.getAll()
        },
        // Escribir cookies en la respuesta
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll puede lanzar en Server Components (read-only context).
            // Se ignora: el middleware se encarga de refrescar las cookies.
          }
        },
      },
    }
  )
}

// Cliente con SERVICE ROLE para operaciones privilegiadas (crear usuarios, admin).
// NUNCA exponer este cliente al navegador.
export function createServiceClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
