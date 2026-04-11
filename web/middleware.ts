/**
 * middleware.ts — Protección de rutas ContaFlow AI
 *
 * NOTA: En Next.js 16, middleware.ts está deprecado en favor de proxy.ts.
 * Sigue funcionando con advertencia. Migrar con:
 *   npx @next/codemod@latest middleware-to-proxy
 * (Deuda técnica — el codemod se aplica cuando estés listo para Next 16+.)
 *
 * Lógica:
 *  1. Sin sesión                     → /login
 *  2. /admin sin rol superadmin       → /dashboard
 *  3. /dashboard sin suscripción      → /suspendida
 *     operable del despacho
 */
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

// Rutas bajo /dashboard que el contador DEBE poder visitar incluso con el
// despacho sin suscripciones operables — para pagar y reactivar su cuenta.
// /dashboard/configuracion y /dashboard/billing permiten checkout Mercado Pago.
const RUTAS_EXCENTAS_SUSPENSION = [
  '/dashboard/configuracion',
  '/dashboard/billing',
];

type SuscripcionRow = {
  status:         string | null;
  trial_ends_at:  string | null;
};

/**
 * Evalúa si el despacho tiene al menos una suscripción operable.
 * Operable = status 'activa' O ('trial' con trial_ends_at en el futuro).
 *
 * - 0 filas → true (despacho recién creado sin clientes aún — no bloquear).
 * - ≥1 fila pero ninguna operable → false (todo suspendido/vencido/cancelado).
 */
function tieneSuscripcionOperable(rows: SuscripcionRow[] | null): boolean {
  if (!rows || rows.length === 0) return true;
  const ahora = Date.now();
  return rows.some(s => {
    if (s.status === 'activa') return true;
    if (s.status === 'trial') {
      if (!s.trial_ends_at) return true;
      return new Date(s.trial_ends_at).getTime() > ahora;
    }
    return false;
  });
}

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
    const userRole = (session.user.app_metadata?.rol as string) ||
                     (session.user.user_metadata?.rol as string);
    if (userRole && userRole !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Si no hay rol en el JWT (tabla externa), dejamos pasar y
    // el layout de /admin hace la verificación completa con Supabase.
  }

  // 3. Rutas /dashboard/* → verificar que el despacho tiene al menos una
  //    suscripción operable. Deja pasar rutas de billing/configuración para
  //    que el contador pueda pagar y reactivar aunque todo esté suspendido.
  if (pathname.startsWith('/dashboard')) {
    const esExenta = RUTAS_EXCENTAS_SUSPENSION.some(r => pathname.startsWith(r));
    if (!esExenta) {
      try {
        // Query filtrada por RLS: contador_suscripciones_select solo devuelve
        // las suscripciones del despacho del usuario autenticado. No necesito
        // hacer join con usuarios — la RLS se encarga.
        const { data: suscripciones, error } = await supabase
          .from('suscripciones')
          .select('status, trial_ends_at');

        if (error) {
          // Fail-open: si la BD está flaky, prefiero dejar pasar al contador
          // legítimo que lockearlo afuera. El incidente queda en logs.
          console.error('[middleware] suscripciones query error:', error.message);
        } else if (!tieneSuscripcionOperable(suscripciones as SuscripcionRow[])) {
          const url = new URL('/suspendida', request.url);
          url.searchParams.set('from', pathname);
          return NextResponse.redirect(url);
        }
      } catch (e) {
        // Misma política fail-open para excepciones inesperadas.
        console.error('[middleware] suscripciones check excepción:', e);
      }
    }
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
