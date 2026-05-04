import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logUnauthorizedAccess } from './logger'
import { checkRateLimit, getClientIP, RATE_LIMITS } from './ratelimit'

type RateLimitKey = keyof typeof RATE_LIMITS

// Verifica autenticación en cada API route
// Retorna { userId, vendorId } si válido, o null si inválido
export async function verifyAuth(request: Request): Promise<{
  userId: string
  role: string
  vendorId?: string
} | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    logUnauthorizedAccess(getClientIP(request), new URL(request.url).pathname, 'missing_token')
    return null
  }

  const token = authHeader.slice(7)

  try {
    // Usar cliente con anon key para verificar el JWT del usuario
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      logUnauthorizedAccess(getClientIP(request), new URL(request.url).pathname, 'invalid_token')
      return null
    }

    // Obtener rol del usuario desde profiles usando service client
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role, vendor_id')
      .eq('id', user.id)
      .single()

    return {
      userId: user.id,
      role: profile?.role ?? 'vendor',
      vendorId: profile?.vendor_id ?? undefined,
    }
  } catch {
    logUnauthorizedAccess(getClientIP(request), new URL(request.url).pathname, 'token_verification_failed')
    return null
  }
}

// Respuesta 401 estándar — sin detalles que ayuden a atacantes
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'No autorizado' },
    { status: 401 }
  )
}

// Respuesta 403 estándar
export function forbiddenResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Acceso denegado' },
    { status: 403 }
  )
}

// Respuesta 429 estándar
export function rateLimitResponse(resetAt: number): NextResponse {
  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Intenta más tarde.' },
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
        'X-RateLimit-Reset': resetAt.toString(),
      },
    }
  )
}

// Respuesta de error genérica para producción
export function serverErrorResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Error interno del servidor' },
    { status: 500 }
  )
}

// Respuesta 400 con detalle de validación
export function validationErrorResponse(message: string): NextResponse {
  return NextResponse.json(
    { error: 'Datos inválidos', details: message },
    { status: 400 }
  )
}

// Guard completo: auth + rate limit en un solo helper
export async function guardRoute(
  request: Request,
  endpoint: RateLimitKey = 'default'
): Promise<{ auth: { userId: string; role: string; vendorId?: string } } | NextResponse> {
  const ip = getClientIP(request)
  const path = new URL(request.url).pathname

  // 1. Rate limit
  const rl = checkRateLimit(`${ip}:${path}`, RATE_LIMITS[endpoint])
  if (!rl.allowed) {
    logUnauthorizedAccess(ip, path, 'rate_limit_exceeded')
    return rateLimitResponse(rl.resetAt)
  }

  // 2. Autenticación
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()

  return { auth }
}
