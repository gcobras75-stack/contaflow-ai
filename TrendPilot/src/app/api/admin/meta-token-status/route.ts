// GET /api/admin/meta-token-status — Estado del token de Meta Ads
import { NextRequest, NextResponse } from 'next/server'
import { guardRoute, forbiddenResponse, serverErrorResponse } from '@/lib/api-auth'
import { logServerError } from '@/lib/logger'
import { checkMetaToken, tokenSemaphore } from '@/lib/meta-token-manager'

export async function GET(request: NextRequest) {
  const guard = await guardRoute(request, 'default')
  if (guard instanceof NextResponse) return guard
  if (!guard.auth) return forbiddenResponse()
  if (guard.auth.role !== 'admin') return forbiddenResponse()

  try {
    const status    = await checkMetaToken()
    const semaphore = tokenSemaphore(status)
    return NextResponse.json({ ...status, semaphore })
  } catch (err) {
    logServerError(err, 'GET /api/admin/meta-token-status')
    return serverErrorResponse()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
