// POST /api/emails/commission
// Notifica al operador y a antonio cuando se registra una comisión

import { NextRequest, NextResponse } from 'next/server'
import { render }                    from '@react-email/render'
import { resend, FROM_EMAIL, ADMIN_EMAIL } from '@/lib/resend'
import { CommissionAlert }           from '@/emails/CommissionAlert'
import { logServerError }            from '@/lib/logger'

export interface CommissionEmailBody {
  operatorName:  string
  operatorEmail: string
  product:       string
  saleAmount:    number
  commissionAmount: number
  network:       string
  date:          string
}

export async function POST(request: NextRequest) {
  let body: Partial<CommissionEmailBody> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { operatorName, operatorEmail, product, saleAmount, commissionAmount, network, date } = body

  if (!operatorName || !operatorEmail || !product || !saleAmount || !commissionAmount || !network || !date) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Calcular split 70/30
  const operatorShare = parseFloat((commissionAmount * 0.7).toFixed(2))
  const antonioShare  = parseFloat((commissionAmount * 0.3).toFixed(2))

  try {
    const html = await render(
      CommissionAlert({
        operatorName,
        product,
        saleAmount,
        commissionAmount,
        operatorShare,
        antonioShare,
        network,
        date,
      }) as React.ReactElement
    )

    // Envío al operador
    const { data, error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      operatorEmail,
      bcc:     ADMIN_EMAIL,
      subject: `💰 Nueva comisión: $${operatorShare.toFixed(2)} MXN de ${product}`,
      html,
    })

    if (error) {
      console.error('[email/commission] Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[email/commission] Enviado a', operatorEmail, '| id:', data?.id)
    return NextResponse.json({ success: true, emailId: data?.id, operatorShare, antonioShare })

  } catch (err) {
    logServerError(err, 'POST /api/emails/commission')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
