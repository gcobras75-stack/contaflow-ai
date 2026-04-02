/**
 * middleware.ts — Protección de rutas ContaFlow AI
 *
 * NOTA: En Next.js 16, middleware.ts está deprecado en favor de proxy.ts.
 * Sigue funcionando con advertencia. Migrar con:
 *   npx @next/codemod@latest middleware-to-proxy
 *
 * Lógica:
 *  1. Sin sesión → /login  (para /dashboard, /admin, /onboarding)
 *  2. /admin sin rol superadmin → /dashboard
 *
 * La verificación de empresa suspendida se hace en cada página del dashboard
 * con una consulta a suscripciones, ya que depende del contexto de la empresa
 * seleccionada y no puede resolverse a nivel de middleware sin conocer empresa_id.
 */
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  // Optimistic check: getSession() valida el JWT desde la cookie sin
  // hacer llamadas de red. Es suficiente para proteger rutas en el proxy.
  // La verificación real del usuario se hace en cada Server Component/Route Handler.
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // 1. Sin sesión → redirigir a /login
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Rutas /admin → verificar superadmin desde el JWT (sin red)
  // El rol se guarda en app_metadata.rol por el trigger de Supabase,
  // pero como fallback leemos el claim del JWT.
  if (pathname.startsWith('/admin')) {
    // Leemos el payload del JWT decodificado que ya está en la sesión
    const userRole = (session.user.app_metadata?.rol as string) ||
                     (session.user.user_metadata?.rol as string);
    if (userRole && userRole !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Si no hay rol en el JWT (tabla externa), dejamos pasar y
    // el layout de /admin hace la verificación completa con Supabase.
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/onboarding',
  ],
};
