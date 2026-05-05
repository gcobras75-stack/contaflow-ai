// GET /api/google-ads/status — Verifica si Google Ads API está configurada

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth'
import { hasGoogleAdsCredentials } from '@/lib/google-ads'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth) return unauthorizedResponse()

  return NextResponse.json({
    connected:    hasGoogleAdsCredentials(),
    google_image: !!process.env.GOOGLE_API_KEY,
    mock_mode:    !hasGoogleAdsCredentials(),
  })
}
