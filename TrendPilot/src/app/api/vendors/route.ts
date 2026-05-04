import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, forbiddenResponse, serverErrorResponse, validationErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { VendorCreateSchema, PaginationSchema } from '@/lib/schemas'
import { getVendors, getVendorById, createVendor } from '@/lib/queries/vendors'

// GET /api/vendors — lista vendedores (admin ve todos, vendor ve solo el suyo)
export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'vendors')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  try {
    const url    = new URL(request.url)
    const parsed = PaginationSchema.safeParse({
      page:  url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
    })
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const { page, limit } = parsed.data

    if (auth.role !== 'admin') {
      if (!auth.vendorId) return NextResponse.json({ data: [], pagination: { page, limit, total: 0 } })
      const vendor = await getVendorById(auth.vendorId)
      return NextResponse.json({ data: vendor ? [vendor] : [], pagination: { page, limit, total: vendor ? 1 : 0 } })
    }

    const result = await getVendors(page, limit)
    return NextResponse.json({ data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total } })
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

  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const body   = await request.json()
    const parsed = VendorCreateSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues.map((i) => i.message).join(', '))

    const data = await createVendor(parsed.data as Parameters<typeof createVendor>[0])
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    logServerError(error, 'POST /api/vendors')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
