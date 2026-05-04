import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  verifyAuth,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-auth'
import { sendWhatsApp } from '@/lib/twilio'
import { logServerError } from '@/lib/logger'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Schema de actualización de estado — solo admin
const ProductStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('approved') }),
  z.object({
    status:           z.literal('rejected'),
    rejection_reason: z.string().min(5, 'Indica el motivo del rechazo'),
  }),
])

// ─── PATCH /api/products/[id] ─────────────────────────────────────────────────
// Admin aprueba o rechaza un producto
// Al rechazar: notifica al vendor por WhatsApp si tiene número registrado

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()

  // Solo admins pueden cambiar el estado de un producto
  if (auth.role !== 'admin') {
    return forbiddenResponse()
  }

  const { id } = params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationErrorResponse('El cuerpo de la solicitud no es JSON válido')
  }

  const parsed = ProductStatusSchema.safeParse(body)
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0].message)
  }

  const supabase = getServiceClient()

  try {
    // Obtener el producto junto con los datos del vendor para notificaciones
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, name, status, vendor_id, vendors(name, whatsapp_number)')
      .eq('id', id)
      .single()

    if (fetchError || !product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Construir el objeto de actualización según el estado nuevo
    const updates: Record<string, unknown> = {
      status:     parsed.data.status,
      updated_at: new Date().toISOString(),
    }

    if (parsed.data.status === 'rejected') {
      updates.rejection_reason = parsed.data.rejection_reason
    }

    const { data: updated, error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logServerError(updateError, `PATCH /api/products/${id}`)
      return serverErrorResponse()
    }

    // Registrar aprobación en log de seguridad
    if (parsed.data.status === 'approved') {
      console.log(JSON.stringify({
        ts:     new Date().toISOString(),
        level:  'security',
        event:  'product_approved',
        userId: auth.userId,
        details: {
          productId:   id,
          productName: product.name,
          vendorId:    product.vendor_id,
        },
      }))
    }

    // Al rechazar: notificar al vendor por WhatsApp si tiene número
    if (parsed.data.status === 'rejected') {
      // Extraer datos del vendor (puede ser objeto o array según la consulta)
      const vendor = Array.isArray(product.vendors)
        ? product.vendors[0]
        : product.vendors

      if (vendor?.whatsapp_number) {
        sendWhatsApp({
          to:   vendor.whatsapp_number,
          body: `Hola ${vendor.name}, tu producto *${product.name}* ha sido rechazado en TrendPilot.\n\nMotivo: ${parsed.data.rejection_reason}\n\nPuedes corregirlo y enviarlo nuevamente desde tu panel.`,
        }).catch((err) => logServerError(err, `PATCH /api/products/${id} — WhatsApp`))
      }
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    logServerError(err, `PATCH /api/products/${id}`)
    return serverErrorResponse()
  }
}
