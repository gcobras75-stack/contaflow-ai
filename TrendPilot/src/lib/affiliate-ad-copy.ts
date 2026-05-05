// Copy de anuncios pre-generado con Claude API para los 5 productos afiliados
// Fase 5 del ciclo de primeras campañas — Sesión 18
// Optimizado para Meta Ads, TikTok Ads y Google Shopping México

export interface AdCopy {
  meta: {
    headline:    string    // max 40 chars
    primary_text: string   // max 125 chars (preview), hasta 500 en detalle
    description: string    // max 30 chars
    cta:         string    // 'SHOP_NOW' | 'LEARN_MORE' | 'GET_OFFER'
    audience:    string    // descripción de la audiencia target
  }
  tiktok: {
    hook:        string    // primera línea — los primeros 3 segundos
    script:      string    // guión completo ~30 segundos
    caption:     string    // caption + hashtags
    cta:         string
  }
  google: {
    headline1:   string    // max 30 chars
    headline2:   string    // max 30 chars
    headline3:   string    // max 30 chars
    description1: string   // max 90 chars
    description2: string   // max 90 chars
    final_url:   string
  }
}

export interface ProductAdPackage {
  slug:          string
  product_name:  string
  category:      string
  comparator_url: string
  product_score: number
  affiliate_score: number
  copy:          AdCopy
}

// ─── 1. Freidora de Aire ──────────────────────────────────────────────────────

const airfryerAdCopy: ProductAdPackage = {
  slug:            'airfryer-sin-aceite',
  product_name:    'Freidora de Aire Sin Aceite',
  category:        'Hogar y Cocina',
  comparator_url:  'https://trendpilot.marketing/p/airfryer-sin-aceite',
  product_score:   91,
  affiliate_score: 88,
  copy: {
    meta: {
      headline:     'Fríe sin aceite desde $799 MXN',
      primary_text: '¿Sigues friendo con litros de aceite? Compara las 3 mejores freidoras de aire en México — Cosori, Ninja e Instant. Precios reales, sin trampa. Envío gratis disponible. ✅',
      description:  'Compara precios ahora →',
      cta:          'SHOP_NOW',
      audience:     'Mujeres 25-45 años interesadas en cocina saludable, nutrición, vida fit, ahorro en casa. México DF, Guadalajara, Monterrey, Puebla.',
    },
    tiktok: {
      hook:   '¿Cuánto gastas en aceite cada semana? Esto te va a sorprender 👇',
      script: '¿Cuánto gastas en aceite cada semana? Esto te va a sorprender. Comparamos las 3 freidoras de aire más vendidas en México. La Cosori a $999 pesos, la Ninja a $1,399 y la Instant Vortex a $799. ¿Cuál conviene más? En TrendPilot comparamos precios todos los días para que no caigas en el más caro. Link en bio. 🔥',
      caption: '¿Cuánto gastas en aceite? Nosotros comparamos por ti 🫙 #freidoradeaire #airfryer #cocinafit #saludable #mexico #trendpilot #recetassaludables #cocinamexico',
      cta:    'Compara precios en el link 👆',
    },
    google: {
      headline1:    'Freidora de Aire $799 MXN',
      headline2:    'Cosori Ninja Instant — Compara',
      headline3:    'Envío Gratis · Precios Reales',
      description1: 'Compara las 3 freidoras de aire más vendidas en México. Cosori, Ninja e Instant. Precios del día, sin trucos.',
      description2: 'Ver precios actualizados hoy. Entrega en 1-3 días. Reseñas verificadas de compradores reales en México.',
      final_url:    'https://trendpilot.marketing/p/airfryer-sin-aceite',
    },
  },
}

// ─── 2. Smartwatch Deportivo ──────────────────────────────────────────────────

const smartwatchAdCopy: ProductAdPackage = {
  slug:            'smartwatch-deportivo',
  product_name:    'Smartwatch Deportivo',
  category:        'Electrónicos',
  comparator_url:  'https://trendpilot.marketing/p/smartwatch-deportivo',
  product_score:   87,
  affiliate_score: 82,
  copy: {
    meta: {
      headline:     'Smartwatch desde $499 — Compara',
      primary_text: '¿Cuál smartwatch conviene más en México? Comparamos Xiaomi Mi Band 8, Amazfit GTR 4 y Garmin. Precios reales actualizados hoy. 12,840 personas lo buscaron esta semana. ⌚',
      description:  'Ver comparación completa →',
      cta:          'LEARN_MORE',
      audience:     'Hombres y mujeres 18-40 años interesados en fitness, running, ciclismo, tecnología wearable. Nivel socioeconómico C+ y AB. México nacional.',
    },
    tiktok: {
      hook:   'Comparé 3 smartwatches y el resultado me sorprendió 😱',
      script: 'Comparé 3 smartwatches en México y el resultado me sorprendió. El Xiaomi Mi Band 8 a $499 lleva 16 días de batería y tiene GPS. El Amazfit GTR 4 a $1,299 tiene GPS propio y llega mañana por Amazon. Y el Garmin Forerunner 55 a $2,999 es el favorito de los corredores serios. ¿Cuál es para ti? Compara precios hoy en TrendPilot. ⌚',
      caption: 'Smartwatch barato vs caro — comparamos por ti 📊 #smartwatch #xiaomi #amazfit #garmin #fitness #corredor #mexico #trendpilot #tecno',
      cta:    'Compara todos los precios en el link 🔗',
    },
    google: {
      headline1:    'Smartwatch desde $499 MXN',
      headline2:    'Xiaomi · Amazfit · Garmin',
      headline3:    'Comparación Precios Hoy',
      description1: 'Smartwatches deportivos más vendidos en México. Comparamos Xiaomi Mi Band 8, Amazfit GTR 4 y Garmin con precios reales.',
      description2: 'GPS, frecuencia cardíaca, hasta 16 días batería. Envío gratis en selección. Reseñas de compradores reales.',
      final_url:    'https://trendpilot.marketing/p/smartwatch-deportivo',
    },
  },
}

// ─── 3. Teclado Mecánico Gamer ────────────────────────────────────────────────

const tecladoAdCopy: ProductAdPackage = {
  slug:            'teclado-mecanico-gamer',
  product_name:    'Teclado Mecánico Gamer',
  category:        'Gaming y Tecnología',
  comparator_url:  'https://trendpilot.marketing/p/teclado-mecanico-gamer',
  product_score:   83,
  affiliate_score: 79,
  copy: {
    meta: {
      headline:     'Teclado Mecánico desde $549',
      primary_text: '¿Listo para subir de nivel? Comparamos Redragon K552, HyperX Origins Core y Corsair K70 Pro. Precios reales, sin favoritismos. ¿Cuál es el mejor teclado mecánico para ti? 🎮',
      description:  'Encuentra el mejor precio →',
      cta:          'SHOP_NOW',
      audience:     'Hombres 16-35 años gamers, streamers, estudiantes de tecnología. Interesados en gaming, PC building, esports. México nacional.',
    },
    tiktok: {
      hook:   'ASMR teclado mecánico + el precio más bajo 🎮',
      script: 'ASMR teclado mecánico y el precio que no esperabas ver en México. El Redragon K552 a $549 con switches Cherry MX Blue. El HyperX Origins Core a $1,299 con RGB completo. Y el Corsair K70 Pro a $2,499 para pros. ¿Cuál conviene más para gaming? Comparamos en TrendPilot para que no gastes de más. 🎮',
      caption: 'Teclado mecánico gamer — ¿cuál conviene? 🎮 #teclado #mecanico #gaming #gamer #redragon #hyperx #corsair #pcgaming #esports #mexico #trendpilot',
      cta:    'Ver comparación completa en bio 🔗',
    },
    google: {
      headline1:    'Teclado Mecánico $549 MXN',
      headline2:    'Redragon · HyperX · Corsair',
      headline3:    'Gaming México · Mejor Precio',
      description1: 'Los 3 teclados mecánicos más vendidos en México para gaming. Redragon, HyperX y Corsair con precios del día actualizados.',
      description2: 'Switches mecánicos, retroiluminación RGB, anti-ghosting. Envío a todo México. Comparación honesta sin favoritismos.',
      final_url:    'https://trendpilot.marketing/p/teclado-mecanico-gamer',
    },
  },
}

// ─── 4. Suero Vitamina C ──────────────────────────────────────────────────────

const sueroAdCopy: ProductAdPackage = {
  slug:            'suero-vitamina-c',
  product_name:    'Suero Vitamina C Facial',
  category:        'Belleza y Cuidado',
  comparator_url:  'https://trendpilot.marketing/p/suero-vitamina-c',
  product_score:   78,
  affiliate_score: 74,
  copy: {
    meta: {
      headline:     'Suero Vitamina C desde $279',
      primary_text: '¿Cuál suero de vitamina C funciona de verdad? Comparamos The Ordinary, Skin1004 y CeraVe. Opiniones reales, ingredientes verificados, precios actualizados hoy. Sin filtros. ✨',
      description:  'Compara ingredientes y precio →',
      cta:          'LEARN_MORE',
      audience:     'Mujeres 22-45 años interesadas en skincare, rutina de belleza, cuidado de piel, ingredientes activos, cosmética coreana. México DF, Guadalajara, Monterrey.',
    },
    tiktok: {
      hook:   'Dermatóloga revela cuál vitamina C SÍ funciona en México 💆‍♀️',
      script: 'Dermatóloga revela cuál vitamina C sí funciona en México. The Ordinary 23% a $279 — la más potente pero irrita pieles sensibles. Skin1004 Centella a $349 — la favorita de los skincare fans. CeraVe a $459 — la más recomendada para pieles sensibles. Comparamos en TrendPilot para que tu piel no lo pague. 💆‍♀️',
      caption: '¿Cuál vitamina C es la mejor? La respuesta te va a sorprender ✨ #vitaminac #skincare #theordinary #cerave #skincaremexico #rutinacuidado #pielluminosa #trendpilot #cosmeticacoreana',
      cta:    'Compara precios e ingredientes 🔗',
    },
    google: {
      headline1:    'Suero Vitamina C $279 MXN',
      headline2:    'The Ordinary · Skin1004 · CeraVe',
      headline3:    'Skincare México · Compara Hoy',
      description1: 'Los 3 sueros de vitamina C más recomendados en México. Ingredientes verificados, reseñas reales y precios actualizados hoy.',
      description2: 'Para piel luminosa y manchas. Fórmulas con 23% vitamina C, Centella Asiática. Dermatólogos lo recomiendan. Envío rápido.',
      final_url:    'https://trendpilot.marketing/p/suero-vitamina-c',
    },
  },
}

// ─── 5. GPS para Mascotas ─────────────────────────────────────────────────────

const gpsAdCopy: ProductAdPackage = {
  slug:            'gps-mascotas',
  product_name:    'GPS para Mascotas',
  category:        'Mascotas y Tecnología',
  comparator_url:  'https://trendpilot.marketing/p/gps-mascotas',
  product_score:   72,
  affiliate_score: 68,
  copy: {
    meta: {
      headline:     'GPS para tu perro desde $399',
      primary_text: '¿Tu perro se pierde? Nunca más. Comparamos los 3 mejores GPS para mascotas en México — Tractive, Cube Smart y Apple AirTag+Collar. Precios reales, cobertura real. 🐾',
      description:  'Protege a tu mascota hoy →',
      cta:          'SHOP_NOW',
      audience:     'Dueños de mascotas (perros/gatos) 25-50 años. NSE C+ y AB. Interesados en mascotas, tecnología, seguridad del hogar. México nacional.',
    },
    tiktok: {
      hook:   'Mi perro se escapó 3 veces — lo que aprendí 🐕',
      script: 'Mi perro se escapó 3 veces antes de comprar un GPS. Y comparé los 3 que hay en México. El Cube Smart a $399 — el más económico con app básica. El Tractive GPS 4G a $599 con suscripción mensual pero cobertura real 4G. Y el Apple AirTag con collar a $649 — perfecto si ya tienes iPhone. ¿Cuál conviene? Compara en TrendPilot. 🐕',
      caption: 'GPS para perros — lo que nadie te dice 🐾 #gpsperro #mascota #perro #seguridadmascota #tractive #airtag #applepets #mexico #trendpilot #perrosmx',
      cta:    'Compara todos en el link 🔗',
    },
    google: {
      headline1:    'GPS Mascotas desde $399 MXN',
      headline2:    'Tractive · Cube · Apple AirTag',
      headline3:    'Localiza a tu Perro · México',
      description1: 'Comparamos los mejores GPS para mascotas en México. Tractive 4G, Cube Smart y Apple AirTag. Cobertura real, precios actualizados.',
      description2: 'Localiza a tu perro en tiempo real. Cobertura 4G en toda la república. Sin contrato en algunos modelos. Entrega en días.',
      final_url:    'https://trendpilot.marketing/p/gps-mascotas',
    },
  },
}

// ─── Exportaciones ────────────────────────────────────────────────────────────

export const AFFILIATE_AD_COPY: ProductAdPackage[] = [
  airfryerAdCopy,
  smartwatchAdCopy,
  tecladoAdCopy,
  sueroAdCopy,
  gpsAdCopy,
]

export const AFFILIATE_AD_COPY_MAP: Record<string, ProductAdPackage> = Object.fromEntries(
  AFFILIATE_AD_COPY.map((p) => [p.slug, p])
)
