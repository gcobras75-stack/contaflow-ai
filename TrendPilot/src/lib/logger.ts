// Logger de seguridad para TrendPilot
// En producción → Railway logs (stdout/stderr)
// En desarrollo → console

type LogLevel = 'info' | 'warn' | 'error' | 'security'

interface SecurityEvent {
  event: string
  userId?: string
  vendorId?: string
  ip?: string
  details?: Record<string, unknown>
}

function formatLog(level: LogLevel, data: SecurityEvent): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: 'trendpilot',
    ...data,
  })
}

// Login exitoso
export function logLoginSuccess(userId: string, ip: string): void {
  console.log(formatLog('security', {
    event: 'login_success',
    userId,
    ip,
  }))
}

// Login fallido
export function logLoginFailed(email: string, ip: string, reason: string): void {
  console.warn(formatLog('security', {
    event: 'login_failed',
    ip,
    details: { email_domain: email.split('@')[1], reason },
    // NUNCA loguear el email completo ni la contraseña
  }))
}

// Cambio en campaña
export function logCampaignChange(
  campaignId: string,
  action: string,
  userId: string,
  details?: Record<string, unknown>
): void {
  console.log(formatLog('security', {
    event: 'campaign_change',
    userId,
    details: { campaignId, action, ...details },
  }))
}

// Pago procesado
export function logPaymentProcessed(
  transferId: string,
  amount: number,
  vendorId: string
): void {
  console.log(formatLog('security', {
    event: 'payment_processed',
    vendorId,
    details: { transferId, amount },
  }))
}

// Acceso no autorizado
export function logUnauthorizedAccess(ip: string, path: string, reason: string): void {
  console.warn(formatLog('security', {
    event: 'unauthorized_access',
    ip,
    details: { path, reason },
  }))
}

// Rate limit superado
export function logRateLimitExceeded(ip: string, endpoint: string): void {
  console.warn(formatLog('security', {
    event: 'rate_limit_exceeded',
    ip,
    details: { endpoint },
  }))
}

// Webhook con firma inválida
export function logInvalidWebhook(ip: string, reason: string): void {
  console.error(formatLog('security', {
    event: 'invalid_webhook_signature',
    ip,
    details: { reason },
  }))
}

// Error genérico de servidor (sin stack trace sensible)
export function logServerError(error: unknown, context?: string): void {
  const message = error instanceof Error ? error.message : 'Error desconocido'
  console.error(formatLog('error', {
    event: 'server_error',
    details: {
      context,
      // En producción solo el mensaje, nunca el stack completo
      message: process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : message,
    },
  }))
}
