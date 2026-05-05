// POST /api/whatsapp/daily-report — Envía reporte diario a Antonio (llamado por worker 8am)
// Autenticado con x-worker-secret igual que los demás endpoints del worker

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, serverErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { sendWhatsApp }   from '@/lib/twilio'
import { getAffiliateCampaigns } from '@/lib/affiliate-campaigns-db'

const ADMIN_PHONE = process.env.ADMIN_WHATSAPP ?? process.env.ADMIN_WHATSAPP_NUMBER ?? '+526675039081'

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const camps   = await getAffiliateCampaigns()
    const active  = camps.filter((c) => c.status === 'active')
    const paused  = camps.filter((c) => c.status === 'paused')

    const totalComm  = camps.reduce((s, c) => s + c.commissions, 0)
    const totalSpent = camps.reduce((s, c) => s + c.spent_today, 0)
    const netGain    = totalComm - totalSpent
    const avgRoi     = active.length
      ? Math.round(active.reduce((s, c) => s + c.roi, 0) / active.length)
      : 0

    const best  = [...camps].sort((a, b) => b.roi - a.roi)[0]
    const worst = [...camps].sort((a, b) => a.roi - b.roi)[0]

    const fmt  = (n: number) => `$${n.toLocaleString('es-MX')} MXN`
    const now  = new Date()
    const dow  = now.toLocaleDateString('es-MX', { weekday: 'long', timeZone: 'America/Mexico_City' })
    const date = now.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' })

    const msg = `📊 *Buenos días Antonio* ☀️

*TrendPilot — Resumen de ayer*
${dow.charAt(0).toUpperCase() + dow.slice(1)}, ${date}

Comisiones: ${fmt(totalComm)}
Gasto anuncios: ${fmt(totalSpent)}
Ganancia neta: ${fmt(netGain)}
ROI promedio: ${avgRoi > 0 ? `+${avgRoi}%` : `${avgRoi}%`}

Campañas activas: ${active.length}/5
Campañas pausadas: ${paused.length}/5

${best ? `Mejor campaña: ${best.emoji} ${best.name} ${best.roi > 0 ? `+${best.roi}%` : 'sin datos'}` : ''}
${worst && worst.slug !== best?.slug ? `Campaña débil: ${worst.emoji} ${worst.name} ${worst.roi > 0 ? `+${worst.roi}%` : 'sin datos'}` : ''}

3 nuevas tendencias detectadas.
Escribe *tendencias* para verlas.

¡Buen día! 🚀`

    const sid = await sendWhatsApp({ to: ADMIN_PHONE, body: msg })
    return NextResponse.json({ ok: true, sid, campaigns: camps.length })
  } catch (error) {
    logServerError(error, 'POST /api/whatsapp/daily-report')
    return serverErrorResponse()
  }
}
