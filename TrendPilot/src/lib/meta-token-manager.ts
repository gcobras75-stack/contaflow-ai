// Meta Token Manager — verifica si el token de Meta Ads es válido
// y provee estado detallado para el dashboard

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0'

export interface TokenStatus {
  valid:           boolean
  app_id?:         string
  user_id?:        string
  expires_at?:     number   // unix timestamp
  hours_remaining?: number
  scopes?:         string[]
  error?:          string
  checked_at:      number   // unix timestamp
}

export async function checkMetaToken(): Promise<TokenStatus> {
  const token = process.env.META_ADS_ACCESS_TOKEN
  if (!token) {
    return { valid: false, error: 'META_ADS_ACCESS_TOKEN no configurado', checked_at: Date.now() }
  }

  try {
    const res = await fetch(
      `${META_GRAPH_URL}/debug_token?input_token=${token}&access_token=${token}`,
      { signal: AbortSignal.timeout(8000) },
    )

    if (!res.ok) {
      return { valid: false, error: `HTTP ${res.status}`, checked_at: Date.now() }
    }

    const json = await res.json()
    const data = json.data

    if (!data?.is_valid) {
      return {
        valid:      false,
        error:      data?.error?.message ?? 'Token inválido o expirado',
        checked_at: Date.now(),
      }
    }

    const expiresAt = data.expires_at ?? 0
    const now       = Math.floor(Date.now() / 1000)
    const hoursLeft = expiresAt > 0 ? Math.floor((expiresAt - now) / 3600) : undefined

    return {
      valid:           true,
      app_id:          String(data.app_id ?? ''),
      user_id:         String(data.user_id ?? ''),
      expires_at:      expiresAt > 0 ? expiresAt : undefined,
      hours_remaining: hoursLeft,
      scopes:          data.scopes ?? [],
      checked_at:      Date.now(),
    }
  } catch (err) {
    return { valid: false, error: String(err).slice(0, 120), checked_at: Date.now() }
  }
}

// Semáforo visual para el token
export function tokenSemaphore(status: TokenStatus): 'green' | 'yellow' | 'red' {
  if (!status.valid) return 'red'
  if (status.hours_remaining !== undefined && status.hours_remaining < 24) return 'yellow'
  if (status.hours_remaining !== undefined && status.hours_remaining < 72) return 'yellow'
  return 'green'
}
