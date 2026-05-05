import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Rutas accesibles sin sesión activa
const PUBLIC_PATHS = ['/login', '/register', '/api/webhook-mp', '/api/auth', '/p/']

// Solo superadmin puede acceder a estas rutas
const SUPERADMIN_PATHS = ['/dashboard/franquicia', '/dashboard/setup/google-ads', '/dashboard/campaigns/first-run']

// Admin o superadmin — supervisor y vendor no pueden entrar
const ADMIN_PATHS = ['/dashboard/settings', '/dashboard/test', '/dashboard/launch-checklist']

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Permitir assets estáticos
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Las rutas de API manejan su propia autenticación con verifyAuth()
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Permitir rutas públicas de UI
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Sin sesión NextAuth → redirigir al login conservando la ruta de destino
  if (!req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = req.auth.user?.role ?? 'vendor'

  // Rutas exclusivas de superadmin
  if (SUPERADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Rutas de admin o superadmin (supervisor y vendor bloqueados)
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
