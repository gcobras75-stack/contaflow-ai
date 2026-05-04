import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { guardRoute, forbiddenResponse, serverErrorResponse, validationErrorResponse } from '@/lib/api-auth'
import { logServerError, logCampaignChange } from '@/lib/logger'
import { CampaignCreateSchema, PaginationSchema } from '@/lib/schemas'

// GET /api/campaigns — vendor ve sus campañas, admin ve todas
export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'campaigns')
  if (guard instanceof NextResponse) return guard

  const { auth } = guard

  try {
    const url = new URL(request.url)
    const parsed = PaginationSchema.safeParse({
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
    })

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0].message)
    }

    const { page, limit } = parsed.data
    const offset = (page - 1) * limit

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const fields = 'id,product_id,vendor_id,platform,semaphore_color,budget_total,budget_spent,sales_generated,commissions_earned,created_at'

    let query = supabase
      .from('campaigns')
      .select(fields, { count: 'exact' })

    // Vendor solo ve sus campañas
    if (auth.role !== 'admin' && auth.vendorId) {
      query = query.eq('vendor_id', auth.vendorId)
    } else if (auth.role !== 'admin') {
      return NextResponse.json({ data: [], pagination: { page, limit, total: 0 } })
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logServerError(error, 'GET /api/campaigns')
      return serverErrorResponse()
    }

    return NextResponse.json({
      data,
      pagination: { page, limit, total: count ?? 0 },
    })
  } catch (error) {
    logServerError(error, 'GET /api/campaigns')
    return serverErrorResponse()
  }
}

// POST /api/campaigns — solo admin puede crear campañas
export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'campaigns')
  if (guard instanceof NextResponse) return guard

  const { auth } = guard

  // Vendors no pueden crear campañas directamente
  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const body = await request.json()
    const parsed = CampaignCreateSchema.safeParse(body)

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues.map(i => i.message).join(', '))
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('campaigns')
      .insert({ ...parsed.data, semaphore_color: 'yellow', status: 'yellow' })
      .select()
      .single()

    if (error) {
      logServerError(error, 'POST /api/campaigns')
      return serverErrorResponse()
    }

    logCampaignChange(data.id, 'created', auth.userId)
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    logServerError(error, 'POST /api/campaigns')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
