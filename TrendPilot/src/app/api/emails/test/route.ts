// GET /api/emails/test
// Solo disponible en desarrollo — envía los 4 tipos de email a antonio@automatia.mx

import { NextRequest, NextResponse } from 'next/server'
import { render }                    from '@react-email/render'
import { resend, FROM_EMAIL, ADMIN_EMAIL } from '@/lib/resend'
import { WelcomeEmail }   from '@/emails/WelcomeEmail'
import { CommissionAlert } from '@/emails/CommissionAlert'
import { WeeklyReport }   from '@/emails/WeeklyReport'
import { CampaignAlert }  from '@/emails/CampaignAlert'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Solo disponible en desarrollo' }, { status: 403 })
  }

  const results: Record<string, { ok: boolean; id?: string; error?: string }> = {}

  // 1. WelcomeEmail
  try {
    const html = await render(
      WelcomeEmail({ name: 'Antonio', region: 'sinaloa', email: ADMIN_EMAIL }) as React.ReactElement
    )
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL, to: ADMIN_EMAIL,
      subject: '[TEST] Bienvenido a TrendPilot',
      html,
    })
    results.welcome = error ? { ok: false, error: error.message } : { ok: true, id: data?.id }
  } catch (e) {
    results.welcome = { ok: false, error: String(e) }
  }

  // 2. CommissionAlert
  try {
    const html = await render(
      CommissionAlert({
        operatorName:     'Antonio (Test)',
        product:          'Smartwatch Deportivo',
        saleAmount:       1500,
        commissionAmount: 90,
        operatorShare:    63,
        antonioShare:     27,
        network:          'mercadolibre',
        date:             new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
      }) as React.ReactElement
    )
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL, to: ADMIN_EMAIL,
      subject: '[TEST] 💰 Nueva comisión: $63.00 MXN',
      html,
    })
    results.commission = error ? { ok: false, error: error.message } : { ok: true, id: data?.id }
  } catch (e) {
    results.commission = { ok: false, error: String(e) }
  }

  // 3. WeeklyReport
  try {
    const html = await render(
      WeeklyReport({
        weekLabel:        'Semana de prueba',
        recipientName:    'Antonio',
        totalCommissions: 4320,
        totalSpend:       1800,
        topCampaign:      'Smartwatch Deportivo ML',
        campaigns: [
          { name: 'Smartwatch Deportivo', spend: 800, conversions: 12, commission: 2160, roi: 170 },
          { name: 'Airfryer Sin Aceite',  spend: 600, conversions: 8,  commission: 1248, roi: 108 },
        ],
      }) as React.ReactElement
    )
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL, to: ADMIN_EMAIL,
      subject: '[TEST] 📊 Reporte semanal TrendPilot',
      html,
    })
    results.weeklyReport = error ? { ok: false, error: error.message } : { ok: true, id: data?.id }
  } catch (e) {
    results.weeklyReport = { ok: false, error: String(e) }
  }

  // 4. CampaignAlert
  try {
    const html = await render(
      CampaignAlert({
        campaignName: 'Smartwatch Deportivo — Meta',
        event:        'ROI_ALTO',
        spend:        800,
        commissions:  2160,
        roi:          170,
        suggestion:   'Considera aumentar el presupuesto diario — el ROI está muy por encima del umbral.',
      }) as React.ReactElement
    )
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL, to: ADMIN_EMAIL,
      subject: '[TEST] 🚀 Campaña con excelente ROI: Smartwatch Deportivo',
      html,
    })
    results.campaignAlert = error ? { ok: false, error: error.message } : { ok: true, id: data?.id }
  } catch (e) {
    results.campaignAlert = { ok: false, error: String(e) }
  }

  const allOk = Object.values(results).every((r) => r.ok)
  console.log('[email/test]', results)

  return NextResponse.json({ allOk, to: ADMIN_EMAIL, results })
}
