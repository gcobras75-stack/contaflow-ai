import { eq, desc, count } from 'drizzle-orm'
import { db } from '../db'
import { campaigns, products, vendors } from '../schema'

export async function getCampaigns(page = 1, limit = 20) {
  const offset = (page - 1) * limit
  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id:                 campaigns.id,
      name:               campaigns.name,
      platform:           campaigns.platform,
      status:             campaigns.status,
      semaphore_color:    campaigns.semaphore_color,
      budget_total:       campaigns.budget_total,
      budget_spent:       campaigns.budget_spent,
      sales_generated:    campaigns.sales_generated,
      commissions_earned: campaigns.commissions_earned,
      pause_reason:       campaigns.pause_reason,
      created_at:         campaigns.created_at,
      paused_at:          campaigns.paused_at,
      vendor_id:          campaigns.vendor_id,
      product_id:         campaigns.product_id,
    })
      .from(campaigns)
      .orderBy(desc(campaigns.created_at))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(campaigns),
  ])
  return { data: rows, total: Number(total), page, limit }
}

export async function getCampaignsByVendor(vendorId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(campaigns)
      .where(eq(campaigns.vendor_id, vendorId))
      .orderBy(desc(campaigns.created_at))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(campaigns).where(eq(campaigns.vendor_id, vendorId)),
  ])
  return { data: rows, total: Number(total), page, limit }
}

export async function getCampaignById(id: string) {
  const rows = await db
    .select({
      id:                 campaigns.id,
      name:               campaigns.name,
      platform:           campaigns.platform,
      status:             campaigns.status,
      semaphore_color:    campaigns.semaphore_color,
      budget_total:       campaigns.budget_total,
      budget_spent:       campaigns.budget_spent,
      budget_fund:        campaigns.budget_fund,
      sales_generated:    campaigns.sales_generated,
      commissions_earned: campaigns.commissions_earned,
      audience_data:      campaigns.audience_data,
      ai_suggestions:     campaigns.ai_suggestions,
      pause_reason:       campaigns.pause_reason,
      created_at:         campaigns.created_at,
      paused_at:          campaigns.paused_at,
      vendor_id:          campaigns.vendor_id,
      product_id:         campaigns.product_id,
    })
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function createCampaign(data: typeof campaigns.$inferInsert) {
  const rows = await db.insert(campaigns).values(data).returning()
  return rows[0]
}

export async function updateCampaignStatus(
  id: string,
  updates: Partial<Pick<typeof campaigns.$inferInsert,
    'status' | 'semaphore_color' | 'pause_reason' | 'paused_at' | 'budget_total' | 'audience_data' | 'ai_suggestions'>>
) {
  const rows = await db.update(campaigns).set(updates).where(eq(campaigns.id, id)).returning()
  return rows[0] ?? null
}

export async function getSemaphoreCount() {
  const rows = await db
    .select({ semaphore_color: campaigns.semaphore_color, count: count() })
    .from(campaigns)
    .groupBy(campaigns.semaphore_color)
  const result = { green: 0, yellow: 0, red: 0 }
  rows.forEach(({ semaphore_color, count: c }) => {
    if (semaphore_color && semaphore_color in result) {
      result[semaphore_color as keyof typeof result] = Number(c)
    }
  })
  return result
}
