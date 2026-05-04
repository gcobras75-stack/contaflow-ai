import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { sql } from 'drizzle-orm'
import { eq } from 'drizzle-orm'
import { MPWebhookSchema } from '@/lib/schemas'
import {
  logPaymentProcessed,
  logInvalidWebhook,
  logServerError,
  logCampaignChange,
} from '@/lib/logger'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/ratelimit'
import { db } from '@/lib/db'
import { vendors } from '@/lib/schema'
import { createCommission } from '@/lib/queries/commissions'

// IPs oficiales de Mercado Pago (producción)
// Fuente: https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks
const MP_ALLOWED_IPS = new Set([
  '18.218.133.122',
  '18.218.133.123',
  '54.88.57.239',
  '54.88.57.240',
  '18.235.118.152',
  '18.235.118.153',
  '34.228.211.33',
  '34.228.211.34',
])

// Verificar firma HMAC-SHA256 del webhook de Mercado Pago
function verifyMPSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  if (!xSignature || !xRequestId) return false

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') return true
    return false
  }

  const message  = `id:${dataId};request-id:${xRequestId};`
  const expected = createHmac('sha256', secret).update(message).digest('hex')

  if (xSignature.length !== expected.length) return false

  let mismatch = 0
  for (let i = 0; i < xSignature.length; i++) {
    mismatch |= xSignature.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}

// POST /api/webhook-mp — recibir notificaciones de Mercado Pago
export async function POST(request: NextRequest) {
  const ip = getClientIP(request)

  const rl = checkRateLimit(`webhook:${ip}`, RATE_LIMITS.webhook)
  if (!rl.allowed) {
    logInvalidWebhook(ip, 'rate_limit_exceeded')
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (process.env.NODE_ENV === 'production' && !MP_ALLOWED_IPS.has(ip)) {
    logInvalidWebhook(ip, 'ip_not_allowed')
    return NextResponse.json({ received: true })
  }

  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    logInvalidWebhook(ip, 'invalid_json')
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const parsed = MPWebhookSchema.safeParse(body)
  if (!parsed.success) {
    logInvalidWebhook(ip, `invalid_schema: ${parsed.error.issues[0].message}`)
    return NextResponse.json({ received: true })
  }

  const webhook = parsed.data

  if (!verifyMPSignature(xSignature, xRequestId, webhook.data.id)) {
    logInvalidWebhook(ip, 'invalid_hmac_signature')
    return NextResponse.json({ received: true })
  }

  try {
    if (webhook.type === 'payment' && webhook.action === 'payment.created') {
      await processPayment(webhook.data.id)
    }
  } catch (error) {
    logServerError(error, 'webhook-mp processing')
    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}

async function processPayment(paymentId: string): Promise<void> {
  const mpResponse = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    { headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` } }
  )

  if (!mpResponse.ok) {
    throw new Error(`MP API error: ${mpResponse.status}`)
  }

  const payment = await mpResponse.json()

  if (payment.status !== 'approved') return

  const campaignId = payment.metadata?.campaign_id
  const vendorId   = payment.metadata?.vendor_id
  if (!campaignId || !vendorId) return

  const amount           = payment.transaction_amount * 100 // centavos
  const commissionRate   = payment.metadata?.commission_rate ?? 0.20
  const commissionAmount = Math.round(amount * commissionRate)
  const growthFundAmount = Math.round(commissionAmount * 0.40) // 40% al GrowthFund
  const platformEarning  = commissionAmount - growthFundAmount

  await createCommission({
    campaign_id:              campaignId,
    vendor_id:                vendorId,
    sale_amount:              amount,
    commission_rate:          String(commissionRate),
    commission_amount:        commissionAmount,
    growth_fund_amount:       growthFundAmount,
    platform_earning:         platformEarning,
    status:                   'paid',
    mercadopago_transfer_id:  paymentId,
    paid_at:                  new Date(),
  })

  // Incrementar GrowthFund del vendedor
  await db
    .update(vendors)
    .set({ growth_fund_balance: sql`${vendors.growth_fund_balance} + ${growthFundAmount}` })
    .where(eq(vendors.id, vendorId))

  logPaymentProcessed(paymentId, amount, vendorId)
  logCampaignChange(campaignId, 'sale_registered', 'system', { amount, commissionAmount })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
