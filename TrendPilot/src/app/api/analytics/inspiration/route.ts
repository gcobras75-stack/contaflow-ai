// GET /api/analytics/inspiration?niche=moda — Anuncios inspiración de Motion

import { NextRequest, NextResponse } from 'next/server'
import { getInspirationAds } from '@/lib/motion'

export async function GET(request: NextRequest) {
  const niche = request.nextUrl.searchParams.get('niche') ?? 'moda'

  try {
    const ads = await getInspirationAds(niche)
    return NextResponse.json({ ads })
  } catch (error) {
    console.error('[Analytics] Error en inspiration:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
