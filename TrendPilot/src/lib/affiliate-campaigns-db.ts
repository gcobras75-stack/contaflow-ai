// Gestión de estado de las 5 campañas afiliadas en Neon DB
// Usa la tabla campaigns existente con audience_data como metadata

import { db } from './db'
import { campaigns } from './schema'
import { eq, and } from 'drizzle-orm'
import { pauseCampaign, resumeCampaign, updateBudget } from './metaads'

// Metadata que identificamos en audience_data
export interface AffiliateMeta {
  is_affiliate:    true
  affiliate_index: number    // 1-5
  slug:            string
  emoji:           string
  comparator:      string
  min_price:       number
  meta_campaign_id?: string
}

// Vista pública de una campaña afiliada
export interface AffiliateRow {
  id:           string
  index:        number
  name:         string
  slug:         string
  emoji:        string
  comparator:   string
  min_price:    number
  status:       'active' | 'paused'
  budget_day:   number   // MXN/día
  spent_today:  number   // MXN simulado
  impressions:  number
  clicks:       number
  roi:          number
  commissions:  number   // MXN hoy
  meta_id:      string
}

// Seed de las 5 campañas — se inserta solo si no existen
const AFFILIATE_SEED = [
  { index: 1, name: 'Airfryer Sin Aceite', emoji: '🥘', slug: 'airfryer-sin-aceite',      minPrice: 799,  metaId: 'mock_camp_airfryer_001'  },
  { index: 2, name: 'Smartwatch Deportivo',emoji: '⌚', slug: 'smartwatch-deportivo',      minPrice: 499,  metaId: 'mock_camp_smartwatch_002' },
  { index: 3, name: 'Teclado Mecánico Gamer',emoji:'🎮',slug:'teclado-mecanico-gamer',    minPrice: 549,  metaId: 'mock_camp_teclado_003'   },
  { index: 4, name: 'Suero Vitamina C',    emoji: '✨', slug: 'suero-vitamina-c',          minPrice: 279,  metaId: 'mock_camp_suero_004'     },
  { index: 5, name: 'GPS para Mascotas',   emoji: '🐾', slug: 'gps-mascotas',              minPrice: 399,  metaId: 'mock_camp_gps_005'       },
]

// Mock stats por índice (valores realistas para la demo)
const MOCK_STATS: Record<number, { spent: number; imp: number; clicks: number; roi: number; comm: number }> = {
  1: { spent: 32,  imp: 8_432,  clicks: 201, roi: 210, comm: 89  },
  2: { spent: 18,  imp: 4_210,  clicks: 98,  roi: 175, comm: 52  },
  3: { spent: 0,   imp: 0,      clicks: 0,   roi: 0,   comm: 0   },
  4: { spent: 0,   imp: 0,      clicks: 0,   roi: 0,   comm: 0   },
  5: { spent: 0,   imp: 0,      clicks: 0,   roi: 0,   comm: 0   },
}

// ─── Asegura que existan los 5 registros en DB ────────────────────────────────

export async function ensureAffiliateCampaigns(): Promise<void> {
  for (const seed of AFFILIATE_SEED) {
    const meta: AffiliateMeta = {
      is_affiliate:    true,
      affiliate_index: seed.index,
      slug:            seed.slug,
      emoji:           seed.emoji,
      comparator:      `trendpilot.marketing/p/${seed.slug}`,
      min_price:       seed.minPrice,
      meta_campaign_id: seed.metaId,
    }

    // Busca si ya existe
    const existing = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(eq(campaigns.name, `${seed.name} — Afiliado`))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(campaigns).values({
        name:           `${seed.name} — Afiliado`,
        platform:       'meta',
        status:         'red',
        semaphore_color:'red',
        budget_total:   10_000,   // $100 MXN en centavos
        budget_spent:   0,
        audience_data:  meta as unknown as Record<string, unknown>,
      })
    }
  }
}

// ─── Lee las 5 campañas afiliadas ─────────────────────────────────────────────

export async function getAffiliateCampaigns(): Promise<AffiliateRow[]> {
  await ensureAffiliateCampaigns()

  const rows = await db
    .select({
      id:           campaigns.id,
      name:         campaigns.name,
      status:       campaigns.semaphore_color,
      budget_total: campaigns.budget_total,
      audience_data: campaigns.audience_data,
    })
    .from(campaigns)
    .orderBy(campaigns.created_at)

  const result: AffiliateRow[] = []
  for (const row of rows) {
    const meta = row.audience_data as unknown as AffiliateMeta | null
    if (!meta?.is_affiliate) continue

    const idx   = meta.affiliate_index
    const stats = MOCK_STATS[idx] ?? { spent: 0, imp: 0, clicks: 0, roi: 0, comm: 0 }

    result.push({
      id:          row.id,
      index:       idx,
      name:        meta.slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      slug:        meta.slug,
      emoji:       meta.emoji,
      comparator:  meta.comparator,
      min_price:   meta.min_price,
      status:      (row.status === 'green' || row.status === 'yellow') ? 'active' : 'paused',
      budget_day:  (row.budget_total ?? 10_000) / 100,
      spent_today: stats.spent,
      impressions: stats.imp,
      clicks:      stats.clicks,
      roi:         stats.roi,
      commissions: stats.comm,
      meta_id:     meta.meta_campaign_id ?? `mock_${idx}`,
    })
  }

  // Ordenar por índice
  return result.sort((a, b) => a.index - b.index)
}

// ─── Activa una campaña ───────────────────────────────────────────────────────

export async function activateAffiliateCampaign(index: number): Promise<AffiliateRow | null> {
  await ensureAffiliateCampaigns()

  const all = await getAffiliateCampaigns()
  const camp = all.find((c) => c.index === index)
  if (!camp) return null

  // Actualizar en DB
  await db
    .update(campaigns)
    .set({ status: 'green', semaphore_color: 'green', paused_at: null })
    .where(eq(campaigns.id, camp.id))

  // Llamar Meta API (no-op en modo mock)
  await resumeCampaign(camp.meta_id)

  // Actualizar mock stats
  if (MOCK_STATS[index]) {
    if (MOCK_STATS[index].roi === 0) {
      MOCK_STATS[index] = { spent: 5, imp: 1_200, clicks: 28, roi: 85, comm: 12 }
    }
  }

  return { ...camp, status: 'active' }
}

// ─── Pausa una campaña ────────────────────────────────────────────────────────

export async function pauseAffiliateCampaign(index: number): Promise<AffiliateRow | null> {
  await ensureAffiliateCampaigns()

  const all = await getAffiliateCampaigns()
  const camp = all.find((c) => c.index === index)
  if (!camp) return null

  await db
    .update(campaigns)
    .set({ status: 'red', semaphore_color: 'red', paused_at: new Date() })
    .where(eq(campaigns.id, camp.id))

  await pauseCampaign(camp.meta_id)

  return { ...camp, status: 'paused' }
}

// ─── Actualiza presupuesto ────────────────────────────────────────────────────

export async function updateAffiliateBudget(index: number, dayMXN: number): Promise<AffiliateRow | null> {
  await ensureAffiliateCampaigns()

  const all = await getAffiliateCampaigns()
  const camp = all.find((c) => c.index === index)
  if (!camp) return null

  const cents = dayMXN * 100

  await db
    .update(campaigns)
    .set({ budget_total: cents })
    .where(eq(campaigns.id, camp.id))

  await updateBudget(camp.meta_id, cents)

  return { ...camp, budget_day: dayMXN }
}

// ─── Activa todas las pausadas ────────────────────────────────────────────────

export async function activateAllAffiliateCampaigns(): Promise<AffiliateRow[]> {
  await ensureAffiliateCampaigns()
  const all = await getAffiliateCampaigns()
  const paused = all.filter((c) => c.status === 'paused')
  const activated: AffiliateRow[] = []
  for (const c of paused) {
    const result = await activateAffiliateCampaign(c.index)
    if (result) activated.push(result)
  }
  return activated
}

// ─── Pausa todas las activas ──────────────────────────────────────────────────

export async function pauseAllAffiliateCampaigns(): Promise<AffiliateRow[]> {
  await ensureAffiliateCampaigns()
  const all = await getAffiliateCampaigns()
  const active = all.filter((c) => c.status === 'active')
  const paused: AffiliateRow[] = []
  for (const c of active) {
    const result = await pauseAffiliateCampaign(c.index)
    if (result) paused.push(result)
  }
  return paused
}
