import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  verifyAuth,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-auth'
import { VendorUpdateSchema } from '@/lib/schemas'
import { logServerError } from '@/lib/logger'

// Cliente de servicio — acceso total, solo para uso server-side
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ─── GET /api/vendors/[id] ────────────────────────────────────────────────────
// Admin: puede ver cualquier vendor
// Vendor: solo puede ver su propio registro

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()

  const { id } = params

  // Vendor solo puede leer sus propios datos
  if (auth.role === 'vendor' && auth.vendorId !== id) {
    return forbiddenResponse()
  }

  const supabase = getServiceClient()

  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    logServerError(err, `GET /api/vendors/${id}`)
    return serverErrorResponse()
  }
}

// ─── PATCH /api/vendors/[id] ──────────────────────────────────────────────────
// Solo admin puede actualizar vendors

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()

  // Solo admins pueden modificar vendors
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

  const parsed = VendorUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0].message)
  }

  const supabase = getServiceClient()

  try {
    // Obtener estado actual para detectar cambios relevantes
    const { data: current, error: fetchError } = await supabase
      .from('vendors')
      .select('status, name')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
    }

    const updates = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error: updateError } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logServerError(updateError, `PATCH /api/vendors/${id}`)
      return serverErrorResponse()
    }

    // Registrar suspensión explícita de un vendor
    if (parsed.data.status === 'suspended' && current.status !== 'suspended') {
      console.log(JSON.stringify({
        ts:     new Date().toISOString(),
        level:  'security',
        event:  'vendor_suspended',
        userId: auth.userId,
        details: { vendorId: id, vendorName: current.name },
      }))
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    logServerError(err, `PATCH /api/vendors/${id}`)
    return serverErrorResponse()
  }
}
