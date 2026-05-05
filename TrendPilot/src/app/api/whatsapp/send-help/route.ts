// POST /api/whatsapp/send-help — Envía lista de comandos a Antonio
// Llamado desde el botón en /dashboard/campaigns/first-run

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, unauthorizedResponse, serverErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { sendWhatsApp }   from '@/lib/twilio'

const ADMIN_PHONE = process.env.ADMIN_WHATSAPP ?? process.env.ADMIN_WHATSAPP_NUMBER ?? '+526675039081'

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()

  try {
    const msg = `🤖 *TrendPilot — Comandos WhatsApp*\n\n📊 *REPORTES:*\n  campañas → estado de todas\n  ver [N] → detalle de campaña\n  comisiones → finanzas del día\n  tendencias → productos en alza\n\n▶️ *CONTROL:*\n  activar [N] → activa campaña\n  pausar [N] → pausa campaña\n  activar todas → activa pausadas\n  pausar todas → pausa activas\n\n💰 *PRESUPUESTO:*\n  presupuesto [N] [monto]\n  Ej: presupuesto 1 200\n\n🚀 *NUEVA CAMPAÑA:*\n  campaña [producto]\n  Ej: campaña aretes plata\n\n🌐 Panel completo:\ntrendpilot.marketing/dashboard`

    const sid = await sendWhatsApp({ to: ADMIN_PHONE, body: msg })
    return NextResponse.json({ ok: true, sid })
  } catch (error) {
    logServerError(error, 'POST /api/whatsapp/send-help')
    return serverErrorResponse()
  }
}
