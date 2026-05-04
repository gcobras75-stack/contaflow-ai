// Cliente MercadoLibre API para TrendPilot

const ML_BASE_URL = 'https://api.mercadolibre.com'

export interface MLTrend {
  keyword: string
  url: string
}

// Obtener tendencias del día en México
export async function getMexicoTrends(): Promise<MLTrend[]> {
  const response = await fetch(`${ML_BASE_URL}/trends/MLM`, {
    headers: {
      Authorization: `Bearer ${process.env.MERCADOLIBRE_ACCESS_TOKEN || ''}`,
    },
    next: { revalidate: 21600 }, // cache 6 horas
  })

  if (!response.ok) {
    throw new Error(`MercadoLibre API error: ${response.status}`)
  }

  return response.json()
}

// Buscar productos por keyword
export async function searchProducts(keyword: string, limit = 20) {
  const params = new URLSearchParams({
    q: keyword,
    limit: limit.toString(),
    site_id: 'MLM',
  })

  const response = await fetch(`${ML_BASE_URL}/sites/MLM/search?${params}`)

  if (!response.ok) {
    throw new Error(`MercadoLibre search error: ${response.status}`)
  }

  const data = await response.json()
  return data.results
}

// Obtener categorías de México
export async function getCategories() {
  const response = await fetch(`${ML_BASE_URL}/sites/MLM/categories`, {
    next: { revalidate: 86400 }, // cache 24 horas
  })

  if (!response.ok) {
    throw new Error(`MercadoLibre categories error: ${response.status}`)
  }

  return response.json()
}
