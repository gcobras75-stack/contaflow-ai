import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { guardRoute, forbiddenResponse, serverErrorResponse, validationErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { VendorCreateSchema, PaginationSchema } from '@/lib/schemas'

// GET /api/vendors — lista vendedores (admin ve todos, vendor ve solo el suyo)
export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'vendors')
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

    let query = supabase
      .from('vendors')
      .select('id,name,email,phone,trust_score,status,plan,total_sales,created_at', { count: 'exact' })

    // Vendor solo ve su propio registro
    if (auth.role !== 'admin' && auth.vendorId) {
      query = query.eq('id', auth.vendorId)
    } else if (auth.role !== 'admin') {
      // Vendor sin vendor_id asignado aún → sin datos
      return NextResponse.json({ data: [], pagination: { page, limit, total: 0 } })
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logServerError(error, 'GET /api/vendors')
      return serverErrorResponse()
    }

    return NextResponse.json({
      data,
      pagination: { page, limit, total: count ?? 0 },
    })
  } catch (error) {
    logServerError(error, 'GET /api/vendors')
    return serverErrorResponse()
  }
}

// POST /api/vendors — crear vendor (solo admin)
export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'vendors')
  if (guard instanceof NextResponse) return guard

  const { auth } = guard

  // Solo admin puede crear vendors
  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const body = await request.json()
    const parsed = VendorCreateSchema.safeParse(body)

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues.map(i => i.message).join(', '))
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('vendors')
      .insert(parsed.data)
      .select()
      .single()

    if (error) {
      logServerError(error, 'POST /api/vendors')
      return serverErrorResponse()
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    logServerError(error, 'POST /api/vendors')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
