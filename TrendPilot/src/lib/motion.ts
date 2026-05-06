// Motion Creative Analytics — TrendPilot
// MCP server: https://projects.motionapp.com/mcp
// REST API: https://api.motionapp.com/v1/
//
// Variables requeridas:
//   MOTION_API_KEY  — app.motionapp.com → Settings → API Keys
//
// Sin variable → modo mock con creativos realistas

const MOTION_API = 'https://api.motionapp.com/v1'

const HAS_MOTION = Boolean(process.env.MOTION_API_KEY)

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type AdFormat = 'video' | 'image' | 'carousel' | 'stories'

export interface MotionAd {
  id:           string
  brand:        string
  headline:     string
  description:  string
  cta:          string
  format:       AdFormat
  image_url:    string    // thumbnail o preview
  days_running: number    // cuántos días lleva activo (más = más efectivo)
  ctr_estimate: number    // % estimado
  niche:        string
  mock?:        boolean
}

export interface MotionCreativeInsights {
  best_format:      AdFormat
  best_cta:         string
  avg_text_length:  number    // palabras en descripción ganadora
  best_time_range:  string    // hora del día con más conversiones
  top_niches:       string[]
  mock?:            boolean
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ADS_BY_NICHE: Record<string, MotionAd[]> = {
  electrónica: [
    {
      id: 'ma_tech_1', brand: 'AudioPro MX', headline: 'Sonido que te envuelve',
      description: '¿Cansado de escuchar todo a medias? Audífonos pro con cancelación de ruido activa. Pruébalos 30 días o te devolvemos tu dinero.',
      cta: 'COMPRAR AHORA', format: 'video', image_url: '', days_running: 45, ctr_estimate: 4.2, niche: 'electrónica', mock: true,
    },
    {
      id: 'ma_tech_2', brand: 'GadgetStore', headline: '¡Oferta de hoy: -40%!',
      description: 'El cargador solar más vendido de MX. Carga 3 dispositivos a la vez. Lleva el sol contigo.',
      cta: 'VER OFERTA', format: 'carousel', image_url: '', days_running: 22, ctr_estimate: 3.8, niche: 'electrónica', mock: true,
    },
    {
      id: 'ma_tech_3', brand: 'TechMX', headline: 'Tu escritorio, renovado',
      description: 'Teclado mecánico gaming RGB. Respuesta 1ms. Perfecto para trabajo y gaming.',
      cta: 'AGREGAR AL CARRITO', format: 'image', image_url: '', days_running: 31, ctr_estimate: 2.9, niche: 'electrónica', mock: true,
    },
  ],
  moda: [
    {
      id: 'ma_moda_1', brand: 'FitStyle', headline: 'Siente la diferencia desde el primer uso',
      description: 'Leggings que no se transparentan. Tela de compresión premium. Mujeres que los prueban no vuelven a otro.',
      cta: 'QUIERO LOS MÍOS', format: 'video', image_url: '', days_running: 60, ctr_estimate: 5.1, niche: 'moda', mock: true,
    },
    {
      id: 'ma_moda_2', brand: 'EcoModa', headline: 'Moda que cuida el planeta',
      description: 'Bolsas de tela orgánica. 100% artesanal México. Cada compra planta un árbol.',
      cta: 'COMPRAR', format: 'carousel', image_url: '', days_running: 38, ctr_estimate: 3.5, niche: 'moda', mock: true,
    },
  ],
  salud: [
    {
      id: 'ma_salud_1', brand: 'VidaSana', headline: 'Colágeno que sí funciona',
      description: 'No todas las proteínas son iguales. La nuestra está respaldada por nutriólogos mexicanos. Primer mes gratis.',
      cta: 'PROBAR GRATIS', format: 'video', image_url: '', days_running: 75, ctr_estimate: 4.8, niche: 'salud', mock: true,
    },
  ],
  hogar: [
    {
      id: 'ma_hogar_1', brand: 'HomePro', headline: '5 minutos y tu casa limpia',
      description: 'Mini aspiradora inalámbrica 25,000 RPM. Rincones imposibles, ya no. Carga USB incluida.',
      cta: 'VER DEMOSTRACIÓN', format: 'video', image_url: '', days_running: 18, ctr_estimate: 3.2, niche: 'hogar', mock: true,
    },
  ],
  deportes: [
    {
      id: 'ma_dep_1', brand: 'ZenFit', headline: 'Tu práctica, al siguiente nivel',
      description: 'Tapete yoga antideslizante de 6mm. Marcas de alineación integradas. Incluye bolsa de transporte.',
      cta: 'OBTENER MI TAPETE', format: 'image', image_url: '', days_running: 14, ctr_estimate: 2.7, niche: 'deportes', mock: true,
    },
  ],
}

const ALL_MOCK_ADS = Object.values(MOCK_ADS_BY_NICHE).flat()

// ─── getCompetitorAds ─────────────────────────────────────────────────────────
//
// Obtiene anuncios activos de un competidor dado su dominio.
// Los anuncios con más días corriendo son los que más convierten.

export async function getCompetitorAds(brandDomain: string): Promise<MotionAd[]> {
  if (!HAS_MOTION) {
    // Simular resultados por dominio con variación determinística
    const seed = brandDomain.length % ALL_MOCK_ADS.length
    const ads  = ALL_MOCK_ADS
      .slice(seed, seed + 3)
      .concat(ALL_MOCK_ADS.slice(0, Math.max(0, 3 - (ALL_MOCK_ADS.length - seed))))
    return ads.map((ad) => ({ ...ad, brand: brandDomain.replace(/\.(com|mx|net).*/, '') }))
  }

  try {
    const res = await fetch(`${MOTION_API}/ads/search?domain=${encodeURIComponent(brandDomain)}&limit=10`, {
      headers: { Authorization: `Bearer ${process.env.MOTION_API_KEY}`, 'Content-Type': 'application/json' },
    })

    if (!res.ok) throw new Error(`Motion ${res.status}`)

    const json = await res.json()
    return (json.ads ?? []).map((ad: Record<string, unknown>) => ({
      id:           String(ad.id ?? ''),
      brand:        String(ad.brand_name ?? brandDomain),
      headline:     String(ad.headline ?? ''),
      description:  String(ad.body_text ?? ''),
      cta:          String(ad.cta_text ?? 'VER MÁS'),
      format:       (ad.format as AdFormat) ?? 'image',
      image_url:    String(ad.thumbnail_url ?? ''),
      days_running: Number(ad.days_active ?? 0),
      ctr_estimate: Number(ad.estimated_ctr ?? 0),
      niche:        String(ad.category ?? 'general'),
    }))
  } catch {
    const seed = brandDomain.length % ALL_MOCK_ADS.length
    return ALL_MOCK_ADS.slice(seed, seed + 3)
  }
}

// ─── getInspirationAds ────────────────────────────────────────────────────────
//
// Mejores anuncios del nicho — para inspirar al AdBuilder.
// Ordenados por días activos (proxy de conversión).

export async function getInspirationAds(niche: string): Promise<MotionAd[]> {
  if (!HAS_MOTION) {
    const nicheAds = MOCK_ADS_BY_NICHE[niche] ?? ALL_MOCK_ADS.slice(0, 3)
    return nicheAds.sort((a, b) => b.days_running - a.days_running)
  }

  try {
    const res = await fetch(
      `${MOTION_API}/ads/top?category=${encodeURIComponent(niche)}&sort=days_active&limit=6`,
      { headers: { Authorization: `Bearer ${process.env.MOTION_API_KEY}` } },
    )

    if (!res.ok) throw new Error(`Motion ${res.status}`)

    const json = await res.json()
    return (json.ads ?? []).map((ad: Record<string, unknown>) => ({
      id:           String(ad.id ?? ''),
      brand:        String(ad.brand_name ?? ''),
      headline:     String(ad.headline ?? ''),
      description:  String(ad.body_text ?? ''),
      cta:          String(ad.cta_text ?? 'VER MÁS'),
      format:       (ad.format as AdFormat) ?? 'image',
      image_url:    String(ad.thumbnail_url ?? ''),
      days_running: Number(ad.days_active ?? 0),
      ctr_estimate: Number(ad.estimated_ctr ?? 0),
      niche:        String(ad.category ?? niche),
    }))
  } catch {
    return MOCK_ADS_BY_NICHE[niche] ?? ALL_MOCK_ADS.slice(0, 3)
  }
}

// ─── getCreativeInsights ──────────────────────────────────────────────────────
//
// Qué formatos y textos convierten mejor en el mercado actual.

export async function getCreativeInsights(): Promise<MotionCreativeInsights> {
  if (!HAS_MOTION) {
    return {
      best_format:     'video',
      best_cta:        'QUIERO LOS MÍOS',
      avg_text_length: 22,
      best_time_range: '7pm – 10pm',
      top_niches:      ['moda', 'electrónica', 'salud', 'hogar'],
      mock:            true,
    }
  }

  try {
    const res = await fetch(`${MOTION_API}/insights/creative?market=MX`, {
      headers: { Authorization: `Bearer ${process.env.MOTION_API_KEY}` },
    })

    if (!res.ok) throw new Error(`Motion ${res.status}`)

    const json = await res.json()
    return {
      best_format:     (json.top_format as AdFormat) ?? 'video',
      best_cta:        String(json.top_cta ?? 'COMPRAR AHORA'),
      avg_text_length: Number(json.avg_winning_text_words ?? 20),
      best_time_range: String(json.peak_engagement_window ?? '7pm – 10pm'),
      top_niches:      (json.top_categories as string[] | undefined) ?? ['moda', 'electrónica', 'salud'],
    }
  } catch {
    return {
      best_format:     'video',
      best_cta:        'QUIERO LOS MÍOS',
      avg_text_length: 22,
      best_time_range: '7pm – 10pm',
      top_niches:      ['moda', 'electrónica', 'salud', 'hogar'],
      mock:            true,
    }
  }
}

export { HAS_MOTION }
