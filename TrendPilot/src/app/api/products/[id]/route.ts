import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  verifyAuth, unauthorizedResponse, forbiddenResponse,
  serverErrorResponse, validationErrorResponse,
} from '@/lib/api-auth'
import { sendWhatsApp } from '@/lib/twilio'
import { logServerError } from '@/lib/logger'
import { getProductById, updateProductStatus } from '@/lib/queries/products'
import { getVendorById } from '@/lib/queries/vendors'

const ProductStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('approved') }),
  z.object({ status: z.literal('rejected'), rejection_reason: z.string().min(5, 'Indica el motivo del rechazo') }),
])

// PATCH /api/products/[id] — admin aprueba o rechaza
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()
  if (auth.role !== 'admin') return forbiddenResponse()

  const { id } = params
  let body: unknown
  try { body = await request.json() } catch {
    return validationErrorResponse('El cuerpo de la solicitud no es JSON válido')
  }

  const parsed = ProductStatusSchema.safeParse(body)
  if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

  try {
    const product = await getProductById(id)
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

    const rejection_reason = parsed.data.status === 'rejected' ? parsed.data.rejection_reason : undefined
    const updated = await updateProductStatus(id, parsed.data.status, rejection_reason)

    if (parsed.data.status === 'approved') {
      console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'security', event: 'product_approved',
        userId: auth.userId, details: { productId: id, productName: product.name, vendorId: product.vendor_id } }))
    }

    if (parsed.data.status === 'rejected' && product.vendor_id) {
      const vendor = await getVendorById(product.vendor_id)
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
