// POST /api/whatsapp/webhook — Webhook de Twilio para WhatsApp entrante
// Solo procesa mensajes del número de Antonio Gutierrez
// Responde con TwiML para envío inmediato vía Twilio

import { NextRequest, NextResponse } from 'next/server'
import { createHmac }                from 'crypto'
import { logServerError }             from '@/lib/logger'
import { executeCommand }             from '@/lib/whatsapp-commands'
import { db }                         from '@/lib/db'
import { whatsappMessages }           from '@/lib/schema'

// Solo Antonio puede controlar TrendPilot por WhatsApp
const ADMIN_PHONE = process.env.ADMIN_WHATSAPP ?? process.env.ADMIN_WHATSAPP_NUMBER ?? '+526675039081'

// ─── Validación de firma Twilio ───────────────────────────────────────────────

function validateTwilioSignature(
  authToken: string,
  signature: string,
  url:       string,
  params:    Record<string, string>,
): boolean {
  const sorted = Object.keys(params).sort()
  const str    = url + sorted.map((k) => k + params[k]).join('')
  const hmac   = createHmac('sha1', authToken).update(Buffer.from(str, 'utf8')).digest('base64')
  return hmac === signature
}

// ─── Respuesta TwiML ──────────────────────────────────────────────────────────

function twimlResponse(body: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message></Response>`
  return new NextResponse(xml, {
    status:  200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

// Respuesta vacía (ignorar sin responder)
function twimlEmpty(): NextResponse {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status:  200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Twilio envía form-encoded, no JSON
    const formData = await request.formData()
    const from     = (formData.get('From') as string | null) ?? ''
    const body     = (formData.get('Body') as string | null) ?? ''
    const msgSid   = (formData.get('MessageSid') as string | null) ?? ''

    // Normalizar número (Twilio envía "whatsapp:+526675039081")
    const fromPhone = from.replace('whatsapp:', '')

    // ── Seguridad: solo aceptar de Antonio ───────────────────────────────────
    if (fromPhone !== ADMIN_PHONE) {
      // Ignorar completamente — no responder
      return twimlEmpty()
    }

    // ── Validación opcional de firma Twilio ───────────────────────────────────
    const authToken  = process.env.TWILIO_AUTH_TOKEN
    const signature  = request.headers.get('x-twilio-signature') ?? ''
    const requestUrl = `https://trendpilot.marketing/api/whatsapp/webhook`

    if (authToken && signature) {
      // Construir params map desde formData
      const params: Record<string, string> = {}
      formData.forEach((value, key) => { params[key] = value as string })

      const valid = validateTwilioSignature(authToken, signature, requestUrl, params)
      if (!valid) {
        return twimlEmpty()  // Firma inválida — ignorar
      }
    }

    // ── Procesar comando ──────────────────────────────────────────────────────
    const response = await executeCommand(body, ADMIN_PHONE)

    // ── Log en DB ─────────────────────────────────────────────────────────────
    await db.insert(whatsappMessages).values({
      phone_to:   fromPhone,
      message:    `[CMD] ${body.slice(0, 200)} → ${response.slice(0, 400)}`,
      type:       'manual',
      status:     'sent',
      twilio_sid: msgSid,
    }).catch(() => {/* no interrumpir si falla el log */})

    return twimlResponse(response)
  } catch (error) {
    logServerError(error, 'POST /api/whatsapp/webhook')
    return twimlResponse('⚠️ Error interno. Intenta de nuevo en unos segundos.')
  }
}

// Twilio envía GET para validar el webhook URL
export async function GET() {
  return new NextResponse('TrendPilot WhatsApp Webhook OK', { status: 200 })
}
