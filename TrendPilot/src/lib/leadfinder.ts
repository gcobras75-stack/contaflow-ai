// Motor de prospección LeadFinder
// Busca vendedores en MercadoLibre, califica con LeadScore y genera propuestas

import { askClaude } from './claude'
import { logServerError } from './logger'

export interface MLSellerRaw {
  id:               string
  nickname:         string
  permalink?:       string
  seller_reputation?: {
    transactions?: { total?: number; completed?: number }
    level_id?:    string
    power_seller_status?: string
  }
}

export interface MLItem {
  id:            string
  title:         string
  price:         number
  sold_quantity?: number
  thumbnail?:    string
  permalink?:    string
  seller:        MLSellerRaw
}

export interface MLSearchResponse {
  results: MLItem[]
  paging?: { total: number }
}

export interface LeadProspect {
  seller_id:         string
  seller_name:       string
  seller_nickname:   string
  product_name:      string
  product_url:       string
  product_thumbnail: string
  product_price:     number   // centavos
  estimated_sales:   number
  ml_level:          string
  city?:             string
  lead_score:        number
  lead_temperature:  'hot' | 'warm' | 'cold'
  trend_keyword:     string
  source:            'ml' | 'maps' | 'manual'
}

// ─── LeadScore — 4 factores (100pts total) ────────────────────────────────────

export function calculateLeadScore(params: {
  estimated_sales: number
  ml_level:        string
  price_mxn:       number
  is_trending:     boolean
  is_trending_category: boolean
}): { score: number; temperature: 'hot' | 'warm' | 'cold' } {
  let score = 0

  // Factor 1 — Volumen de ventas (40pts)
  const sales = params.estimated_sales
  if (sales >= 1000)      score += 40
  else if (sales >= 500)  score += 28
  else if (sales >= 100)  score += 16
  else                    score += 5

  // Factor 2 — Reputación en ML (30pts)
  const level = (params.ml_level ?? '').toLowerCase()
  if (level.includes('platinum') || level.includes('5_green'))     score += 30
  else if (level.includes('gold') || level.includes('4_green'))    score += 30
  else if (level.includes('silver') || level.includes('3_green'))  score += 20
  else if (level.includes('bronze') || level.includes('2_green'))  score += 10
  else                                                              score += 5

  // Factor 3 — Producto en tendencia (20pts)
  if (params.is_trending)          score += 20
  else if (params.is_trending_category) score += 12
  else                             score += 4

  // Factor 4 — Precio con margen (10pts)
  const priceMxn = params.price_mxn
  if (priceMxn >= 500)       score += 10
  else if (priceMxn >= 200)  score += 5
  else                       score += 0

  const capped = Math.min(100, Math.max(0, score))
  const temperature: 'hot' | 'warm' | 'cold' =
    capped >= 80 ? 'hot' : capped >= 60 ? 'warm' : 'cold'

  return { score: capped, temperature }
}

// ─── Busca prospectos para un keyword en MercadoLibre ─────────────────────────

export async function searchMLProspects(
  keyword:     string,
  trendScore?: number,
): Promise<LeadProspect[]> {
  try {
    const url = `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(keyword)}&sort=best_seller&limit=20`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`ML search ${res.status}`)

    const data: MLSearchResponse = await res.json()
    if (!data.results?.length) return []

    const seen    = new Set<string>()
    const results: LeadProspect[] = []

    for (const item of data.results) {
      const s = item.seller
      if (!s?.id || seen.has(String(s.id))) continue
      seen.add(String(s.id))

      const priceMxn  = Math.round(item.price)
      const sales     = item.sold_quantity ?? s.seller_reputation?.transactions?.total ?? 0
      const ml_level  = s.seller_reputation?.level_id ?? ''

      const { score, temperature } = calculateLeadScore({
        estimated_sales:      sales,
        ml_level,
        price_mxn:            priceMxn,
        is_trending:          (trendScore ?? 0) >= 75,
        is_trending_category: (trendScore ?? 0) >= 50,
      })

      // Solo incluir prospectos que califican (score >= 40)
      if (score < 40) continue

      results.push({
        seller_id:         String(s.id),
        seller_name:       s.nickname ?? 'Vendedor',
        seller_nickname:   s.nickname ?? '',
        product_name:      item.title ?? keyword,
        product_url:       item.permalink ?? s.permalink ?? '',
        product_thumbnail: item.thumbnail ?? '',
        product_price:     priceMxn * 100,  // a centavos
        estimated_sales:   sales,
        ml_level,
        lead_score:        score,
        lead_temperature:  temperature,
        trend_keyword:     keyword,
        source:            'ml',
      })
    }

    return results.sort((a, b) => b.lead_score - a.lead_score)
  } catch (err) {
    logServerError(err, `searchMLProspects keyword="${keyword}"`)
    return []
  }
}

// ─── Genera propuesta personalizada con Claude ────────────────────────────────

export async function generateProposal(
  channel: 'whatsapp' | 'email' | 'ml',
  prospect: {
    seller_name:     string
    product_name:    string
    estimated_sales: number
    city?:           string
  }
): Promise<string> {
  const { seller_name, product_name, estimated_sales, city } = prospect

  const channelInstructions = {
    whatsapp: `Mensaje de WhatsApp: máximo 3 párrafos cortos con emojis estratégicos. Termina con link trendpilot.marketing`,
    email:    `Email de ventas: incluye asunto sugerido (primera línea como "Asunto: ..."). Más detallado, con párrafos bien estructurados. CTA al final con link trendpilot.marketing`,
    ml:       `Mensaje de MercadoLibre: sin links externos (política ML). CTA final: "Busca TrendPilot en Google". Máximo 4 líneas.`,
  }

  const prompt = `Eres el equipo de ventas de TrendPilot, una plataforma de marketing automatizado en México. Genera una propuesta para este vendedor:

Nombre: ${seller_name}
Producto: ${product_name}
Ventas actuales: ${estimated_sales.toLocaleString('es-MX')} unidades${city ? `\nCiudad: ${city}` : ''}

El mensaje debe:
- Ser en español mexicano casual y directo
- Mencionar el producto específico
- Destacar: sin costo fijo, solo pagas si hay ventas (comisión del 15-25%)
- NO sonar como spam — sonar personal y genuino
- Mencionar que la IA detecta tendencias para su producto

${channelInstructions[channel]}

Solo el mensaje, sin comillas ni explicaciones adicionales.`

  try {
    return await askClaude([{ role: 'user', content: prompt }], {
      maxTokens: 300,
      systemPrompt: 'Eres experto en ventas B2B en México. Writes persuasive, personal messages that don\'t feel spammy.',
    })
  } catch {
    // Fallback si Claude no responde
    const fallbacks = {
      whatsapp: `Hola ${seller_name} 👋 Vi que vendes ${product_name} y detectamos alta demanda esta semana 📈\n\nEn TrendPilot lanzamos campañas automáticas en Meta y TikTok — sin costo fijo, solo pagas si hay ventas. ¿Te interesa?\n\n→ trendpilot.marketing`,
      email:    `Asunto: Encontramos alta demanda para ${product_name}\n\nHola ${seller_name},\n\nNuestra IA detectó que ${product_name} tiene alta demanda esta semana en México. En TrendPilot creamos campañas automáticas sin costo fijo — solo pagás si hay ventas (15-25% comisión).\n\n¿Quieres saber más? Visita trendpilot.marketing`,
      ml:       `Hola ${seller_name}, vi tu ${product_name} y tiene mucho potencial. En TrendPilot hacemos campañas de marketing sin costo fijo — solo pagas si hay ventas. Busca TrendPilot en Google para más info.`,
    }
    return fallbacks[channel]
  }
}

// ─── Mock data para cuando no hay API key de Google Maps ─────────────────────

export function getMockLeads(): LeadProspect[] {
  const CITIES = ['Culiacán', 'Ciudad de México', 'Guadalajara', 'Monterrey', 'Mazatlán', 'Los Mochis', 'Puebla']

  return [
    { seller_id: 'ml_mock_001', seller_name: 'ELECTRO_CULIACAN_MX', seller_nickname: 'ELECTRO_CULIACAN_MX', product_name: 'Audífonos Bluetooth Pro 5.0', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 89900, estimated_sales: 1840, ml_level: '5_green', city: 'Culiacán', lead_score: 92, lead_temperature: 'hot', trend_keyword: 'audífonos bluetooth', source: 'ml' },
    { seller_id: 'ml_mock_002', seller_name: 'TECHZONE_GDL', seller_nickname: 'TECHZONE_GDL', product_name: 'Cargador Inalámbrico Magnético 15W', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 54900, estimated_sales: 2100, ml_level: '4_green', city: 'Guadalajara', lead_score: 88, lead_temperature: 'hot', trend_keyword: 'cargador inalámbrico', source: 'ml' },
    { seller_id: 'ml_mock_003', seller_name: 'MOVILSTORE_CDMX', seller_nickname: 'MOVILSTORE_CDMX', product_name: 'Soporte Celular Auto Magnético', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 34900, estimated_sales: 3200, ml_level: '5_green', city: 'Ciudad de México', lead_score: 86, lead_temperature: 'hot', trend_keyword: 'soporte celular auto', source: 'ml' },
    { seller_id: 'ml_mock_004', seller_name: 'FIT_SUPP_MTY', seller_nickname: 'FIT_SUPP_MTY', product_name: 'Proteína Whey Natural 1kg', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 54900, estimated_sales: 890, ml_level: '4_green', city: 'Monterrey', lead_score: 82, lead_temperature: 'hot', trend_keyword: 'suplementos deportivos', source: 'ml' },
    { seller_id: 'ml_mock_005', seller_name: 'GAMING_PRO_MX', seller_nickname: 'GAMING_PRO_MX', product_name: 'Teclado Mecánico RGB TKL', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 149900, estimated_sales: 650, ml_level: '3_green', city: 'Ciudad de México', lead_score: 79, lead_temperature: 'warm', trend_keyword: 'teclado mecánico', source: 'ml' },
    { seller_id: 'ml_mock_006', seller_name: 'BELLEZA_TOTAL_GDL', seller_nickname: 'BELLEZA_TOTAL_GDL', product_name: 'Colágeno Hidrolizado + Vitamina C', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 44900, estimated_sales: 1200, ml_level: '4_green', city: 'Guadalajara', lead_score: 78, lead_temperature: 'warm', trend_keyword: 'colágeno', source: 'ml' },
    { seller_id: 'ml_mock_007', seller_name: 'ARTESANIAS_OAX', seller_nickname: 'ARTESANIAS_OAX', product_name: 'Aretes Plata 925 Mexicanos', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 39900, estimated_sales: 430, ml_level: '3_green', city: 'Oaxaca', lead_score: 71, lead_temperature: 'warm', trend_keyword: 'joyería plata', source: 'maps' },
    { seller_id: 'ml_mock_008', seller_name: 'MODA_CASUAL_CUL', seller_nickname: 'MODA_CASUAL_CUL', product_name: 'Set Ropa Deportiva Mujer', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 69900, estimated_sales: 780, ml_level: '4_green', city: 'Culiacán', lead_score: 75, lead_temperature: 'warm', trend_keyword: 'ropa deportiva', source: 'ml' },
    { seller_id: 'ml_mock_009', seller_name: 'CASA_COCINA_PUE', seller_nickname: 'CASA_COCINA_PUE', product_name: 'Kit Utensilios Cocina Silicón 12pzs', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 49900, estimated_sales: 560, ml_level: '3_green', city: 'Puebla', lead_score: 68, lead_temperature: 'warm', trend_keyword: 'cocina hogar', source: 'ml' },
    { seller_id: 'ml_mock_010', seller_name: 'PERFUMES_CDMX_VIP', seller_nickname: 'PERFUMES_CDMX_VIP', product_name: 'Perfume Árabe Intenso 100ml', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 79900, estimated_sales: 320, ml_level: '3_green', city: 'Ciudad de México', lead_score: 65, lead_temperature: 'warm', trend_keyword: 'perfumes', source: 'ml' },
    { seller_id: 'ml_mock_011', seller_name: 'TABLET_ACC_MZT', seller_nickname: 'TABLET_ACC_MZT', product_name: 'Stand Tablet Ajustable Escritorio', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 29900, estimated_sales: 890, ml_level: '4_green', city: 'Mazatlán', lead_score: 73, lead_temperature: 'warm', trend_keyword: 'accesorios tablet', source: 'ml' },
    { seller_id: 'ml_mock_012', seller_name: 'FITNESS_LMO', seller_nickname: 'FITNESS_LMO', product_name: 'Bandas de Resistencia Fitness Set', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 39900, estimated_sales: 210, ml_level: '2_green', city: 'Los Mochis', lead_score: 58, lead_temperature: 'warm', trend_keyword: 'fitness gym', source: 'maps' },
    { seller_id: 'ml_mock_013', seller_name: 'FUNDA_EXPRESS_MX', seller_nickname: 'FUNDA_EXPRESS_MX', product_name: 'Funda Silicón iPhone 15 Pro Max', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 24900, estimated_sales: 4500, ml_level: '5_green', city: 'Ciudad de México', lead_score: 84, lead_temperature: 'hot', trend_keyword: 'funda iPhone', source: 'ml' },
    { seller_id: 'ml_mock_014', seller_name: 'PIEL_CARE_MTY', seller_nickname: 'PIEL_CARE_MTY', product_name: 'Sérum Vitamina C Antiedad 30ml', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 64900, estimated_sales: 670, ml_level: '3_green', city: 'Monterrey', lead_score: 69, lead_temperature: 'warm', trend_keyword: 'skincare', source: 'ml' },
    { seller_id: 'ml_mock_015', seller_name: 'ORGANICOS_GDL_MX', seller_nickname: 'ORGANICOS_GDL_MX', product_name: 'Pack Snacks Saludables x12', product_url: 'https://mercadolibre.com.mx', product_thumbnail: '', product_price: 34900, estimated_sales: 1100, ml_level: '4_green', city: 'Guadalajara', lead_score: 77, lead_temperature: 'warm', trend_keyword: 'snacks saludables', source: 'maps' },
  ]
}
