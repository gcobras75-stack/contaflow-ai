// Cliente Mercado Pago Marketplace para TrendPilot

const MP_BASE_URL = 'https://api.mercadopago.com'

interface SplitPaymentParams {
  amount: number
  vendorMpId: string
  commissionRate: number
  description: string
  payerEmail: string
}

export async function createSplitPayment(params: SplitPaymentParams) {
  const { amount, vendorMpId, commissionRate, description, payerEmail } = params

  // Calcular el split: comisión para TrendPilot, resto para vendedor
  const platformFee = Math.round(amount * commissionRate)
  const vendorAmount = amount - platformFee

  const response = await fetch(`${MP_BASE_URL}/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      transaction_amount: amount / 100, // convertir centavos a pesos
      description,
      payment_method_id: 'account_money',
      payer: { email: payerEmail },
      application_fee: platformFee / 100,
      marketplace_fee: platformFee / 100,
      collector_id: vendorMpId,
      metadata: {
        vendor_amount: vendorAmount,
        platform_fee: platformFee,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Mercado Pago error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

// Validar webhook de Mercado Pago
export function validateWebhook(
  xSignature: string,
  xRequestId: string,
  dataId: string
): boolean {
  // Implementación de validación de firma HMAC-SHA256
  const crypto = require('crypto')
  const secret = process.env.MERCADOPAGO_ACCESS_TOKEN!
  const message = `id:${dataId};request-id:${xRequestId};`
  const hash = crypto.createHmac('sha256', secret).update(message).digest('hex')
  return hash === xSignature
}
