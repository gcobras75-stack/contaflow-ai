// Cliente Google Trends para TrendPilot
// Usa el endpoint proxy en Railway para respetar rate limits

const RAILWAY_PROXY_URL = process.env.RAILWAY_TRENDS_PROXY_URL || ''

export interface TrendData {
  keyword: string
  score: number
  relatedQueries: string[]
  historicalData: { date: string; value: number }[]
}

// Obtener datos de tendencia para una keyword
export async function getTrendData(keyword: string): Promise<TrendData> {
  // En desarrollo, retornar mock data si no hay proxy configurado
  if (!RAILWAY_PROXY_URL) {
    return getMockTrendData(keyword)
  }

  const response = await fetch(
    `${RAILWAY_PROXY_URL}/trends?keyword=${encodeURIComponent(keyword)}&geo=MX`,
    { next: { revalidate: 21600 } } // cache 6 horas
  )

  if (!response.ok) {
    throw new Error(`Google Trends proxy error: ${response.status}`)
  }

  return response.json()
}

// Obtener trending keywords en México ahora
export async function getMexicoTrendingNow(): Promise<string[]> {
  if (!RAILWAY_PROXY_URL) {
    return ['ropa deportiva', 'gadgets cocina', 'cosméticos naturales', 'suplementos', 'decoración hogar']
  }

  const response = await fetch(`${RAILWAY_PROXY_URL}/trending?geo=MX`, {
    next: { revalidate: 3600 }, // cache 1 hora
  })

  if (!response.ok) {
    throw new Error(`Google Trends trending error: ${response.status}`)
  }

  return response.json()
}

// Mock data para desarrollo
function getMockTrendData(keyword: string): TrendData {
  return {
    keyword,
    score: Math.floor(Math.random() * 40) + 60,
    relatedQueries: [`${keyword} precio`, `${keyword} mercadolibre`, `${keyword} amazon`],
    historicalData: Array.from({ length: 12 }, (_, i) => ({
      date: new Date(Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      value: Math.floor(Math.random() * 40) + 40,
    })),
  }
}
