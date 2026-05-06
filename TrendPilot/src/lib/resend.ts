// Resend — Emails transaccionales de TrendPilot
// API: https://api.resend.com
// Requiere RESEND_API_KEY en variables de entorno
// Sin credenciales: log en consola (dev mode)
//
// Templates premium en src/emails/templates.ts

import {
  emailVendorWelcome,
  emailProductApproved,
  emailProductRejected,
  emailWeeklyVendor,
  emailWeeklyAdmin,
  emailContractSent,
  emailContractSigned,
} from '@/emails/templates'

const RESEND_URL = 'https://api.resend.com/emails'
// Usar dominio verificado en Resend: resend.com/domains
const FROM       = 'TrendPilot <noreply@trendpilot.marketing>'
const ADMIN_EMAIL = 'antonio@automatia.mx'

// ─── Envío base ───────────────────────────────────────────────────────────────

export async function send(to: string, subject: string, html: string): Promise<string | null> {
  const key = process.env.RESEND_API_KEY

  if (!key) {
    console.log(`[Resend DEV] To: ${to} | Subject: ${subject}`)
    console.log('[Resend DEV] HTML length:', html.length)
    return null
  }

  try {
    const res = await fetch(RESEND_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body:    JSON.stringify({ from: FROM, to, subject, html }),
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

// ─── Funciones exportadas ─────────────────────────────────────────────────────

export async function sendVendorWelcome(to: string, vendor_name: string): Promise<string | null> {
  const { subject, html } = emailVendorWelcome({ vendor_name })
  return send(to, subject, html)
}

export async function sendContractSent(to: string, vendor_name: string, sign_url: string): Promise<string | null> {
  const { subject, html } = emailContractSent({ vendor_name, sign_url })
  return send(to, subject, html)
}

export async function sendContractSigned(to: string, vendor_name: string): Promise<string | null> {
  const { subject, html } = emailContractSigned({ vendor_name })
  return send(to, subject, html)
}

export async function sendProductApproved(to: string, params: {
  vendor_name:  string
  product_name: string
  score:        number
}): Promise<string | null> {
  const { subject, html } = emailProductApproved(params)
  return send(to, subject, html)
}

export async function sendProductRejected(to: string, params: {
  vendor_name:  string
  product_name: string
  reason:       string
  suggestions:  string[]
}): Promise<string | null> {
  const { subject, html } = emailProductRejected(params)
  return send(to, subject, html)
}

export async function sendWeeklyVendor(to: string, params: {
  vendor_name:     string
  week_sales:      number
  prev_week_sales: number
  commissions:     number
  top_campaign:    string
  ai_tip:          string
}): Promise<string | null> {
  const { subject, html } = emailWeeklyVendor(params)
  return send(to, subject, html)
}

export async function sendWeeklyAdmin(params: {
  week_commissions: number
  growth_fund:      number
  active_vendors:   number
  top_products:     string[]
  alerts:           string[]
}): Promise<string | null> {
  const { subject, html } = emailWeeklyAdmin(params)
  return send(ADMIN_EMAIL, subject, html)
}

// Alias para compatibilidad con código existente
export {
  emailVendorWelcome,
  emailProductApproved,
  emailProductRejected,
  emailContractSent,
  emailContractSigned,
}
