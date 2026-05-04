import { auth } from './auth'
import { NextResponse } from 'next/server'
import { logUnauthorizedAccess } from './logger'
import { checkRateLimit, getClientIP, RATE_LIMITS } from './ratelimit'

type RateLimitKey = keyof typeof RATE_LIMITS

// Verifica autenticación en cada API route usando la sesión NextAuth (cookie JWT)
export async function verifyAuth(_request: Request): Promise<{
  userId:   string
  role:     string
  vendorId?: string
} | null> {
  try {
    const session = await auth()
    if (!session?.user?.id) return null
    return {
      userId:   session.user.id,
      role:     session.user.role ?? 'vendor',
      vendorId: session.user.vendorId,
    }
  } catch {
    logUnauthorizedAccess(
      getClientIP(_request),
      new URL(_request.url).pathname,
      'session_verification_failed'
    )
    return null
  }
}

// Respuesta 401 estándar — sin detalles que ayuden a atacantes
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

// Respuesta 403 estándar
export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
}

// Respuesta 429 estándar
export function rateLimitResponse(resetAt: number): NextResponse {
  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Intenta más tarde.' },
    {
      status: 429,
      headers: {
        'Retry-After':       Math.ceil((resetAt - Date.now()) / 1000).toString(),
        'X-RateLimit-Reset': resetAt.toString(),
      },
    }
  )
}

// Respuesta de error genérica para producción
export function serverErrorResponse(): NextResponse {
  return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
}

// Respuesta 400 con detalle de validación
export function validationErrorResponse(message: string): NextResponse {
  return NextResponse.json({ error: 'Datos inválidos', details: message }, { status: 400 })
}

// Guard completo: auth + rate limit en un solo helper
export async function guardRoute(
  request: Request,
  endpoint: RateLimitKey = 'default'
): Promise<{ auth: { userId: string; role: string; vendorId?: string } } | NextResponse> {
  const ip   = getClientIP(request)
  const path = new URL(request.url).pathname

  // 1. Rate limit
  const rl = checkRateLimit(`${ip}:${path}`, RATE_LIMITS[endpoint])
  if (!rl.allowed) {
    logUnauthorizedAccess(ip, path, 'rate_limit_exceeded')
    return rateLimitResponse(rl.resetAt)
  }

  // 2. Autenticación
  const authResult = await verifyAuth(request)
  if (!authResult) return unauthorizedResponse()

  return { auth: authResult }
}
