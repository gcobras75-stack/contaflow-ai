// SeasonAlert — Calendario de temporadas para México
// Determina el score de estacionalidad de una categoría en una fecha dada

export type AlertType = 'peak' | 'approaching' | 'normal' | 'low'

export interface SeasonScore {
  score:             number      // 0-10
  season_name:       string
  days_until_peak:   number      // 0 = en peak ahora
  recommendation:    string
  alert_type:        AlertType
}

export interface SeasonEvent {
  name:       string
  month:      number            // 1-12
  day_start:  number            // día del mes
  day_end:    number
  categories: string[]          // categorías beneficiadas
  importance: 'major' | 'medium' | 'minor'
}

// Calendario completo México 2025-2026
const SEASON_EVENTS: SeasonEvent[] = [
  // Enero
  {
    name:       'Reyes Magos',
    month:      1,
    day_start:  3,
    day_end:    6,
    categories: ['juguetes', 'electrónica', 'regalo', 'niños', 'gaming'],
    importance: 'major',
  },
  // Febrero
  {
    name:       'San Valentín',
    month:      2,
    day_start:  10,
    day_end:    14,
    categories: ['joyería', 'chocolates', 'perfumes', 'flores', 'experiencias', 'ropa', 'cosméticos'],
    importance: 'major',
  },
  // Marzo
  {
    name:       'Día Internacional de la Mujer',
    month:      3,
    day_start:  6,
    day_end:    8,
    categories: ['skincare', 'moda', 'bienestar', 'cosméticos', 'joyería', 'spa', 'libros'],
    importance: 'medium',
  },
  // Abril
  {
    name:       'Semana Santa',
    month:      4,
    day_start:  10,
    day_end:    20,
    categories: ['viajes', 'playa', 'ropa deportiva', 'trajes de baño', 'bronceador', 'camping'],
    importance: 'major',
  },
  // Mayo
  {
    name:       'Día de las Madres',
    month:      5,
    day_start:  7,
    day_end:    10,
    categories: [
      'todo', 'hogar', 'moda', 'joyería', 'cosméticos', 'electrónica',
      'flores', 'chocolates', 'perfumes', 'cocina', 'spa', 'ropa',
    ],
    importance: 'major',
  },
  // Junio
  {
    name:       'Día del Padre',
    month:      6,
    day_start:  15,
    day_end:    21,
    categories: ['electrónica', 'herramientas', 'ropa', 'gaming', 'deportes', 'barbacoa', 'relojes'],
    importance: 'major',
  },
  // Julio-Agosto
  {
    name:       'Regreso a Clases',
    month:      7,
    day_start:  15,
    day_end:    31,
    categories: ['útiles escolares', 'mochilas', 'tecnología', 'ropa', 'zapatos', 'libros'],
    importance: 'major',
  },
  {
    name:       'Regreso a Clases (agosto)',
    month:      8,
    day_start:  1,
    day_end:    20,
    categories: ['útiles escolares', 'mochilas', 'tecnología', 'ropa', 'zapatos', 'libros'],
    importance: 'medium',
  },
  // Septiembre
  {
    name:       'Fiestas Patrias',
    month:      9,
    day_start:  10,
    day_end:    16,
    categories: ['decoración', 'alimentos', 'ropa típica', 'artesanías', 'bebidas'],
    importance: 'medium',
  },
  // Octubre
  {
    name:       'Halloween',
    month:      10,
    day_start:  25,
    day_end:    31,
    categories: ['disfraces', 'decoración', 'dulces', 'maquillaje', 'terror'],
    importance: 'medium',
  },
  // Noviembre
  {
    name:       'Buen Fin',
    month:      11,
    day_start:  14,
    day_end:    17,
    categories: [
      'todo', 'electrónica', 'moda', 'hogar', 'viajes', 'juguetes',
      'cosméticos', 'deportes', 'gaming', 'electrodomésticos',
    ],
    importance: 'major',
  },
  // Diciembre
  {
    name:       'Navidad',
    month:      12,
    day_start:  15,
    day_end:    25,
    categories: [
      'juguetes', 'electrónica', 'ropa', 'viajes', 'decoración',
      'cosméticos', 'perfumes', 'hogar', 'gaming', 'regalo',
    ],
    importance: 'major',
  },
  {
    name:       'Año Nuevo',
    month:      12,
    day_start:  28,
    day_end:    31,
    categories: ['viajes', 'ropa', 'electrónica', 'decoración', 'champagne'],
    importance: 'medium',
  },
]

// Normaliza una categoría para comparación insensible a accentos/case
function normalizeCategory(cat: string): string {
  return cat
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Comprueba si la categoría del producto coincide con alguna del evento
function categoryMatches(productCategory: string, eventCategories: string[]): boolean {
  const normProduct = normalizeCategory(productCategory)
  return eventCategories.some((ec) => {
    const normEvent = normalizeCategory(ec)
    return normProduct.includes(normEvent) || normEvent.includes(normProduct) || normEvent === 'todo'
  })
}

// Días entre dos fechas
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

// Siguiente ocurrencia del evento (puede ser este año o el año próximo)
function nextOccurrence(event: SeasonEvent, from: Date): Date {
  const year = from.getFullYear()
  const candidate = new Date(year, event.month - 1, event.day_start)
  if (candidate < from) {
    return new Date(year + 1, event.month - 1, event.day_start)
  }
  return candidate
}

// ─── Función principal ────────────────────────────────────────────────────────

export function getCurrentSeasonScore(
  category: string,
  now: Date = new Date()
): SeasonScore {
  let bestScore   = 0
  let bestEvent:  SeasonEvent | null = null
  let bestDays    = 999
  let isInPeak    = false

  for (const event of SEASON_EVENTS) {
    const doesMatch = categoryMatches(category, event.categories)
    if (!doesMatch) continue

    const peakStart = new Date(now.getFullYear(), event.month - 1, event.day_start)
    const peakEnd   = new Date(now.getFullYear(), event.month - 1, event.day_end)

    // ¿Estamos en el período del evento?
    if (now >= peakStart && now <= peakEnd) {
      const importance = event.importance === 'major' ? 10 : event.importance === 'medium' ? 8 : 6
      if (importance > bestScore) {
        bestScore = importance
        bestEvent = event
        bestDays  = 0
        isInPeak  = true
      }
    } else {
      // Días hasta el próximo peak
      const next = nextOccurrence(event, now)
      const days = daysBetween(now, next)

      let preScore = 0
      const importance = event.importance === 'major' ? 10 : event.importance === 'medium' ? 8 : 6

      if (days <= 7)  preScore = importance
      else if (days <= 21) preScore = Math.round(importance * 0.8)
      else if (days <= 45) preScore = Math.round(importance * 0.5)
      else preScore = 4  // baseline

      if (preScore > bestScore || (preScore === bestScore && days < bestDays)) {
        bestScore = preScore
        bestEvent = event
        bestDays  = days
        isInPeak  = false
      }
    }
  }

  // Sin evento relevante → score base
  if (!bestEvent) {
    return {
      score:           4,
      season_name:     'Temporada normal',
      days_until_peak: 999,
      recommendation:  `No hay temporadas especiales activas para "${category}" este mes.`,
      alert_type:      'normal',
    }
  }

  // Determinar alert_type
  let alert_type: AlertType
  let recommendation: string

  if (isInPeak) {
    alert_type    = 'peak'
    recommendation = `¡${bestEvent.name} está activo ahora! Es el momento ideal para campañas en "${category}". Aumenta el presupuesto y prioriza este producto.`
  } else if (bestDays <= 21) {
    alert_type    = 'approaching'
    recommendation = `${bestEvent.name} se acerca en ${bestDays} días. Prepara campañas en "${category}" ahora para tener el algoritmo optimizado cuando llegue el peak.`
  } else if (bestDays <= 60) {
    alert_type    = 'normal'
    recommendation = `${bestEvent.name} llega en ${bestDays} días. Buen momento para planificar campañas de "${category}" con anticipación.`
  } else {
    alert_type    = 'low'
    recommendation = `Sin temporada relevante para "${category}" en los próximos 60 días. Enfoca en campañas de conversión directa.`
  }

  return {
    score:           Math.min(10, Math.max(0, bestScore)),
    season_name:     bestEvent.name,
    days_until_peak: bestDays,
    recommendation,
    alert_type,
  }
}

// ─── Próxima temporada importante — para widget en dashboard ──────────────────

export interface UpcomingSeason {
  name:         string
  days_away:    number
  categories:   string[]
  importance:   'major' | 'medium' | 'minor'
  alert_type:   AlertType
}

export function getUpcomingSeasons(now: Date = new Date(), limit = 3): UpcomingSeason[] {
  const results: Array<UpcomingSeason & { days: number }> = []

  for (const event of SEASON_EVENTS) {
    const next = nextOccurrence(event, now)
    const days = daysBetween(now, next)

    // Solo mostrar eventos en los próximos 90 días
    if (days > 90) continue

    const alert_type: AlertType =
      days === 0 ? 'peak' :
      days <= 21 ? 'approaching' :
      'normal'

    results.push({
      name:       event.name,
      days_away:  days,
      categories: event.categories,
      importance: event.importance,
      alert_type,
      days,
    })
  }

  // Ordenar por proximidad, major primero si igual distancia
  results.sort((a, b) => {
    if (a.days !== b.days) return a.days - b.days
    const imp = { major: 0, medium: 1, minor: 2 }
    return imp[a.importance] - imp[b.importance]
  })

  return results.slice(0, limit).map(({ days: _d, ...rest }) => rest)
}
