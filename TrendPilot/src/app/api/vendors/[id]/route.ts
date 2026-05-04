import { NextRequest, NextResponse } from 'next/server'
import {
  verifyAuth, unauthorizedResponse, forbiddenResponse,
  serverErrorResponse, validationErrorResponse,
} from '@/lib/api-auth'
import { VendorUpdateSchema } from '@/lib/schemas'
import { logServerError } from '@/lib/logger'
import { getVendorById, updateVendor } from '@/lib/queries/vendors'

// GET /api/vendors/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()

  const { id } = params
  if (auth.role === 'vendor' && auth.vendorId !== id) return forbiddenResponse()

  try {
    const vendor = await getVendorById(id)
    if (!vendor) return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
    return NextResponse.json({ data: vendor })
  } catch (err) {
    logServerError(err, `GET /api/vendors/${id}`)
    return serverErrorResponse()
  }
}

// PATCH /api/vendors/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()
  if (auth.role !== 'admin') return forbiddenResponse()

  const { id } = params
  let body: unknown
  try { body = await request.json() } catch {
    return validationErrorResponse('El cuerpo de la solicitud no es JSON válido')
  }

  const parsed = VendorUpdateSchema.safeParse(body)
  if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

  try {
    const current = await getVendorById(id)
    if (!current) return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })

    const updated = await updateVendor(id, parsed.data as Parameters<typeof updateVendor>[1])

    if (parsed.data.status === 'suspended' && current.status !== 'suspended') {
      console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'security', event: 'vendor_suspended',
        userId: auth.userId, details: { vendorId: id, vendorName: current.name } }))
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    logServerError(err, `PATCH /api/vendors/${id}`)
    return serverErrorResponse()
  }
}
