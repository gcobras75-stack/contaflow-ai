// Cliente Twilio WhatsApp para TrendPilot

const TWILIO_API_URL = 'https://api.twilio.com/2010-04-01'

interface WhatsAppMessage {
  to: string
  body: string
  mediaUrl?: string
}

export async function sendWhatsApp(message: WhatsAppMessage): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const from = process.env.TWILIO_WHATSAPP_NUMBER!

  const formData = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: `whatsapp:${message.to}`,
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
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: formData.toString(),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Twilio error: ${JSON.stringify(error)}`)
  }
}

// Enviar bienvenida a nuevo vendedor
export async function sendVendorWelcome(
  phone: string,
  vendorName: string
): Promise<void> {
  return sendWhatsApp({
    to: phone,
    body: `¡Hola ${vendorName}! 🚀 Bienvenido a *TrendPilot*. Tu cuenta ha sido activada. Desde aquí recibirás notificaciones sobre tus campañas y ventas en tiempo real.`,
  })
}
