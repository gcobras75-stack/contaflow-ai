// Cliente Twilio WhatsApp para TrendPilot
// Todos los mensajes automáticos del sistema

const TWILIO_API_URL = 'https://api.twilio.com/2010-04-01'

// Número de WhatsApp del admin Antonio
const ADMIN_PHONE = process.env.ADMIN_WHATSAPP ?? process.env.ADMIN_WHATSAPP_NUMBER ?? '+526675039081'

interface WhatsAppMessage {
  to:       string
  body:     string
  mediaUrl?: string
}

// ─── Función base de envío ────────────────────────────────────────────────────

export async function sendWhatsApp(message: WhatsAppMessage): Promise<string | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_NUMBER

  if (!accountSid || !authToken || !from) {
    console.warn('[Twilio] Variables de entorno no configuradas — mensaje omitido')
    return null
  }

  const formData = new URLSearchParams({
    From: `whatsapp:${from}`,
    To:   `whatsapp:${message.to}`,
    Body: message.body,
  })

  if (message.mediaUrl) {
    formData.append('MediaUrl', message.mediaUrl)
  }

  const response = await fetch(
    `${TWILIO_API_URL}/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:  `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: formData.toString(),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Twilio error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return data.sid as string
}

// ─── Templates de mensajes ────────────────────────────────────────────────────

// 1. Bienvenida a nuevo vendedor
export async function sendVendorWelcome(phone: string, vendorName: string): Promise<string | null> {
  return sendWhatsApp({
    to:   phone,
    body: `Hola ${vendorName} 👋\nTu cuenta *TrendPilot* está activa.\n\nEs completamente *gratis*.\nSolo compartimos el 25% cuando vendemos tus productos.\nSi no vendemos → no pagas nada. 🤝\n\nSube tu primer producto en:\ntrendpilot.marketing/dashboard\n\n¿Tienes dudas? Responde aquí.`,
  })
}

// 2. Producto aprobado
export async function sendProductApproved(phone: string, productName: string): Promise<string | null> {
  return sendWhatsApp({
    to:   phone,
    body: `✅ *${productName}* fue aprobado!\nNuestro equipo lanzará tu campaña en las próximas 24 horas.\nTrendPilot 🧭`,
  })
}

// 3. Producto rechazado
export async function sendProductRejected(phone: string, productName: string, reason: string): Promise<string | null> {
  return sendWhatsApp({
    to:   phone,
    body: `⚠️ *${productName}* necesita ajustes.\nMotivo: ${reason}\nCorrígelo en trendpilot.marketing y vuelve a enviarlo.`,
  })
}

// 4. Campaña pausada (roja) — al vendor
export async function sendCampaignPaused(
  phone:       string,
  productName: string,
  roi:         number,
  suggestion:  string
): Promise<string | null> {
  return sendWhatsApp({
    to:   phone,
    body: `📊 Tu campaña de *${productName}* fue pausada.\nROI actual: ${roi}%\nSugerencia: ${suggestion}\nEntra a trendpilot.marketing para ver el análisis completo.`,
  })
}

// 5. Campaña pausada — al admin
export async function sendCampaignPausedAdmin(
  productName: string,
  vendorName:  string,
  roi:         number
): Promise<string | null> {
  return sendWhatsApp({
    to:   ADMIN_PHONE,
    body: `🔴 Campaña pausada: *${productName}*\nVendor: ${vendorName}\nROI: ${roi}%\nRequiere revisión en TrendPilot`,
  })
}

// 6. Campaña volvió a verde — al vendor
export async function sendCampaignGreen(phone: string, productName: string, roi: number): Promise<string | null> {
  return sendWhatsApp({
    to:   phone,
    body: `🟢 Tu campaña de *${productName}* volvió a funcionar!\nROI: ${roi}%\nSigue así 🚀`,
  })
}

// 7. Alerta de temporada — al vendor
export async function sendSeasonAlert(
  phone:       string,
  seasonName:  string,
  category:    string,
  daysUntil:   number
): Promise<string | null> {
  return sendWhatsApp({
    to:   phone,
    body: `📅 Se acerca *${seasonName}* en ${daysUntil} días!\nEs el mejor momento para *${category}*.\n¿Tienes productos listos?\nEntra a TrendPilot para prepararte.`,
  })
}

// 8. Reporte semanal — al admin (lunes 8am)
export async function sendWeeklyReport(data: {
  commissions:      number
  activeCampaigns:  number
  activeVendors:    number
  topProduct:       string
}): Promise<string | null> {
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n / 100)
  return sendWhatsApp({
    to:   ADMIN_PHONE,
    body: `📊 Resumen semana *TrendPilot*:\n💰 Comisiones: ${fmt(data.commissions)}\n🟢 Campañas activas: ${data.activeCampaigns}\n👥 Vendors activos: ${data.activeVendors}\n🔥 Mejor producto: ${data.topProduct}`,
  })
}

// 9. Alerta EarlySignal — al admin
export async function sendEarlySignalAlert(
  keyword:     string,
  opportunity: string,
  windowWeeks: number
): Promise<string | null> {
  return sendWhatsApp({
    to:   ADMIN_PHONE,
    body: `⚡ Oportunidad temprana: *${keyword}*\nOportunidad: ${opportunity}\nVentana: ~${windowWeeks} semanas\nEntra a TrendPilot para actuar rápido`,
  })
}

// 10. Mensaje manual (admin → vendor)
export async function sendManualMessage(phone: string, message: string): Promise<string | null> {
  return sendWhatsApp({ to: phone, body: message })
}
