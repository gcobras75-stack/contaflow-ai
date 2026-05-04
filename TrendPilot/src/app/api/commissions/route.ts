import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { guardRoute, serverErrorResponse, validationErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { PaginationSchema } from '@/lib/schemas'

// GET /api/commissions — vendor ve sus comisiones, admin ve todas
// Nadie puede crear/editar comisiones via API — solo service_role (workers)
export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'vendors') // usa límite de vendors (30/min)
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

    // Campos expuestos — nunca exponer mercadopago_transfer_id completo
    const fields = 'id,campaign_id,vendor_id,sale_amount,commission_rate,commission_amount,growth_fund_amount,status,created_at,paid_at'

    let query = supabase
      .from('commissions')
      .select(fields, { count: 'exact' })

    if (auth.role !== 'admin' && auth.vendorId) {
      query = query.eq('vendor_id', auth.vendorId)
    } else if (auth.role !== 'admin') {
      return NextResponse.json({ data: [], pagination: { page, limit, total: 0 } })
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logServerError(error, 'GET /api/commissions')
      return serverErrorResponse()
    }

    return NextResponse.json({
      data,
      pagination: { page, limit, total: count ?? 0 },
    })
  } catch (error) {
    logServerError(error, 'GET /api/commissions')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
