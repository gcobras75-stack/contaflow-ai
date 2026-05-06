// GET/POST /api/affiliates/postback
// Recibe notificaciones de conversión de redes afiliadas
//
// GET  — MercadoLibre (postback URL con query params)
// POST — SHEIN/Admitad (body JSON)
//
// URL de postback para configurar en cada red:
// https://www.trendpilot.marketing/api/affiliates/postback

import { NextRequest, NextResponse } from 'next/server'
import { recordCommission }          from '@/lib/ml-affiliates'
import { logServerError }            from '@/lib/logger'

// ── GET — MercadoLibre y redes que usan query params ─────────────────────────

export async function GET(request: NextRequest) {
  const p = new URL(request.url).searchParams

  const network       = p.get('network') as 'mercadolibre' | 'shein' | 'temu' | 'aliexpress' | null
  const transactionId = p.get('transaction_id')
  const saleAmountStr = p.get('sale_amount')
  const product       = p.get('product') ?? 'Producto'
  const status        = (p.get('status') ?? 'pending') as 'pending' | 'approved'
  const campaignSlug  = p.get('campaign_slug') ?? p.get('slug') ?? undefined

  // Validación mínima
  if (!network || !transactionId || !saleAmountStr) {
    console.warn('[postback GET] Parámetros faltantes', { network, transactionId, saleAmountStr })
    return new NextResponse('OK', { status: 200 })  // siempre 200 para evitar reintentos
  }

  const saleAmount = parseFloat(saleAmountStr)
  if (isNaN(saleAmount) || saleAmount <= 0) {
    return new NextResponse('OK', { status: 200 })
  }

  // Tasa de comisión por red (defaults)
  const DEFAULT_RATES: Record<string, number> = {
    mercadolibre: 6,
    shein:        20,
    temu:         10,
    aliexpress:   8,
  }
  const commissionRate = parseFloat(p.get('commission_rate') ?? String(DEFAULT_RATES[network] ?? 6))

  try {
    const result = await recordCommission({
      network,
      transactionId,
      productName:    product,
      saleAmount,
      commissionRate,
      campaignSlug,
      saleDate:       new Date(),
      status,
      rawData:        Object.fromEntries(p.entries()),
    })

    console.log('[postback GET] Comisión registrada', {
      network, transactionId, saleAmount,
      commission: result.commissionAmount,
    })
  } catch (err) {
    logServerError(err, 'GET /api/affiliates/postback')
  }

  return new NextResponse('OK', { status: 200 })
}

// ── POST — SHEIN/Admitad y redes con body JSON ────────────────────────────────

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return new NextResponse('OK', { status: 200 })
  }

  try {
    // Formato Admitad (SHEIN usa Admitad en LATAM)
    const transactionId  = String(body.order_id ?? body.transaction_id ?? '')
    const productName    = String(body.advcampaign_name ?? body.product ?? 'Producto')
    const saleAmountStr  = String(body.payment_sum ?? body.sale_amount ?? '0')
    const saleAmount     = parseFloat(saleAmountStr)
    const rawStatus      = String(body.status ?? 'pending').toLowerCase()
    const status         = (['approved', 'paid'].includes(rawStatus) ? 'approved' : 'pending') as 'pending' | 'approved'
    const networkRaw     = String(body.network ?? body.advcampaign_name ?? 'shein').toLowerCase()
    const network        = (networkRaw.includes('shein') ? 'shein'
      : networkRaw.includes('temu')    ? 'temu'
      : networkRaw.includes('aliexpress') ? 'aliexpress'
      : 'shein') as 'shein' | 'temu' | 'aliexpress'

    if (!transactionId || saleAmount <= 0) {
      return new NextResponse('OK', { status: 200 })
    }

    const DEFAULT_RATES: Record<string, number> = { shein: 20, temu: 10, aliexpress: 8 }
    const commissionRate = parseFloat(String(body.commission_rate ?? DEFAULT_RATES[network] ?? 10))

    const saleDate = body.action_date
      ? new Date(String(body.action_date))
      : new Date()

    const result = await recordCommission({
      network,
      transactionId,
      productName,
      saleAmount,
      commissionRate,
      saleDate,
      status,
      rawData: body,
    })

    console.log('[postback POST] Comisión registrada', {
      network, transactionId, saleAmount,
      commission: result.commissionAmount,
    })
  } catch (err) {
    logServerError(err, 'POST /api/affiliates/postback')
  }

  return NextResponse.json({ ok: true })
}
