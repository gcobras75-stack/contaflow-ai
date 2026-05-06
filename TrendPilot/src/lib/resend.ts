// Resend — Emails transaccionales de TrendPilot
// Usa @react-email/components para templates React
// Fallback a raw HTML si React Email no renderiza

import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

// Mientras el dominio se verifica en Resend, usar onboarding@resend.dev
// Cuando esté verificado: cambia RESEND_DOMAIN_VERIFIED=true en Vercel
export const FROM_EMAIL = process.env.RESEND_DOMAIN_VERIFIED === 'true'
  ? 'TrendPilot <noreply@trendpilot.marketing>'
  : 'TrendPilot <onboarding@resend.dev>'

export const ADMIN_EMAIL = 'antonio@automatia.mx'

export const OPERADORES: Record<string, string> = {
  sinaloa:     'manuel@trendpilot.marketing',
  occidente:   'jose@trendpilot.marketing',
  guadalajara: 'ximena@trendpilot.marketing',
  sureste:     'andrea@trendpilot.marketing',
  centro:      'gerardo@trendpilot.marketing',
  norte:       'santiago@trendpilot.marketing',
}

// ── Envío base (mantiene compatibilidad con código existente) ─────────────────

const RESEND_URL = 'https://api.resend.com/emails'

export async function send(to: string, subject: string, html: string): Promise<string | null> {
  const key = process.env.RESEND_API_KEY

  if (!key) {
    console.log(`[Resend DEV] To: ${to} | Subject: ${subject}`)
    return null
  }

  try {
    const res = await fetch(RESEND_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body:    JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[Resend] Error:', err)
      return null
    }

    const data = await res.json()
    return data.id as string
  } catch (err) {
    console.error('[Resend] Network error:', err)
    return null
  }
}

// ── Re-exportar compatibilidad con código antiguo ─────────────────────────────
export * from '@/emails/templates'
