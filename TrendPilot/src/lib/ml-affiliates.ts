// ml-affiliates.ts — Registrar y consultar comisiones de redes afiliadas
// Redes soportadas: mercadolibre, shein, temu, aliexpress
// Split automático: 70% operador / 30% GrowthFund (Antonio)

import { neon }                   from '@neondatabase/serverless'
import { db }                     from '@/lib/db'
import { affiliateCommissions }   from '@/lib/schema'
import { eq }                     from 'drizzle-orm'

type Network = 'mercadolibre' | 'shein' | 'temu' | 'aliexpress'

export interface RecordCommissionInput {
  network:        Network
  transactionId:  string
  productName:    string
  saleAmount:     number    // MXN
  commissionRate: number    // porcentaje, ej. 6 o 20
  campaignSlug?:  string
  saleDate:       Date
  status?:        'pending' | 'approved' | 'rejected' | 'paid'
  rawData?:       Record<string, unknown>
}

export interface RecordCommissionResult {
  commissionAmount: number
  operatorShare:    number
  antonioShare:     number
}

// ── Registrar una comisión nueva ───────────────────────────────────────────────

export async function recordCommission(
  input: RecordCommissionInput,
): Promise<RecordCommissionResult> {
  const commissionAmount = input.saleAmount * (input.commissionRate / 100)
  const operatorShare    = commissionAmount * 0.70
  const antonioShare     = commissionAmount * 0.30

  // Buscar campaign_id por slug si se proporciona
  let campaignId: number | null = null
  if (input.campaignSlug) {
    try {
      const sql  = neon(process.env.DATABASE_URL!)
      const rows = await sql`
        SELECT id FROM affiliate_campaigns
        WHERE slug = ${input.campaignSlug}
        LIMIT 1
      ` as Array<{ id: number }>
      campaignId = rows[0]?.id ?? null
    } catch {
      // No bloquea si no se encuentra la campaña
    }
  }

  await db.insert(affiliateCommissions).values({
    campaign_id:       campaignId,
    network:           input.network,
    transaction_id:    input.transactionId,
    product_name:      input.productName,
    sale_amount:       String(input.saleAmount),
    commission_rate:   String(input.commissionRate),
    commission_amount: String(commissionAmount),
    operator_share:    String(operatorShare),
    antonio_share:     String(antonioShare),
    sale_date:         input.saleDate,
    status:            input.status ?? 'pending',
    raw_data:          input.rawData ?? {},
  }).onConflictDoNothing()

  return { commissionAmount, operatorShare, antonioShare }
}

// ── Obtener resumen de comisiones por período ─────────────────────────────────

export async function getAffiliateCommissionSummary(opts: {
  period?:  'this_month' | 'last_7d' | 'last_30d'
  network?: string
  status?:  string
}) {
  const sql  = neon(process.env.DATABASE_URL!)
  const now  = new Date()

  let since: Date
  switch (opts.period) {
    case 'last_7d':   since = new Date(now.getTime() - 7  * 86400000); break
    case 'last_30d':  since = new Date(now.getTime() - 30 * 86400000); break
    default:
      since = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  // Queries separadas por combinación de filtros — evita sql.unsafe
  const network = opts.network ?? null
  const status  = opts.status  ?? null

  const rows = network && status
    ? await sql`SELECT network, status, COUNT(*)::int AS count, COALESCE(SUM(commission_amount),0) AS commission_total, COALESCE(SUM(operator_share),0) AS operator_total, COALESCE(SUM(antonio_share),0) AS antonio_total FROM affiliate_commissions WHERE created_at >= ${since.toISOString()} AND network = ${network} AND status = ${status} GROUP BY network, status` as Array<{ network: string; status: string; count: number; commission_total: string; operator_total: string; antonio_total: string }>
    : network
    ? await sql`SELECT network, status, COUNT(*)::int AS count, COALESCE(SUM(commission_amount),0) AS commission_total, COALESCE(SUM(operator_share),0) AS operator_total, COALESCE(SUM(antonio_share),0) AS antonio_total FROM affiliate_commissions WHERE created_at >= ${since.toISOString()} AND network = ${network} GROUP BY network, status` as Array<{ network: string; status: string; count: number; commission_total: string; operator_total: string; antonio_total: string }>
    : status
    ? await sql`SELECT network, status, COUNT(*)::int AS count, COALESCE(SUM(commission_amount),0) AS commission_total, COALESCE(SUM(operator_share),0) AS operator_total, COALESCE(SUM(antonio_share),0) AS antonio_total FROM affiliate_commissions WHERE created_at >= ${since.toISOString()} AND status = ${status} GROUP BY network, status` as Array<{ network: string; status: string; count: number; commission_total: string; operator_total: string; antonio_total: string }>
    : await sql`SELECT network, status, COUNT(*)::int AS count, COALESCE(SUM(commission_amount),0) AS commission_total, COALESCE(SUM(operator_share),0) AS operator_total, COALESCE(SUM(antonio_share),0) AS antonio_total FROM affiliate_commissions WHERE created_at >= ${since.toISOString()} GROUP BY network, status` as Array<{ network: string; status: string; count: number; commission_total: string; operator_total: string; antonio_total: string }>

  // Totales globales
  const totalRows = network
    ? await sql`SELECT COALESCE(SUM(commission_amount),0) AS total, COALESCE(SUM(CASE WHEN status IN ('approved','paid') THEN commission_amount ELSE 0 END),0) AS approved, COALESCE(SUM(CASE WHEN status='pending' THEN commission_amount ELSE 0 END),0) AS pending, COALESCE(SUM(operator_share),0) AS operator_total, COALESCE(SUM(antonio_share),0) AS antonio_total FROM affiliate_commissions WHERE created_at >= ${since.toISOString()} AND network = ${network}` as Array<{ total: string; approved: string; pending: string; operator_total: string; antonio_total: string }>
    : await sql`SELECT COALESCE(SUM(commission_amount),0) AS total, COALESCE(SUM(CASE WHEN status IN ('approved','paid') THEN commission_amount ELSE 0 END),0) AS approved, COALESCE(SUM(CASE WHEN status='pending' THEN commission_amount ELSE 0 END),0) AS pending, COALESCE(SUM(operator_share),0) AS operator_total, COALESCE(SUM(antonio_share),0) AS antonio_total FROM affiliate_commissions WHERE created_at >= ${since.toISOString()}` as Array<{ total: string; approved: string; pending: string; operator_total: string; antonio_total: string }>

  // Últimas 10 comisiones
  const recent = network && status
    ? await sql`SELECT id, network, product_name, sale_amount, commission_amount, operator_share, antonio_share, status, sale_date, created_at FROM affiliate_commissions WHERE created_at >= ${since.toISOString()} AND network = ${network} AND status = ${status} ORDER BY created_at DESC LIMIT 10`
    : network
    ? await sql`SELECT id, network, product_name, sale_amount, commission_amount, operator_share, antonio_share, status, sale_date, created_at FROM affiliate_commissions WHERE created_at >= ${since.toISOString()} AND network = ${network} ORDER BY created_at DESC LIMIT 10`
    : status
    ? await sql`SELECT id, network, product_name, sale_amount, commission_amount, operator_share, antonio_share, status, sale_date, created_at FROM affiliate_commissions WHERE created_at >= ${since.toISOString()} AND status = ${status} ORDER BY created_at DESC LIMIT 10`
    : await sql`SELECT id, network, product_name, sale_amount, commission_amount, operator_share, antonio_share, status, sale_date, created_at FROM affiliate_commissions WHERE created_at >= ${since.toISOString()} ORDER BY created_at DESC LIMIT 10`

  // Agrupar por red
  const byNetwork: Record<string, number> = {}
  for (const r of rows) {
    byNetwork[r.network] = (byNetwork[r.network] ?? 0) + parseFloat(r.commission_total)
  }

  const t = totalRows[0] ?? { total: '0', approved: '0', pending: '0', operator_total: '0', antonio_total: '0' }

  return {
    total_commissions:    parseFloat(t.total),
    approved_commissions: parseFloat(t.approved),
    pending_commissions:  parseFloat(t.pending),
    operator_total:       parseFloat(t.operator_total),
    antonio_total:        parseFloat(t.antonio_total),
    by_network:           byNetwork,
    recent,
  }
}
