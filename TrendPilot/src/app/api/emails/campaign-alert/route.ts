// POST /api/emails/campaign-alert
// Envía alerta de campaña con sugerencia IA a antonio

import { NextRequest, NextResponse } from 'next/server'
import { render }                    from '@react-email/render'
import { resend, FROM_EMAIL, ADMIN_EMAIL } from '@/lib/resend'
import { CampaignAlert, CampaignEvent } from '@/emails/CampaignAlert'
import { logServerError }            from '@/lib/logger'

const VALID_EVENTS: CampaignEvent[] = ['ACTIVADA', 'PAUSADA', 'ROI_BAJO', 'ROI_ALTO', 'SIN_DATOS']

// Genera una sugerencia IA básica si no se provee
function defaultSuggestion(event: CampaignEvent, roi: number, campaignName: string): string {
  switch (event) {
    case 'ROI_ALTO':
      return `La campaña "${campaignName}" tiene un ROI del ${roi}%. Considera aumentar el presupuesto diario para escalar resultados.`
    case 'ROI_BAJO':
      return `El ROI del ${roi}% está por debajo del umbral. Revisa segmentación, creativos y horarios de publicación.`
    case 'PAUSADA':
      return `La campaña fue pausada. Analiza los datos antes de reactivar para identificar áreas de mejora.`
    case 'ACTIVADA':
      return `Campaña activada. Monitorea los primeros resultados en las próximas 24 horas para ajustar si es necesario.`
    case 'SIN_DATOS':
    default:
      return `La campaña aún no tiene datos suficientes. Espera al menos 24-48 horas para evaluar el rendimiento.`
  }
}

const EVENT_SUBJECTS: Record<CampaignEvent, string> = {
  ACTIVADA:  '🟢 Campaña activada',
  PAUSADA:   '⏸️ Campaña pausada',
  ROI_BAJO:  '⚠️ ROI bajo — revisión requerida',
  ROI_ALTO:  '🚀 Campaña con excelente ROI',
  SIN_DATOS: 'ℹ️ Campaña sin datos aún',
}

export async function POST(request: NextRequest) {
  let body: {
    campaignName?: string
    event?:        string
    spend?:        number
    commissions?:  number
    roi?:          number
    suggestion?:   string
    recipientEmail?: string
  } = {}

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    campaignName,
    event: rawEvent,
    spend        = 0,
    commissions  = 0,
    roi          = 0,
    suggestion,
    recipientEmail,
  } = body

  if (!campaignName || !rawEvent) {
    return NextResponse.json({ error: 'campaignName y event son requeridos' }, { status: 400 })
  }

  const event = (VALID_EVENTS.includes(rawEvent as CampaignEvent)
    ? rawEvent
    : 'SIN_DATOS') as CampaignEvent

  const finalSuggestion = suggestion || defaultSuggestion(event, roi, campaignName)
  const to = recipientEmail ?? ADMIN_EMAIL

  try {
    const html = await render(
      CampaignAlert({
        campaignName,
        event,
        spend,
        commissions,
        roi,
        suggestion: finalSuggestion,
      }) as React.ReactElement
    )

    const { data, error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to,
      subject: `${EVENT_SUBJECTS[event]}: ${campaignName}`,
      html,
    })

    if (error) {
      console.error('[email/campaign-alert] Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[email/campaign-alert] Enviado | event:', event, '| id:', data?.id)
    return NextResponse.json({ success: true, emailId: data?.id })

  } catch (err) {
    logServerError(err, 'POST /api/emails/campaign-alert')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
