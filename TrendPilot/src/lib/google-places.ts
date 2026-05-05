// Google Places API — TrendPilot LeadFinder
// Busca negocios locales como posibles vendors
// Requiere: GOOGLE_PLACES_API_KEY en env
// Sin clave → retorna mock estructurado

export interface PlaceBusiness {
  place_id:       string
  name:           string
  category:       string
  address:        string
  city:           string
  rating?:        number
  reviews_count?: number
  phone?:         string
  website?:       string
  maps_url:       string
  mock?:          boolean
}

const HAS_PLACES = Boolean(process.env.GOOGLE_PLACES_API_KEY)

function mockBusinesses(category: string, city: string): PlaceBusiness[] {
  const names = [
    `Tienda ${category} del Centro`,
    `${category} Premium ${city}`,
    `Distribuidora ${category} MX`,
    `${category} Express`,
    `El Mejor ${category}`,
  ]
  return names.map((name, i) => ({
    place_id:      `place_mock_${i}`,
    name,
    category,
    address:       `Calle ${10 + i * 3} #${100 + i}, ${city}`,
    city,
    rating:        Number((3.8 + Math.random() * 1.2).toFixed(1)),
    reviews_count: Math.round(20 + Math.random() * 200),
    phone:         `+526675${String(Math.floor(100000 + Math.random() * 899999))}`,
    website:       undefined,
    maps_url:      `https://maps.google.com/?q=${encodeURIComponent(name + ' ' + city)}`,
    mock:          true,
  }))
}

export async function searchLocalBusinesses(
  category: string,
  city: string,
  limit: number = 10,
): Promise<PlaceBusiness[]> {
  if (!HAS_PLACES) return mockBusinesses(category, city).slice(0, limit)

  const apiKey = process.env.GOOGLE_PLACES_API_KEY!
  const query  = `${category} ${city} México`

  try {
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}&language=es&region=mx`,
      { signal: AbortSignal.timeout(10_000) },
    )

    if (!searchRes.ok) throw new Error(`Places API ${searchRes.status}`)

    const searchJson = await searchRes.json()
    const results    = (searchJson.results ?? []).slice(0, limit) as Array<Record<string, unknown>>

    return results.map((place) => {
      const placeId = String(place.place_id ?? '')
      return {
        place_id:      placeId,
        name:          String(place.name ?? ''),
        category,
        address:       String(place.formatted_address ?? ''),
        city,
        rating:        typeof place.rating === 'number' ? place.rating : undefined,
        reviews_count: typeof place.user_ratings_total === 'number' ? place.user_ratings_total : undefined,
        maps_url:      `https://maps.google.com/?place_id=${placeId}`,
      }
    })
  } catch {
    return mockBusinesses(category, city).slice(0, limit)
  }
}

export { HAS_PLACES }
