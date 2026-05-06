import { desc } from 'drizzle-orm'
import { db } from '../db'
import { trends } from '../schema'

export async function getTrends(limit = 20) {
  // Fetch extra rows to account for duplicate keywords in the table
  const rows = await db
    .select()
    .from(trends)
    .orderBy(desc(trends.trend_score))
    .limit(limit * 8)

  // Deduplicate by keyword (case-insensitive), keep highest-score row
  const seen = new Set<string>()
  const unique: typeof rows = []
  for (const row of rows) {
    const key = row.keyword.toLowerCase().trim()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(row)
    }
    if (unique.length >= limit) break
  }
  return unique
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
