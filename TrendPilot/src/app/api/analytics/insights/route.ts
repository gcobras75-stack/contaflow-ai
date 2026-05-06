// GET /api/analytics/insights — Creative insights de Motion

import { NextResponse } from 'next/server'
import { getCreativeInsights } from '@/lib/motion'

export async function GET() {
  try {
    const insights = await getCreativeInsights()
    return NextResponse.json(insights)
  } catch (error) {
    console.error('[Analytics] Error en insights:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
