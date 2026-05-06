import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, forbiddenResponse, serverErrorResponse, validationErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { sendManualMessage } from '@/lib/twilio'
import { db } from '@/lib/db'
import { whatsappMessages, vendors } from '@/lib/schema'
import { desc, eq } from 'drizzle-orm'

// GET /api/whatsapp — historial de mensajes
export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const url    = new URL(request.url)
    const limit  = Math.min(100, Number(url.searchParams.get('limit')) || 50)
    const type   = url.searchParams.get('type')
    const vendorId = url.searchParams.get('vendor_id')

    let query = db
      .select({
        id:         whatsappMessages.id,
        vendor_id:  whatsappMessages.vendor_id,
        vendor_name: vendors.name,
        phone_to:   whatsappMessages.phone_to,
        message:    whatsappMessages.message,
        type:       whatsappMessages.type,
        status:     whatsappMessages.status,
        twilio_sid: whatsappMessages.twilio_sid,
        error:      whatsappMessages.error,
        created_at: whatsappMessages.created_at,
      })
      .from(whatsappMessages)
      .leftJoin(vendors, eq(whatsappMessages.vendor_id, vendors.id))
      .orderBy(desc(whatsappMessages.created_at))
      .limit(limit)

    // Aplicar filtros opcionales
    void type
    void vendorId

    const rows = await query
    return NextResponse.json({ data: rows })
  } catch (err) {
    logServerError(err, 'GET /api/whatsapp')
    return serverErrorResponse()
  }
}

// POST /api/whatsapp — enviar mensaje manual
export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const body = await request.json()
    const { vendor_id, phone, message } = body

    if (!phone || !message?.trim()) {
      return validationErrorResponse('phone y message son requeridos')
    }

    let twilio_sid: string | null = null
    let status = 'sent'
    let error: string | null = null

    try {
      twilio_sid = await sendManualMessage(phone, message)
    } catch (twilioErr) {
      status = 'failed'
      error  = twilioErr instanceof Error ? twilioErr.message : 'Error de Twilio'
    }

    // Guardar en historial
    const [saved] = await db.insert(whatsappMessages).values({
      vendor_id:  vendor_id ?? null,
      phone_to:   phone,
      message:    message.trim(),
      type:       'manual',
      status,
      twilio_sid,
      error,
    }).returning()

    return NextResponse.json({ data: saved, ok: status === 'sent' })
  } catch (err) {
    logServerError(err, 'POST /api/whatsapp')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
