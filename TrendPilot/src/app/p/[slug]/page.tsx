// Página comparadora pública — /p/[slug]
// Server Component: genera metadata OG para WhatsApp/Meta/TikTok
// El render interactivo lo maneja ComparatorClient (cliente)

import type { Metadata } from 'next'
import { notFound }      from 'next/navigation'
import { neon }          from '@neondatabase/serverless'
import { getProduct, getAllSlugs } from '@/lib/comparator-data'
import { ComparatorClient }        from './ComparatorClient'

export const revalidate = 900   // revalidar cada 15 min

// ── Rutas estáticas ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface CampaignMeta {
  product_price:     number
  commission_rate:   number
  affiliate_network: string
  affiliate_url:     string | null
}

async function getCampaignMeta(slug: string): Promise<CampaignMeta | null> {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      SELECT product_price, commission_rate, affiliate_network, affiliate_url
      FROM affiliate_campaigns
      WHERE slug = ${slug}
      LIMIT 1
    ` as Record<string, unknown>[]

    if (!rows.length) return null
    const r = rows[0]
    return {
      product_price:     Number(r.product_price    ?? 0),
      commission_rate:   Number(r.commission_rate  ?? 6),
      affiliate_network: String(r.affiliate_network ?? 'mercadolibre'),
      affiliate_url:     (r.affiliate_url as string | null) ?? null,
    }
  } catch {
    return null
  }
}

// ── OG Tags para WhatsApp / Meta / TikTok ─────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const product = getProduct(slug)

  if (!product) {
    return { title: 'Producto no encontrado — TrendPilot' }
  }

  const minPrice = Math.min(...product.options.map((o) => o.price))
  const maxPrice = Math.max(...product.options.map((o) => o.price))
  const title    = `${product.emoji} ${product.name} — Comparación de precios | TrendPilot`
  const desc     = `Desde $${minPrice} hasta $${maxPrice} MXN. ${product.searches_today.toLocaleString('es-MX')} personas buscaron esto hoy. Comparamos sin favoritismos.`

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url:         `https://trendpilot.marketing/p/${slug}`,
      siteName:    'TrendPilot',
      locale:      'es_MX',
      type:        'website',
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description: desc,
    },
  }
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default async function ComparatorPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const product  = getProduct(slug)

  if (!product) notFound()

  const campaignMeta = await getCampaignMeta(slug)

  return <ComparatorClient product={product} campaignMeta={campaignMeta} />
}
