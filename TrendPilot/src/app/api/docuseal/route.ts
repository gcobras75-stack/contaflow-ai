// /api/docuseal — Webhook de DocuSeal
// Se dispara cuando un vendor firma su contrato.
// Activa la cuenta del vendor automáticamente.

import { NextRequest, NextResponse }                 from 'next/server'
import { db }                                        from '@/lib/db'
import { vendors }                                   from '@/lib/schema'
import { eq }                                        from 'drizzle-orm'
import { emailContractSigned }                        from '@/lib/resend'
import { sendVendorWelcome }                         from '@/lib/twilio'
import { logServerError }                            from '@/lib/logger'

// DocuSeal envía un POST cuando el submission queda completed
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()

    // Validar secreto del webhook si está configurado
    const secret = process.env.DOCUSEAL_WEBHOOK_SECRET
    if (secret) {
      const headerSecret = request.headers.get('x-docuseal-secret')
      if (headerSecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Evento de firma completa
    if (body.event_type !== 'form.completed' && body.status !== 'completed') {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const submissionId = String(body.submission_id ?? body.id ?? '')
    if (!submissionId) {
      return NextResponse.json({ error: 'No submission_id' }, { status: 400 })
    }

    // Buscar vendor por contract_submission_id
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.contract_submission_id, submissionId))
      .limit(1)

    if (!vendor) {
      console.warn(`[DocuSeal webhook] Vendor no encontrado para submission ${submissionId}`)
      return NextResponse.json({ ok: true, vendor: 'not_found' })
    }

    // Activar vendor + marcar contrato firmado
    await db
      .update(vendors)
      .set({
        status:           'active',
        contract_status:  'signed',
      })
      .where(eq(vendors.id, vendor.id))

    // Notificar al vendor por email y WhatsApp
    await Promise.allSettled([
      (async () => {
        const { subject, html } = emailContractSigned({ vendor_name: vendor.name })
        await import('@/lib/resend').then(({ send }) => send(vendor.email, subject, html))
      })(),
      vendor.whatsapp_number
        ? sendVendorWelcome(vendor.whatsapp_number, vendor.name)
        : Promise.resolve(null),
    ])

    console.log(`[DocuSeal] Vendor ${vendor.id} activado. Contrato firmado ✅`)
    return NextResponse.json({ ok: true, vendor_id: vendor.id, activated: true })
  } catch (error) {
    logServerError(error, 'POST /api/docuseal')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
