import { eq, desc, count } from 'drizzle-orm'
import { db } from '../db'
import { products } from '../schema'

export async function getProducts(page = 1, limit = 20) {
  const offset = (page - 1) * limit
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(products).orderBy(desc(products.created_at)).limit(limit).offset(offset),
    db.select({ total: count() }).from(products),
  ])
  return { data: rows, total: Number(total), page, limit }
}

export async function getProductsByVendor(vendorId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(products)
      .where(eq(products.vendor_id, vendorId))
      .orderBy(desc(products.created_at))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(products).where(eq(products.vendor_id, vendorId)),
  ])
  return { data: rows, total: Number(total), page, limit }
}

export async function getProductById(id: string) {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1)
  return rows[0] ?? null
}

export async function createProduct(data: {
  vendor_id:    string
  name:         string
  description?: string
  price?:       number
  category?:    string
  images?:      string[]
}) {
  const rows = await db.insert(products).values({ ...data, status: 'pending' }).returning()
  return rows[0]
}

export async function updateProductStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  rejection_reason?: string
) {
  const rows = await db
    .update(products)
    .set({ status, rejection_reason: rejection_reason ?? null })
    .where(eq(products.id, id))
    .returning()
  return rows[0] ?? null
}

export async function updateProductScore(
  id: string,
  score: number,
  breakdown: Record<string, number>
) {
  const rows = await db
    .update(products)
    .set({ product_score: score, score_breakdown: breakdown, scored_at: new Date() })
    .where(eq(products.id, id))
    .returning()
  return rows[0] ?? null
}
