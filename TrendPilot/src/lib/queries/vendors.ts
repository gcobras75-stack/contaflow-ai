import { eq, desc, count, sql } from 'drizzle-orm'
import { db } from '../db'
import { vendors } from '../schema'

export async function getVendors(page = 1, limit = 20) {
  const offset = (page - 1) * limit
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(vendors).orderBy(desc(vendors.created_at)).limit(limit).offset(offset),
    db.select({ total: count() }).from(vendors),
  ])
  return { data: rows, total: Number(total), page, limit }
}

export async function getVendorById(id: string) {
  const rows = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1)
  return rows[0] ?? null
}

export async function createVendor(data: {
  name:            string
  email:           string
  phone?:          string
  whatsapp_number?: string
  product_type?:   string
  plan:            'despegue' | 'piloto' | 'comandante' | 'flota'
  status?:         'pending' | 'active' | 'suspended'
}) {
  const rows = await db.insert(vendors).values({ ...data, status: data.status ?? 'active' }).returning()
  return rows[0]
}

export async function updateVendor(id: string, data: Partial<typeof vendors.$inferInsert>) {
  const rows = await db.update(vendors).set(data).where(eq(vendors.id, id)).returning()
  return rows[0] ?? null
}

export async function toggleVendorStatus(id: string, currentStatus: string) {
  const next = currentStatus === 'active' ? 'suspended' : 'active'
  const rows = await db
    .update(vendors)
    .set({ status: next as 'active' | 'suspended' })
    .where(eq(vendors.id, id))
    .returning()
  return rows[0] ?? null
}
