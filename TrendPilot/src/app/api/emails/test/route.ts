// GET /api/emails/test
// Solo disponible en desarrollo — envía los 4 tipos de email a antonio@automatia.mx

import { NextResponse }   from 'next/server'
import { render }         from '@react-email/render'
import * as React         from 'react'
import { ADMIN_EMAIL }    from '@/lib/resend'
import { WelcomeEmail }   from '@/emails/WelcomeEmail'
import { CommissionAlert } from '@/emails/CommissionAlert'
import { WeeklyReport }   from '@/emails/WeeklyReport'
import { CampaignAlert }  from '@/emails/CampaignAlert'

export async function GET() {
  console.log('=== TEST EMAIL INICIANDO ===')
  console.log('RESEND_API_KEY existe:', !!process.env.RESEND_API_KEY)
  console.log('NODE_ENV:', process.env.NODE_ENV)

  // Devuelve la clave de diagnóstico incluso en producción para este endpoint
  // (el endpoint no hace nada dañino sin la API key real)
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_EMAIL_TEST) {
    return NextResponse.json({ error: 'Solo disponible en desarrollo' }, { status: 403 })
  }

  const results: Record<string, { ok: boolean; id?: string; error?: string }> = {}

  // Importar resend dinámicamente para capturar error de inicialización
  let resendClient: Awaited<ReturnType<typeof import('@/lib/resend').resend.emails.send>> | undefined
  let FROM_EMAIL_val = 'TrendPilot <onboarding@resend.dev>'
  let sendFn: typeof import('@/lib/resend').resend.emails.send | null = null

  try {
    const resendLib = await import('@/lib/resend')
    FROM_EMAIL_val  = resendLib.FROM_EMAIL
    sendFn          = resendLib.resend.emails.send.bind(resendLib.resend.emails)
    console.log('✅ @/lib/resend importado OK — FROM:', FROM_EMAIL_val)
  } catch (e) {
    console.error('❌ Error importando @/lib/resend:', e)
    return NextResponse.json({
      error: 'Error al inicializar Resend',
      detail: String(e),
      stack:  e instanceof Error ? e.stack : null,
      hint:   'Verifica RESEND_API_KEY en .env.local',
    }, { status: 500 })
  }

  const sendEmail = async (subject: string, html: string, label: string) => {
    if (!sendFn) throw new Error('sendFn no inicializado')
    return sendFn({ from: FROM_EMAIL_val, to: ADMIN_EMAIL, subject, html })
  }

  // 1. WelcomeEmail
  try {
    console.log('--- Renderizando WelcomeEmail...')
    const html = await render(
      React.createElement(WelcomeEmail, { name: 'Antonio', region: 'sinaloa', email: ADMIN_EMAIL })
    )
    console.log('✅ WelcomeEmail render OK, len:', html.length)
    const { data, error } = await sendEmail('[TEST] Bienvenido a TrendPilot', html, 'welcome')
    results.welcome = error ? { ok: false, error: JSON.stringify(error) } : { ok: true, id: data?.id }
    console.log('WelcomeEmail send:', results.welcome)
  } catch (e) {
    console.error('❌ WelcomeEmail error:', e)
    results.welcome = { ok: false, error: String(e) }
  }

  // 2. CommissionAlert
  try {
    console.log('--- Renderizando CommissionAlert...')
    const html = await render(
      React.createElement(CommissionAlert, {
        operatorName:     'Antonio (Test)',
        product:          'Smartwatch Deportivo',
        saleAmount:       1500,
        commissionAmount: 90,
        operatorShare:    63,
        antonioShare:     27,
        network:          'mercadolibre',
        date:             new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
      })
    )
    console.log('✅ CommissionAlert render OK, len:', html.length)
    const { data, error } = await sendEmail('[TEST] 💰 Nueva comisión', html, 'commission')
    results.commission = error ? { ok: false, error: JSON.stringify(error) } : { ok: true, id: data?.id }
    console.log('CommissionAlert send:', results.commission)
  } catch (e) {
    console.error('❌ CommissionAlert error:', e)
    results.commission = { ok: false, error: String(e) }
  }

  // 3. WeeklyReport
  try {
    console.log('--- Renderizando WeeklyReport...')
    const html = await render(
      React.createElement(WeeklyReport, {
        weekLabel:        'Semana de prueba',
        recipientName:    'Antonio',
        totalCommissions: 4320,
        totalSpend:       1800,
        topCampaign:      'Smartwatch Deportivo ML',
        campaigns: [
          { name: 'Smartwatch Deportivo', spend: 800, conversions: 12, commission: 2160, roi: 170 },
          { name: 'Airfryer Sin Aceite',  spend: 600, conversions: 8,  commission: 1248, roi: 108 },
        ],
      })
    )
    console.log('✅ WeeklyReport render OK, len:', html.length)
    const { data, error } = await sendEmail('[TEST] 📊 Reporte semanal', html, 'weekly')
    results.weeklyReport = error ? { ok: false, error: JSON.stringify(error) } : { ok: true, id: data?.id }
    console.log('WeeklyReport send:', results.weeklyReport)
  } catch (e) {
    console.error('❌ WeeklyReport error:', e)
    results.weeklyReport = { ok: false, error: String(e) }
  }

  // 4. CampaignAlert
  try {
    console.log('--- Renderizando CampaignAlert...')
    const html = await render(
      React.createElement(CampaignAlert, {
        campaignName: 'Smartwatch Deportivo — Meta',
        event:        'ROI_ALTO',
        spend:        800,
        commissions:  2160,
        roi:          170,
        suggestion:   'Considera aumentar el presupuesto diario — el ROI está muy por encima del umbral.',
      })
    )
    console.log('✅ CampaignAlert render OK, len:', html.length)
    const { data, error } = await sendEmail('[TEST] 🚀 Alerta de campaña ROI_ALTO', html, 'campaign')
    results.campaignAlert = error ? { ok: false, error: JSON.stringify(error) } : { ok: true, id: data?.id }
    console.log('CampaignAlert send:', results.campaignAlert)
  } catch (e) {
    console.error('❌ CampaignAlert error:', e)
    results.campaignAlert = { ok: false, error: String(e) }
  }

  const allOk = Object.values(results).every((r) => r.ok)
  console.log('=== TEST EMAIL COMPLETO ===', { allOk, results })

  return NextResponse.json({
    allOk,
    to:      ADMIN_EMAIL,
    from:    FROM_EMAIL_val,
    results,
  })
}
