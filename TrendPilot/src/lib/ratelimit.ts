// Rate limiting simple por IP + endpoint
// En producción con alta carga → upgradar a Upstash Redis
// Para Vercel serverless: cada instancia tiene su propio Map (no persistido)
// Es suficiente para MVP — bloquea ataques de fuerza bruta por instancia

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Store en memoria — no persiste entre invocaciones serverless
// Suficiente para protección básica en MVP
const store = new Map<string, RateLimitEntry>()

// Limpiar entradas expiradas cada 5 minutos para evitar leak de memoria
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((entry, key) => {
      if (entry.resetAt < now) store.delete(key)
    })
  }, 5 * 60 * 1000)
}

interface RateLimitOptions {
  maxRequests: number  // máximo de requests permitidos
  windowMs: number     // ventana de tiempo en milisegundos
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  identifier: string,  // IP + endpoint
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const key = identifier
  const entry = store.get(key)

  // Si no hay entrada o ya expiró, crear nueva
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + options.windowMs,
    }
    store.set(key, newEntry)
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: newEntry.resetAt,
    }
  }

  // Incrementar contador
  entry.count += 1

  if (entry.count > options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

// Límites predefinidos por endpoint
export const RATE_LIMITS = {
  trends:    { maxRequests: 10, windowMs: 60_000 },   // 10/min
  campaigns: { maxRequests: 20, windowMs: 60_000 },   // 20/min
  vendors:   { maxRequests: 30, windowMs: 60_000 },   // 30/min
  webhook:   { maxRequests: 100, windowMs: 60_000 },  // 100/min (alto para MP)
  default:   { maxRequests: 30, windowMs: 60_000 },   // 30/min por defecto
} as const

// Obtener IP del request de Next.js
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
