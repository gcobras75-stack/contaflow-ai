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
import { logServerError, logCampaignChange } from '@/lib/logger'

function getService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const CampaignPatchSchema = z.object({
  semaphore_color: z.enum(['green', 'yellow', 'red']).optional(),
  status:          z.enum(['green', 'yellow', 'red', 'paused']).optional(),
  pause_reason:    z.string().max(500).optional(),
  budget_total:    z.number().positive().optional(),
  audience_data:   z.record(z.string(), z.unknown()).optional(),
  ai_suggestions:  z.record(z.string(), z.unknown()).optional(),
})

// ─── GET /api/campaigns/[id] ─────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()

  const supabase = getService()
  const { id } = params

  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        products(id, name, price, category, images),
        vendors(id, name, email, whatsapp_number)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    }

    // Vendor solo puede ver sus propias campañas
    if (auth.role !== 'admin' && data.vendor_id !== auth.vendorId) {
      return forbiddenResponse()
    }

    return NextResponse.json({ data })
  } catch (err) {
    logServerError(err, `GET /api/campaigns/${id}`)
    return serverErrorResponse()
  }
}

// ─── PATCH /api/campaigns/[id] ───────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()
  if (auth.role !== 'admin') return forbiddenResponse()

  const { id } = params

  let body: unknown
  try { body = await request.json() } catch {
    return validationErrorResponse('JSON inválido')
  }

  const parsed = CampaignPatchSchema.safeParse(body)
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0].message)
  }

  const supabase = getService()

  try {
    const updates: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }

    // Si se pausa → registrar timestamp
    if (parsed.data.status === 'paused') {
      updates.paused_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logServerError(error, `PATCH /api/campaigns/${id}`)
      return serverErrorResponse()
    }

    logCampaignChange(id, `status_changed_to_${parsed.data.status ?? parsed.data.semaphore_color}`, auth.userId)
    return NextResponse.json({ data })
  } catch (err) {
    logServerError(err, `PATCH /api/campaigns/${id}`)
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
