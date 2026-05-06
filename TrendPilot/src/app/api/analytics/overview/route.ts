// GET /api/analytics/overview — Resumen general de Supermetrics

import { NextResponse } from 'next/server'
import { getAccountOverview } from '@/lib/supermetrics'

export async function GET() {
  try {
    const overview = await getAccountOverview()
    return NextResponse.json(overview)
  } catch (error) {
    console.error('[Analytics] Error en overview:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
