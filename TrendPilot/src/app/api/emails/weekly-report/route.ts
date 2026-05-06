// POST /api/emails/weekly-report
// Envía reporte semanal — protegido por WORKER_SECRET
// Llamado cada lunes por el worker de Railway

import { NextRequest, NextResponse } from 'next/server'
import { render }                    from '@react-email/render'
import { resend, FROM_EMAIL, ADMIN_EMAIL, OPERADORES } from '@/lib/resend'
import { WeeklyReport, WeeklyCampaign } from '@/emails/WeeklyReport'
import { logServerError }            from '@/lib/logger'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.WORKER_SECRET
  if (!secret) return true  // dev sin secret
  return (
    req.headers.get('x-worker-secret') === secret ||
    req.headers.get('authorization') === `Bearer ${secret}`
  )
}

// Formatea la semana actual como "29 abr — 5 may 2026"
function currentWeekLabel(): string {
  const now  = new Date()
  const day  = now.getDay()
  // Inicio semana anterior (lunes pasado)
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(now)
  start.setDate(now.getDate() + diff - 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const fmt = (d: Date) =>
    d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

  return `${fmt(start)} — ${fmt(end)} ${end.getFullYear()}`
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Obtener resumen del dashboard
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.trendpilot.marketing'
    const summaryRes = await fetch(`${baseUrl}/api/dashboard/summary`, {
      headers: { 'x-worker-secret': process.env.WORKER_SECRET ?? '' },
    })

    let totalCommissions = 0
    let totalSpend       = 0
    let topCampaign      = ''
    let campaigns: WeeklyCampaign[] = []

    if (summaryRes.ok) {
      const summary = await summaryRes.json()
      totalCommissions = parseFloat(summary.commissions?.total_commissions ?? '0')
      totalSpend       = parseFloat(summary.meta?.total_spend ?? '0')

      // Campañas con datos de Meta
      const rawCampaigns: Array<Record<string, unknown>> = summary.campaigns ?? []
      campaigns = rawCampaigns
        .filter((c) => c.meta_campaign_id)
        .slice(0, 5)
        .map((c) => {
          const spend       = parseFloat(String(c.last_spend ?? 0))
          const commission  = parseFloat(String(c.total_commissions ?? 0))
          const roi         = spend > 0 ? Math.round(((commission - spend) / spend) * 100) : 0
          return {
            name:        String(c.name ?? ''),
            spend,
            conversions: parseInt(String(c.conversions ?? 0)),
            commission,
            roi,
          }
        })

      // Campaña estrella = mayor ROI positivo
      const best = campaigns.reduce<WeeklyCampaign | null>((prev, c) =>
        c.roi > (prev?.roi ?? -Infinity) ? c : prev, null
      )
      topCampaign = best?.name ?? ''
    }

    const weekLabel = currentWeekLabel()

    // Lista de destinatarios: antonio + operadores activos
    const recipients: Array<{ email: string; name: string }> = [
      { email: ADMIN_EMAIL, name: 'Antonio' },
      { email: OPERADORES.sinaloa,   name: 'Manuel' },
    ]

    const sent: string[] = []

    for (const recipient of recipients) {
      const html = await render(
        WeeklyReport({
          weekLabel,
          campaigns,
          totalCommissions,
          totalSpend,
          topCampaign,
          recipientName: recipient.name,
        }) as React.ReactElement
      )

      const { data, error } = await resend.emails.send({
        from:    FROM_EMAIL,
        to:      recipient.email,
        subject: `📊 Reporte semanal TrendPilot — ${weekLabel}`,
        html,
      })

      if (error) {
        console.error('[email/weekly] Error para', recipient.email, error)
      } else {
        sent.push(data?.id ?? recipient.email)
      }
    }

    console.log(`[email/weekly] Enviados ${sent.length} reportes para ${weekLabel}`)
    return NextResponse.json({ success: true, sent: sent.length, weekLabel })

  } catch (err) {
    logServerError(err, 'POST /api/emails/weekly-report')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
