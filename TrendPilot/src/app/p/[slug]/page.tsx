// Página comparadora pública — /p/[slug]
// Server Component: genera metadata OG para WhatsApp/Meta/TikTok
// El render interactivo lo maneja ComparatorClient (cliente)

import type { Metadata } from 'next'
import { notFound }      from 'next/navigation'
import { getProduct, getAllSlugs } from '@/lib/comparator-data'
import { ComparatorClient }        from './ComparatorClient'

// ── Rutas estáticas ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
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

  return <ComparatorClient product={product} />
}
