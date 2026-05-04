import { desc, eq, and, gte, lte, or, sql } from 'drizzle-orm'
import { db } from '../db'
import { leads } from '../schema'

export type LeadInsert = typeof leads.$inferInsert
export type LeadRow    = typeof leads.$inferSelect

export async function getLeads(opts: {
  page?:        number
  limit?:       number
  status?:      string
  temperature?: string
  source?:      string
  minScore?:    number
} = {}) {
  const { page = 1, limit = 50, status, temperature, source, minScore } = opts
  const offset = (page - 1) * limit

  const conditions = []
  if (status)      conditions.push(eq(leads.status, status as LeadRow['status']))
  if (temperature) conditions.push(eq(leads.lead_temperature, temperature as LeadRow['lead_temperature']))
  if (source)      conditions.push(eq(leads.source, source as LeadRow['source']))
  if (minScore !== undefined) conditions.push(gte(leads.lead_score, minScore))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, countResult] = await Promise.all([
    db.select().from(leads)
      .where(where)
      .orderBy(desc(leads.lead_score), desc(leads.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(leads).where(where),
  ])

  return { data: rows, total: countResult[0]?.count ?? 0, page, limit }
}

export async function getLeadById(id: string) {
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1)
  return rows[0] ?? null
}

export async function createLead(data: LeadInsert) {
  const rows = await db.insert(leads).values(data).returning()
  return rows[0]
}

export async function updateLead(id: string, data: Partial<LeadInsert>) {
  const rows = await db
    .update(leads)
    .set({ ...data, updated_at: new Date() })
    .where(eq(leads.id, id))
    .returning()
  return rows[0] ?? null
}

// Retorna seller_ids contactados en los últimos 30 días para deduplicación
export async function getRecentSellerIds(): Promise<string[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const rows = await db
    .select({ seller_id: leads.seller_id })
    .from(leads)
    .where(gte(leads.created_at, cutoff))
  return rows.map((r) => r.seller_id)
}

export async function getLeadStats() {
  const rows = await db.select({
    total:     sql<number>`count(*)::int`,
    hot:       sql<number>`count(*) filter (where lead_temperature = 'hot')::int`,
    warm:      sql<number>`count(*) filter (where lead_temperature = 'warm')::int`,
    contacted: sql<number>`count(*) filter (where status = 'contacted')::int`,
    responded: sql<number>`count(*) filter (where status = 'responded')::int`,
    today:     sql<number>`count(*) filter (where created_at >= now() - interval '24 hours')::int`,
  }).from(leads)
  return rows[0] ?? { total: 0, hot: 0, warm: 0, contacted: 0, responded: 0, today: 0 }
}

export async function upsertLeadBySellerId(sellerId: string, data: LeadInsert) {
  // Si ya existe un lead reciente (< 30 días), no duplica
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const existing = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.seller_id, sellerId), gte(leads.created_at, cutoff)))
    .limit(1)
  if (existing.length > 0) return null  // ya existe, skip
  return createLead(data)
}
