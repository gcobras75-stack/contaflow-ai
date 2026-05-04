import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, forbiddenResponse, serverErrorResponse, validationErrorResponse } from '@/lib/api-auth'
import { logServerError, logCampaignChange } from '@/lib/logger'
import { CampaignCreateSchema, PaginationSchema } from '@/lib/schemas'
import { getCampaigns, getCampaignsByVendor, createCampaign } from '@/lib/queries/campaigns'

// GET /api/campaigns
export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'campaigns')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  try {
    const url    = new URL(request.url)
    const parsed = PaginationSchema.safeParse({ page: url.searchParams.get('page'), limit: url.searchParams.get('limit') })
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0].message)

    const { page, limit } = parsed.data

    if (auth.role !== 'admin') {
      if (!auth.vendorId) return NextResponse.json({ data: [], pagination: { page, limit, total: 0 } })
      const result = await getCampaignsByVendor(auth.vendorId, page, limit)
      return NextResponse.json({ data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total } })
    }

    const result = await getCampaigns(page, limit)
    return NextResponse.json({ data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total } })
  } catch (error) {
    logServerError(error, 'GET /api/campaigns')
    return serverErrorResponse()
  }
}

// POST /api/campaigns
export async function POST(request: NextRequest) {
  const guard = await guardRoute(request, 'campaigns')
  if (guard instanceof NextResponse) return guard
  const { auth } = guard

  if (auth.role !== 'admin') return forbiddenResponse()

  try {
    const body   = await request.json()
    const parsed = CampaignCreateSchema.safeParse(body)
    if (!parsed.success) return validationErrorResponse(parsed.error.issues.map((i) => i.message).join(', '))

    const data = await createCampaign({ ...parsed.data, semaphore_color: 'yellow', status: 'yellow' } as Parameters<typeof createCampaign>[0])
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
