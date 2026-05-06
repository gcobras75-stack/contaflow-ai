// GET /api/analytics/top-ads — Top anuncios por CTR y ROAS (Supermetrics)

import { NextResponse } from 'next/server'
import { getTopPerformingAds } from '@/lib/supermetrics'

export async function GET() {
  try {
    const topAds = await getTopPerformingAds()
    return NextResponse.json(topAds)
  } catch (error) {
    console.error('[Analytics] Error en top-ads:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
