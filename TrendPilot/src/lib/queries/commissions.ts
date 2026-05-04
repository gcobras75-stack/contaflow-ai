import { eq, desc, count } from 'drizzle-orm'
import { db } from '../db'
import { commissions } from '../schema'

export async function getCommissions(page = 1, limit = 20) {
  const offset = (page - 1) * limit
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(commissions).orderBy(desc(commissions.created_at)).limit(limit).offset(offset),
    db.select({ total: count() }).from(commissions),
  ])
  return { data: rows, total: Number(total), page, limit }
}

export async function getCommissionsByVendor(vendorId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(commissions)
      .where(eq(commissions.vendor_id, vendorId))
      .orderBy(desc(commissions.created_at))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(commissions).where(eq(commissions.vendor_id, vendorId)),
  ])
  return { data: rows, total: Number(total), page, limit }
}

export async function createCommission(data: typeof commissions.$inferInsert) {
  const rows = await db.insert(commissions).values(data).returning()
  return rows[0]
}

export async function markCommissionPaid(id: string, transferId: string) {
  const rows = await db
    .update(commissions)
    .set({ status: 'paid', paid_at: new Date(), mercadopago_transfer_id: transferId })
    .where(eq(commissions.id, id))
    .returning()
  return rows[0] ?? null
}
