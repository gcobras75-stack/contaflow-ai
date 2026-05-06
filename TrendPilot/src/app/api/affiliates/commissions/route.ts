// GET  /api/affiliates/commissions — Consultar comisiones de redes afiliadas
// POST /api/affiliates/commissions — Registrar comisión manualmente (dashboard)
//
// Query params GET:
//   ?period=this_month | last_7d | last_30d (default: this_month)
//   ?network=mercadolibre | shein | ...
//   ?status=pending | approved | paid

import { NextRequest, NextResponse }    from 'next/server'
import { guardRoute, serverErrorResponse } from '@/lib/api-auth'
import { logServerError }                from '@/lib/logger'
import { getAffiliateCommissionSummary, recordCommission } from '@/lib/ml-affiliates'

export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'vendors')
  if (guard instanceof NextResponse) return guard

  try {
    const url     = new URL(request.url)
    const period  = (url.searchParams.get('period')  ?? 'this_month') as 'this_month' | 'last_7d' | 'last_30d'
    const network = url.searchParams.get('network') ?? undefined
    const status  = url.searchParams.get('status')  ?? undefined

    const summary = await getAffiliateCommissionSummary({ period, network, status })

    return NextResponse.json(summary)
  } catch (err) {
    logServerError(err, 'GET /api/affiliates/commissions')
    return serverErrorResponse()
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'vendors')
  if (guard instanceof NextResponse) return guard

  try {
    const body = await request.json()

    const {
      network, transactionId, productName,
      saleAmount, commissionRate, campaignSlug,
      saleDate, status,
    } = body

    if (!network || !productName || !saleAmount || !commissionRate) {
      return NextResponse.json(
        { error: 'Campos requeridos: network, productName, saleAmount, commissionRate' },
        { status: 400 },
      )
    }

    const result = await recordCommission({
      network,
      transactionId: transactionId ?? `manual-${Date.now()}`,
      productName,
      saleAmount:     Number(saleAmount),
      commissionRate: Number(commissionRate),
      campaignSlug,
      saleDate:       saleDate ? new Date(saleDate) : new Date(),
      status:         status ?? 'pending',
    })

    // Notificar a Antonio por WhatsApp (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    if (appUrl) {
      fetch(`${appUrl}/api/whatsapp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-worker-secret': process.env.WORKER_SECRET ?? '' },
        body:    JSON.stringify({
          phone:   process.env.ADMIN_WHATSAPP_NUMBER ?? '526675039081',
          message: `💰 *Nueva comisión registrada*\nProducto: ${productName}\nVenta: $${Number(saleAmount).toFixed(2)} MXN\nComisión: $${result.commissionAmount.toFixed(2)} MXN\nRed: ${network}\nTu parte (70%): $${result.operatorShare.toFixed(2)} MXN`,
          type:    'manual',
        }),
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    logServerError(err, 'POST /api/affiliates/commissions')
    return serverErrorResponse()
  }
}
