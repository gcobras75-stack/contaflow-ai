import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, serverErrorResponse, validationErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { PaginationSchema } from '@/lib/schemas'
import { getCommissions, getCommissionsByVendor } from '@/lib/queries/commissions'

// GET /api/commissions — vendor ve sus comisiones, admin ve todas
export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'vendors')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  try {
    const url    = new URL(request.url)
    const parsed = PaginationSchema.safeParse({ page: url.searchParams.get('page'), limit: url.searchParams.get('limit') })
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const { page, limit } = parsed.data

    if (auth.role !== 'admin') {
      if (!auth.vendorId) return NextResponse.json({ data: [], pagination: { page, limit, total: 0 } })
      const result = await getCommissionsByVendor(auth.vendorId, page, limit)
      return NextResponse.json({ data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total } })
    }

    const result = await getCommissions(page, limit)
    return NextResponse.json({ data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total } })
  } catch (error) {
    logServerError(error, 'GET /api/commissions')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
