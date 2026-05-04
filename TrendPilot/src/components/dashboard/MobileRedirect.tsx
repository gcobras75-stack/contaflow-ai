'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// Redirige automáticamente a /dashboard/mobile si el viewport es < 1024px
// Se omite si ya estamos en la ruta mobile para evitar bucle infinito
export function MobileRedirect() {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname.startsWith('/dashboard/mobile')) return
    if (window.innerWidth < 1024) {
      router.replace('/dashboard/mobile')
    }
  }, [pathname, router])

  return null
}
