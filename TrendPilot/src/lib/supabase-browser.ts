'use client'

import { createBrowserClient } from '@supabase/ssr'

// Cliente Supabase para uso en Client Components.
// Singleton por tab — createBrowserClient ya gestiona la instancia.
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
