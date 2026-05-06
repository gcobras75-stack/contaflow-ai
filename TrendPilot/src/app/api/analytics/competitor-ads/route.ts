// GET /api/analytics/competitor-ads?domain=ejemplo.com — Anuncios de competidor (Motion)

import { NextRequest, NextResponse } from 'next/server'
import { getCompetitorAds } from '@/lib/motion'

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain') ?? ''

  if (!domain) {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 })
  }

  try {
    const ads = await getCompetitorAds(domain)
    return NextResponse.json({ ads })
  } catch (error) {
    console.error('[Analytics] Error en competitor-ads:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
