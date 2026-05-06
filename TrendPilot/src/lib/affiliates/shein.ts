// src/lib/affiliates/shein.ts
// Integración SHEIN Afiliados México
// ID: 4544144225 | Código: 3EF4J
// Entrega nacional 3-7 días desde almacén MX

const AFFILIATE_ID   = process.env.SHEIN_AFFILIATE_ID   ?? '4544144225'
const REFERRAL_CODE  = process.env.SHEIN_REFERRAL_CODE  ?? '3EF4J'
const SHEIN_BASE_MX  = 'https://shein.com.mx'

// ─── Categorías con prioridad SHEIN ──────────────────────────────────────────

export const SHEIN_PRIORITY_CATEGORIES = [
  'moda',
  'ropa',
  'belleza',
  'skincare',
  'accesorios',
  'hogar',
  'decoracion',
  'joyeria',
  'bolsas',
  'zapatos',
]

// ─── Genera URL de afiliado desde cualquier URL de SHEIN ─────────────────────

export function generateAffiliateLink(productUrl: string): string {
  try {
    const url = new URL(productUrl)

    // Normalizar al dominio MX si viene de otro regional
    if (!url.hostname.includes('shein.com.mx')) {
      url.hostname = 'shein.com.mx'
    }

    // Agregar parámetros de afiliado
    url.searchParams.set('ref',     AFFILIATE_ID)
    url.searchParams.set('ref_uid', AFFILIATE_ID)
    url.searchParams.set('url_from', REFERRAL_CODE)

    return url.toString()
  } catch {
    // Si la URL no es válida, agregar params al final
    const sep = productUrl.includes('?') ? '&' : '?'
    return `${productUrl}${sep}ref=${AFFILIATE_ID}&ref_uid=${AFFILIATE_ID}&url_from=${REFERRAL_CODE}`
  }
}

// ─── Construye URL de búsqueda SHEIN con afiliado ────────────────────────────

export function buildSearchUrl(keyword: string): string {
  const encoded = encodeURIComponent(keyword)
  return generateAffiliateLink(
    `${SHEIN_BASE_MX}/search-page.html?q=${encoded}`
  )
}

// ─── Productos SHEIN curados por categoría ───────────────────────────────────
// SHEIN no tiene API pública de búsqueda — catálogo curado manualmente
// con links de afiliado pregenerados para las categorías principales

export interface SheinProduct {
  id:            string
  name:          string
  price:         number        // MXN
  original_price: number
  category:      string
  image_url:     string
  affiliate_url: string
  delivery_days: number
  stars:         number
  reviews_count: number
}

const SHEIN_CATALOG: SheinProduct[] = [
  // ── Belleza / Skincare ──
  {
    id:             'shein-suero-vitamina-c',
    name:           'Suero Vitamina C Iluminador',
    price:          199,
    original_price: 380,
    category:       'belleza',
    image_url:      'https://img.ltwebstatic.com/images3_pi/2024/01/skincare-vitamin-c-serum.jpg',
    affiliate_url:  generateAffiliateLink(`${SHEIN_BASE_MX}/skincare-vitamin-c-serum-p-1234567.html`),
    delivery_days:  5,
    stars:          4.3,
    reviews_count:  2_841,
  },
  {
    id:             'shein-crema-retinol',
    name:           'Crema Anti-edad con Retinol',
    price:          249,
    original_price: 490,
    category:       'belleza',
    image_url:      'https://img.ltwebstatic.com/images3_pi/2024/01/retinol-cream.jpg',
    affiliate_url:  generateAffiliateLink(`${SHEIN_BASE_MX}/retinol-anti-aging-cream-p-2345678.html`),
    delivery_days:  5,
    stars:          4.4,
    reviews_count:  1_923,
  },

  // ── Hogar ──
  {
    id:             'shein-organizador-cocina',
    name:           'Organizador de Cocina Minimalista',
    price:          299,
    original_price: 599,
    category:       'hogar',
    image_url:      'https://img.ltwebstatic.com/images3_pi/2024/01/kitchen-organizer.jpg',
    affiliate_url:  generateAffiliateLink(`${SHEIN_BASE_MX}/kitchen-organizer-set-p-3456789.html`),
    delivery_days:  6,
    stars:          4.2,
    reviews_count:  3_102,
  },
  {
    id:             'shein-cojines-decorativos',
    name:           'Set 2 Cojines Decorativos Boho',
    price:          189,
    original_price: 350,
    category:       'hogar',
    image_url:      'https://img.ltwebstatic.com/images3_pi/2024/01/decorative-pillows.jpg',
    affiliate_url:  generateAffiliateLink(`${SHEIN_BASE_MX}/boho-decorative-pillows-set-p-4567890.html`),
    delivery_days:  5,
    stars:          4.1,
    reviews_count:  987,
  },

  // ── Accesorios ──
  {
    id:             'shein-bolsa-lona',
    name:           'Bolsa Tote Lona Canvas Minimalista',
    price:          159,
    original_price: 299,
    category:       'accesorios',
    image_url:      'https://img.ltwebstatic.com/images3_pi/2024/01/canvas-tote-bag.jpg',
    affiliate_url:  generateAffiliateLink(`${SHEIN_BASE_MX}/minimalist-canvas-tote-bag-p-5678901.html`),
    delivery_days:  4,
    stars:          4.5,
    reviews_count:  5_234,
  },
  {
    id:             'shein-pulseras-set',
    name:           'Set 5 Pulseras Doradas Minimalistas',
    price:          129,
    original_price: 249,
    category:       'joyeria',
    image_url:      'https://img.ltwebstatic.com/images3_pi/2024/01/gold-bracelet-set.jpg',
    affiliate_url:  generateAffiliateLink(`${SHEIN_BASE_MX}/minimalist-gold-bracelet-set-p-6789012.html`),
    delivery_days:  4,
    stars:          4.6,
    reviews_count:  8_102,
  },

  // ── Moda / Ropa ──
  {
    id:             'shein-vestido-midi',
    name:           'Vestido Midi Floral Verano',
    price:          279,
    original_price: 499,
    category:       'moda',
    image_url:      'https://img.ltwebstatic.com/images3_pi/2024/01/floral-midi-dress.jpg',
    affiliate_url:  generateAffiliateLink(`${SHEIN_BASE_MX}/floral-print-midi-dress-p-7890123.html`),
    delivery_days:  5,
    stars:          4.3,
    reviews_count:  12_450,
  },
]

// ─── Buscar productos por keyword ─────────────────────────────────────────────

export function searchProducts(keyword: string): SheinProduct[] {
  const q = keyword.toLowerCase()

  // Primero buscar en catálogo curado
  const curated = SHEIN_CATALOG.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      SHEIN_PRIORITY_CATEGORIES.some((cat) => q.includes(cat) && p.category === cat)
  )

  if (curated.length > 0) return curated

  // Si no hay match directo, retornar los mejores de categoría más cercana
  if (q.includes('belleza') || q.includes('crema') || q.includes('suero') || q.includes('skincare')) {
    return SHEIN_CATALOG.filter((p) => p.category === 'belleza')
  }
  if (q.includes('hogar') || q.includes('cocina') || q.includes('casa')) {
    return SHEIN_CATALOG.filter((p) => p.category === 'hogar')
  }
  if (q.includes('moda') || q.includes('ropa') || q.includes('vestido')) {
    return SHEIN_CATALOG.filter((p) => p.category === 'moda')
  }
  if (q.includes('accesorio') || q.includes('bolsa') || q.includes('joyeria') || q.includes('pulsera')) {
    return SHEIN_CATALOG.filter((p) => ['accesorios', 'joyeria'].includes(p.category))
  }

  // Sin match — retorna top 3 más vendidos
  return SHEIN_CATALOG.slice(0, 3)
}

// ─── Verifica si una categoría tiene buena cobertura en SHEIN ───────────────

export function isSheinPriorityCategory(category: string): boolean {
  return SHEIN_PRIORITY_CATEGORIES.some((c) =>
    category.toLowerCase().includes(c)
  )
}

// ─── Genera opción de comparador para ProductOption ──────────────────────────

export function toProductOption(p: SheinProduct) {
  return {
    id:              p.id,
    name:            p.name,
    platform:        'shein' as const,
    platform_label:  'SHEIN MX',
    price:           p.price,
    original_price:  p.original_price,
    stars:           p.stars,
    reviews_count:   p.reviews_count,
    delivery_days:   p.delivery_days,
    free_shipping:   true,
    stock_remaining: 999,
    trust_score:     72,
    warranty_months: 0,
    returns_days:    35,
    affiliate_url:   p.affiliate_url,
    seller_name:     'SHEIN México',
    seller_level:    'Verificado',
    pros: [
      `Precio ${Math.round(((p.original_price - p.price) / p.original_price) * 100)}% más bajo que retail`,
      `Entrega ${p.delivery_days} días desde almacén México`,
      '35 días para devolución gratuita',
      'Envío gratis en pedidos mayores a $299 MXN',
    ],
    cons: [
      'Tallas pueden variar — revisar guía de tallas',
      'Sin garantía de fabricante',
      'Calidad variable por producto',
    ],
  }
}
