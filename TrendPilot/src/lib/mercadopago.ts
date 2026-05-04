// Integración con Mercado Pago Marketplace para TrendPilot
// Docs: https://www.mercadopago.com.mx/developers/es/docs

import { createHmac } from 'crypto'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MPItem {
  id:          string
  title:       string
  description?: string
  quantity:    number
  unit_price:  number    // pesos MXN (no centavos)
  currency_id?: string
}

export interface MPPreferenceOptions {
  items:          MPItem[]
  vendorId:       string
  campaignId:     string
  commissionRate: number   // 0.15 a 0.30
  backUrls?: {
    success?: string
    failure?: string
    pending?: string
  }
}

export interface MPPreferenceResult {
  id:                 string
  init_point:         string   // URL producción
  sandbox_init_point: string   // URL sandbox
}

export interface MPPaymentSplit {
  vendor_amount:     number   // centavos → va al vendor
  commission_amount: number   // centavos → comisión TrendPilot
  growth_fund:       number   // centavos → 40% de comisión reinversión
  platform_earning:  number   // centavos → 60% de comisión ganancia
}

// ─── Helper fetch ─────────────────────────────────────────────────────────────

function mpFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado')

  return fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })
}

// ─── createPreference — genera preferencia de pago ───────────────────────────

export async function createPreference(
  opts: MPPreferenceOptions
): Promise<MPPreferenceResult> {
  const { items, vendorId, campaignId, commissionRate, backUrls } = opts
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.trendpilot.marketing'

  const body = {
    items: items.map((item) => ({
      id:          item.id,
      title:       item.title,
      description: item.description ?? item.title,
      quantity:    item.quantity,
      unit_price:  item.unit_price,
      currency_id: item.currency_id ?? 'MXN',
    })),
    metadata: {
      vendor_id:       vendorId,
      campaign_id:     campaignId,
      commission_rate: commissionRate,
    },
    back_urls: backUrls ?? {
      success: `${appUrl}/dashboard/commissions`,
      failure: `${appUrl}/dashboard/campaigns`,
      pending: `${appUrl}/dashboard/campaigns`,
    },
    auto_return:          'approved',
    statement_descriptor: 'TRENDPILOT',
    expires:              false,
  }

  const res = await mpFetch('/checkout/preferences', {
    method: 'POST',
    body:   JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MP createPreference error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return {
    id:                 data.id,
    init_point:         data.init_point,
    sandbox_init_point: data.sandbox_init_point,
  }
}

// ─── splitPayment — calcula el desglose de comisiones ────────────────────────
//
// Modelo de negocio TrendPilot:
//   Vendor recibe:     saleTotalCentavos × (1 - commissionRate)
//   TrendPilot recibe: saleTotalCentavos × commissionRate
//     └─ GrowthFund (40%): reinversión en nuevas campañas
//     └─ Plataforma (60%): ganancia neta de TrendPilot

export function splitPayment(
  saleTotalCentavos: number,
  commissionRate = 0.20
): MPPaymentSplit {
  const commissionAmount = Math.round(saleTotalCentavos * commissionRate)
  const vendorAmount     = saleTotalCentavos - commissionAmount
  const growthFund       = Math.round(commissionAmount * 0.40)
  const platformEarning  = commissionAmount - growthFund

  return { vendor_amount: vendorAmount, commission_amount: commissionAmount, growth_fund: growthFund, platform_earning: platformEarning }
}

// ─── verifyWebhook — verifica firma HMAC-SHA256 de MP ────────────────────────
//
// Mercado Pago envía: x-signature: ts=...,v1=<hmac_hex>
// TrendPilot valida: HMAC-SHA256( "id:{dataId};request-id:{xRequestId};" )

export function verifyWebhook(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  if (!xSignature || !xRequestId) return false

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }

  const message  = `id:${dataId};request-id:${xRequestId};`
  const expected = createHmac('sha256', secret).update(message).digest('hex')

  // Comparación en tiempo constante (evita timing attacks)
  if (xSignature.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < xSignature.length; i++) {
    diff |= xSignature.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

// ─── getPayment — obtiene detalle de un pago aprobado ────────────────────────

export async function getPayment(paymentId: string): Promise<Record<string, unknown>> {
  const res = await mpFetch(`/v1/payments/${paymentId}`)
  if (!res.ok) throw new Error(`MP getPayment error ${res.status}`)
  return res.json()
}

// ─── createTestPreference — pago sandbox $10 MXN ────────────────────────────

export async function createTestPreference(): Promise<MPPreferenceResult> {
  return createPreference({
    items: [{
      id:          'test-trendpilot-001',
      title:       'Pago de prueba TrendPilot',
      description: 'Verificación del webhook de Mercado Pago',
      quantity:    1,
      unit_price:  10,  // $10 MXN
    }],
    vendorId:       'test-vendor-id',
    campaignId:     'test-campaign-id',
    commissionRate: 0.20,
  })
}

// Alias para compatibilidad con webhook-mp/route.ts
export { verifyWebhook as validateWebhook }
