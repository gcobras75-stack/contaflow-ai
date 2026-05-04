import { desc, gt } from 'drizzle-orm'
import { db } from '../db'
import { trends } from '../schema'

export async function getTrends(limit = 20) {
  return db
    .select()
    .from(trends)
    .orderBy(desc(trends.trend_score))
    .limit(limit)
}

export async function getLastFetchTime() {
  const rows = await db
    .select({ detected_at: trends.detected_at })
    .from(trends)
    .orderBy(desc(trends.detected_at))
    .limit(1)
  return rows[0]?.detected_at ?? null
}

export async function saveTrends(items: Array<{
  keyword:         string
  category?:       string
  trend_score:     number
  source:          'google' | 'mercadolibre' | 'tiktok'
  historical_data?: Record<string, unknown>
  is_early_signal?: boolean
}>) {
  if (items.length === 0) return []
  return db.insert(trends).values(items).returning()
}
