// /api/lead-finder/[id] — Actualizar lead: estado, propuesta, canal
import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, forbiddenResponse, serverErrorResponse, validationErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { getLeadById, updateLead } from '@/lib/queries/leads'
import { generateProposal } from '@/lib/leadfinder'
import { sendWhatsApp } from '@/lib/twilio'
import { z } from 'zod'

const UpdateSchema = z.object({
  status:          z.enum(['new', 'contacted', 'responded', 'converted', 'discarded']).optional(),
  contact_channel: z.enum(['whatsapp', 'email', 'ml']).optional(),
  response_text:   z.string().max(2000).optional(),
  vendor_id:       z.string().uuid().optional(),
  // generar y/o enviar propuesta
  generate_proposal: z.boolean().optional(),
  send_proposal:     z.boolean().optional(),
  proposal_text:     z.string().max(2000).optional(),  // override manual
})

// PATCH /api/lead-finder/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const lead = await getLeadById(params.id)
    if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })

    const body   = await request.json().catch(() => ({}))
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const updates = parsed.data
    const patch: Parameters<typeof updateLead>[1] = {}

    if (updates.status)          patch.status          = updates.status
    if (updates.contact_channel) patch.contact_channel = updates.contact_channel
    if (updates.vendor_id)       patch.vendor_id        = updates.vendor_id

    if (updates.response_text) {
      patch.response_text = updates.response_text
      patch.response_at   = new Date()
      patch.status        = 'responded'
    }

    // Generar propuesta con Claude
    let proposalText = updates.proposal_text ?? lead.proposal_text ?? null
    if (updates.generate_proposal) {
      const channel = updates.contact_channel ?? lead.contact_channel ?? 'whatsapp'
      proposalText  = await generateProposal(channel as 'whatsapp' | 'email' | 'ml', {
        seller_name:     lead.seller_name,
        product_name:    lead.product_name,
        estimated_sales: lead.estimated_sales,
        city:            lead.city ?? undefined,
      })
      patch.proposal_text = proposalText
    }

    // Enviar propuesta por WhatsApp si hay número
    if (updates.send_proposal && proposalText) {
      const phone = lead.phone
      if (phone) {
        await sendWhatsApp({ to: phone, body: proposalText }).catch((err) =>
          logServerError(err, `PATCH /api/lead-finder/${params.id} — sendWhatsApp`)
        )
      }
      patch.proposal_sent_at = new Date()
      patch.status           = 'contacted'
    }

    const updated = await updateLead(params.id, patch)
    return NextResponse.json({ data: updated })
  } catch (err) {
    logServerError(err, `PATCH /api/lead-finder/${params.id}`)
    return serverErrorResponse()
  }
}

// GET /api/lead-finder/[id] — detalle de un lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const lead = await getLeadById(params.id)
    if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
    return NextResponse.json({ data: lead })
  } catch (err) {
    logServerError(err, `GET /api/lead-finder/${params.id}`)
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
