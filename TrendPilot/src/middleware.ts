import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Rutas accesibles sin sesión activa
const PUBLIC_PATHS = ['/login', '/register', '/api/webhook-mp']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir assets estáticos y archivos con extensión (imágenes, fuentes, etc.)
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Las rutas de API manejan su propia autenticación con verifyAuth() de api-auth.ts
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Permitir rutas públicas de UI sin verificación de sesión
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Crear la respuesta base — Supabase SSR necesita mutar las cookies en ella
  const supabaseResponse = NextResponse.next({ request })

  // Crear cliente SSR con el patrón getAll/setAll
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Escribir en el request (para lecturas downstream) y en la response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Usar getUser() en lugar de getSession() — valida el JWT en el servidor
  // getSession() solo lee la cookie sin verificar la firma; menos seguro
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Sin sesión válida → redirigir al login conservando la ruta de destino
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Siempre devolver supabaseResponse para que las cookies de sesión se propaguen
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
