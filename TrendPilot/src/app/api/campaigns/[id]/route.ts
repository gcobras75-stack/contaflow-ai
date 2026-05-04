import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import {
  verifyAuth,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-auth'
import { logServerError, logCampaignChange } from '@/lib/logger'
import { db } from '@/lib/db'
import { products, vendors } from '@/lib/schema'
import { getCampaignById, updateCampaignStatus } from '@/lib/queries/campaigns'

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

  const { id } = params

  try {
    const campaign = await getCampaignById(id)

    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    }

    // Vendor solo puede ver sus propias campañas
    if (auth.role !== 'admin' && campaign.vendor_id !== auth.vendorId) {
      return forbiddenResponse()
    }

    // Obtener producto y vendor relacionados
    const [productRows, vendorRows] = await Promise.all([
      campaign.product_id
        ? db.select({ id: products.id, name: products.name, price: products.price, category: products.category, images: products.images })
            .from(products).where(eq(products.id, campaign.product_id)).limit(1)
        : Promise.resolve([]),
      campaign.vendor_id
        ? db.select({ id: vendors.id, name: vendors.name, email: vendors.email, whatsapp_number: vendors.whatsapp_number })
            .from(vendors).where(eq(vendors.id, campaign.vendor_id)).limit(1)
        : Promise.resolve([]),
    ])

    return NextResponse.json({
      data: {
        ...campaign,
        products: productRows[0] ?? null,
        vendors:  vendorRows[0]  ?? null,
      },
    })
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

  try {
    const updates: Parameters<typeof updateCampaignStatus>[1] = { ...parsed.data }

    if (parsed.data.status === 'paused') {
      updates.paused_at = new Date()
    }

    const data = await updateCampaignStatus(id, updates)

    if (!data) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
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
