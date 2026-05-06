// Datos de los comparadores públicos /p/[slug]
// Mock data con precios y características reales del mercado mexicano

// Re-exportamos los tipos desde el módulo compartido para compatibilidad
export type { ProductOption, Review, FAQItem, ComparatorProduct } from './comparator-types'
import type { ComparatorProduct } from './comparator-types'

// ─── Audífonos Bluetooth ──────────────────────────────────────────────────────

const audifonosBluetooth: ComparatorProduct = {
  slug:           'audifonos-bluetooth',
  name:           'Audífonos Bluetooth',
  category:       'Electrónicos',
  emoji:          '🎧',
  description:    'Comparamos los mejores audífonos bluetooth disponibles hoy en México. Precios reales, opiniones sin filtrar.',
  trend_score:    94,
  searches_today: 8_420,
  last_updated:   '2026-05-05',
  options: [
    {
      id:              'jbl-tune-510bt',
      name:            'JBL Tune 510BT',
      platform:        'mercadolibre',
      platform_label:  'MercadoLibre',
      price:           599,
      original_price:  799,
      stars:           4.4,
      reviews_count:   3_812,
      delivery_days:   2,
      free_shipping:   true,
      stock_remaining: 47,
      trust_score:     82,
      warranty_months: 12,
      returns_days:    30,
      affiliate_url:   'https://www.mercadolibre.com.mx/jbl-tune-510bt',
      seller_name:     'JBL México Oficial',
      seller_level:    'MercadoLíder',
      pros: [
        'Precio más bajo del mercado',
        '40 hrs de batería con una carga',
        'Diadema plegable — fácil de cargar',
        'Bass Boost integrado',
        'Compatible con asistentes de voz',
      ],
      cons: [
        'Sin cancelación activa de ruido (ANC)',
        'Materiales de plástico — menos premium',
        'Micrófono mediocre en llamadas ruidosas',
      ],
    },
    {
      id:              'sony-wh-ch520',
      name:            'Sony WH-CH520',
      platform:        'amazon',
      platform_label:  'Amazon MX',
      price:           899,
      original_price:  1_099,
      stars:           4.6,
      reviews_count:   6_241,
      delivery_days:   1,
      free_shipping:   true,
      stock_remaining: 89,
      trust_score:     91,
      warranty_months: 12,
      returns_days:    30,
      affiliate_url:   'https://www.amazon.com.mx/Sony-WH-CH520',
      seller_name:     'Sony México',
      seller_level:    'Oficial',
      pros: [
        'Entrega Prime — llega mañana',
        'Sonido Sony de alta calidad',
        '50 hrs de batería (el mejor del mercado)',
        'Multi-device pairing — conecta 2 a la vez',
        'Diseño liviano — solo 147g',
      ],
      cons: [
        'Precio 50% más alto que el JBL',
        'Sin cancelación de ruido activa',
        'Carga micro-USB (no USB-C)',
      ],
    },
    {
      id:              'samsung-galaxy-buds2',
      name:            'Samsung Galaxy Buds2',
      platform:        'mercadolibre',
      platform_label:  'MercadoLibre',
      price:           1_299,
      stars:           4.5,
      reviews_count:   2_190,
      delivery_days:   3,
      free_shipping:   false,
      stock_remaining: 23,
      trust_score:     88,
      warranty_months: 12,
      returns_days:    30,
      affiliate_url:   'https://www.mercadolibre.com.mx/samsung-galaxy-buds2',
      seller_name:     'Samsung Galaxy Store MX',
      seller_level:    'MercadoLíder',
      pros: [
        'Cancelación activa de ruido (ANC) real',
        'Diseño in-ear — mejor aislamiento',
        'Integración perfecta con Galaxy/Android',
        'Funda de carga inalámbrica incluida',
      ],
      cons: [
        'El más caro de los tres',
        'Batería solo 5hrs (29hrs con estuche)',
        'Puede ser incómodo en orejas pequeñas',
        'Envío 3 días — no ideal si lo necesitas ya',
      ],
    },
  ],
  reviews: [
    {
      user: 'Carlos R.', initials: 'CR', stars: 5,
      text: 'Llegó en 2 días y el sonido es brutal para el precio. Uso el JBL para ir al gym y los 40hrs de batería son reales.',
      platform: 'MercadoLibre', option_name: 'JBL Tune 510BT',
      verified: true, helpful: 84, date: '2026-04-28',
    },
    {
      user: 'Sofía M.', initials: 'SM', stars: 4,
      text: 'El Sony llegó al día siguiente (Amazon Prime). El sonido es claramente mejor que los JBL que tuve antes. Le quito estrella porque usa micro-USB en 2026.',
      platform: 'Amazon MX', option_name: 'Sony WH-CH520',
      verified: true, helpful: 62, date: '2026-05-01',
    },
    {
      user: 'Miguel A.', initials: 'MA', stars: 3,
      text: 'El JBL cumple para lo que cuesta pero si usas Teams todo el día se nota que el micrófono es malo. No lo recomendaría para trabajo.',
      platform: 'MercadoLibre', option_name: 'JBL Tune 510BT',
      verified: true, helpful: 41, date: '2026-04-15',
    },
    {
      user: 'Valeria O.', initials: 'VO', stars: 5,
      text: 'Los Galaxy Buds2 son los mejores que he tenido. El ANC es real — se nota en el metro. El estuche inalámbrico es un detalle que marca la diferencia.',
      platform: 'MercadoLibre', option_name: 'Samsung Galaxy Buds2',
      verified: true, helpful: 98, date: '2026-04-20',
    },
    {
      user: 'Roberto Z.', initials: 'RZ', stars: 4,
      text: 'Compré el Sony porque Amazon entrega rápido. La calidad es muy buena pero esperaba algo más dado el precio. Las 50hrs de batería sí son reales.',
      platform: 'Amazon MX', option_name: 'Sony WH-CH520',
      verified: true, helpful: 29, date: '2026-04-30',
    },
  ],
  faq: [
    {
      q: '¿TrendPilot gana dinero si compro?',
      a: 'Sí, ganamos una comisión del 25% cuando alguien compra a través de nuestros links. Lo declaramos abiertamente porque creemos que la transparencia genera confianza. Pero comparamos todos los precios igual, ganes o no.',
    },
    {
      q: '¿Son precios actualizados?',
      a: 'Los precios se actualizan diariamente. Aunque pueden cambiar en minutos durante promociones, siempre mostramos la hora de última actualización.',
    },
    {
      q: '¿Qué audífonos recomienda TrendPilot?',
      a: 'Depende de ti. Si priorizas precio → JBL Tune 510BT. Si necesitas entrega rápida → Sony WH-CH520 (Amazon Prime). Si quieres lo mejor → Samsung Galaxy Buds2 con ANC. No hay una respuesta única.',
    },
    {
      q: '¿Qué pasa si tengo un problema con el producto?',
      a: 'La garantía y devoluciones las gestiona directamente la plataforma donde compraste (MercadoLibre o Amazon). TrendPilot no es el vendedor. Revisa siempre la política de devolución antes de comprar.',
    },
    {
      q: '¿Por qué incluyen opiniones negativas?',
      a: 'Porque son reales. Una comparadora que solo muestra lo bueno no te ayuda a decidir. Las desventajas que listamos son las más comunes en opiniones verificadas de compradores reales.',
    },
    {
      q: '¿Los Samsung Galaxy Buds2 son compatibles con iPhone?',
      a: 'Sí, funcionan con cualquier dispositivo Bluetooth incluyendo iPhone. Pero algunas funciones avanzadas (como configurar el ANC desde la app) solo están disponibles en Android/Samsung.',
    },
  ],
}

// ─── Termo Stanley Mini ───────────────────────────────────────────────────────

const termoStanleyMini: ComparatorProduct = {
  slug:           'termo-stanley-mini',
  name:           'Termo Stanley',
  category:       'Hogar y Cocina',
  emoji:          '🧊',
  description:    'Comparamos los mejores termos Stanley y alternativas disponibles hoy en México. Precios reales sin favoritismos.',
  trend_score:    88,
  searches_today: 5_630,
  last_updated:   '2026-05-05',
  options: [
    {
      id:              'stanley-iceflow-20',
      name:            'Stanley IceFlow 20oz',
      platform:        'mercadolibre',
      platform_label:  'MercadoLibre',
      price:           649,
      original_price:  799,
      stars:           4.7,
      reviews_count:   5_102,
      delivery_days:   3,
      free_shipping:   false,
      stock_remaining: 31,
      trust_score:     90,
      warranty_months: 360,    // lifetime
      returns_days:    30,
      affiliate_url:   'https://www.mercadolibre.com.mx/stanley-iceflow-20oz',
      seller_name:     'Stanley México Oficial',
      seller_level:    'MercadoLíder',
      pros: [
        'Marca original — garantía de por vida',
        'Mantiene el hielo 12 hrs (verificado)',
        'Boquilla flip para beber sin abrir',
        'Apto para lavavajillas',
        'El más valorado por compradores reales',
      ],
      cons: [
        'Envío 3 días — no llega rápido',
        'Tapa puede perder sellado con el tiempo',
        'Hay mucha falsificación — compra solo tiendas oficiales',
      ],
    },
    {
      id:              'hydro-flask-18',
      name:            'Hydro Flask 18oz',
      platform:        'amazon',
      platform_label:  'Amazon MX',
      price:           549,
      original_price:  699,
      stars:           4.5,
      reviews_count:   2_847,
      delivery_days:   1,
      free_shipping:   true,
      stock_remaining: 64,
      trust_score:     85,
      warranty_months: 360,    // lifetime
      returns_days:    30,
      affiliate_url:   'https://www.amazon.com.mx/Hydro-Flask-18oz',
      seller_name:     'Hydro Flask Official',
      seller_level:    'Oficial',
      pros: [
        'Precio más bajo — $100 menos que Stanley',
        'Amazon Prime — llega mañana',
        'Boca ancha — fácil de limpiar y rellenar con hielos',
        'Garantía de por vida también',
        'Pintura TempShield no descascarilla',
      ],
      cons: [
        'Menos reconocida en México que Stanley',
        'No incluye boquilla — solo tapa estándar',
        'Peso ligeramente mayor que Stanley',
      ],
    },
    {
      id:              'klean-kanteen-20',
      name:            'Klean Kanteen 20oz',
      platform:        'shopify',
      platform_label:  'Tienda oficial',
      price:           489,
      stars:           4.3,
      reviews_count:   891,
      delivery_days:   5,
      free_shipping:   false,
      stock_remaining: 18,
      trust_score:     76,
      warranty_months: 360,
      returns_days:    30,
      affiliate_url:   'https://www.kleankanteen.mx/',
      seller_name:     'Klean Kanteen México',
      seller_level:    'Verificado',
      pros: [
        'El precio más económico',
        'Acero inoxidable grado 18/8 — calidad premium',
        'Boca ancha — compatible con hielos grandes',
        'Empresa con certificación B Corp (sostenible)',
      ],
      cons: [
        'Menos conocida — menor red de soporte',
        'Envío más lento — 5 días hábiles',
        'Pocas opiniones en México todavía',
        'Tapa no incluida — se vende aparte',
      ],
    },
  ],
  reviews: [
    {
      user: 'Ana L.', initials: 'AL', stars: 5,
      text: 'El Stanley IceFlow lleva 6 meses conmigo y el hielo dura 12 hrs incluso con calor en Culiacán. La garantía de por vida es real — me reemplazaron uno que se dañó sin preguntas.',
      platform: 'MercadoLibre', option_name: 'Stanley IceFlow 20oz',
      verified: true, helpful: 143, date: '2026-04-10',
    },
    {
      user: 'Javier P.', initials: 'JP', stars: 5,
      text: 'El Hydro Flask llegó en 24 hrs (Amazon Prime) y la calidad es idéntica al Stanley. Me ahorré $100. Llevo 3 meses usándolo diario sin ningún problema.',
      platform: 'Amazon MX', option_name: 'Hydro Flask 18oz',
      verified: true, helpful: 89, date: '2026-04-25',
    },
    {
      user: 'María F.', initials: 'MF', stars: 2,
      text: 'Compré un "Stanley" en MercadoLibre (vendedor no oficial) y era falso. Cuidado con los precios muy baratos. Siempre compren en tiendas oficiales o verificadas.',
      platform: 'MercadoLibre', option_name: 'Stanley IceFlow 20oz',
      verified: true, helpful: 201, date: '2026-03-18',
    },
    {
      user: 'Luis G.', initials: 'LG', stars: 4,
      text: 'El Klean Kanteen tardó 5 días pero llegó en perfecto estado. Calidad muy buena para el precio. Le quito estrella porque la tapa se vende por separado — eso no lo dice claro en el anuncio.',
      platform: 'Tienda oficial', option_name: 'Klean Kanteen 20oz',
      verified: true, helpful: 34, date: '2026-04-28',
    },
  ],
  faq: [
    {
      q: '¿Cuál es la diferencia entre Stanley y Hydro Flask?',
      a: 'Ambos tienen garantía de por vida y retienen temperatura similar (12hrs para bebidas frías). La diferencia principal es el precio ($100 más barato el Hydro Flask) y la disponibilidad: el Hydro Flask está en Amazon con entrega en 1 día.',
    },
    {
      q: '¿Cómo saber si un Stanley es original?',
      a: 'Compra solo en tiendas con el badge "Oficial" o "MercadoLíder". Los falsos se venden a $150-300 MXN. Los originales cuestan desde $599. Un Stanley falso no retiene temperatura y la pintura se desprende rápido.',
    },
    {
      q: '¿TrendPilot gana comisión si compro aquí?',
      a: 'Sí. Ganamos el 25% cuando alguien compra a través de nuestros links. Lo declaramos abiertamente. Pero comparamos los precios sin favoritismo — si el más barato es el mejor para ti, te lo decimos.',
    },
    {
      q: '¿Se pueden meter en el lavavajillas?',
      a: 'El Stanley IceFlow 20oz sí es apto para lavavajillas. El Hydro Flask solo a mano (el calor del lavavajillas puede dañar el aislamiento). El Klean Kanteen solo a mano también.',
    },
    {
      q: '¿Cuánto tiempo mantienen el hielo realmente?',
      a: 'En condiciones reales (México, 35°C exterior): Stanley y Hydro Flask mantienen hielo ~10-12 hrs. Los claims de "24 hrs" aplican en condiciones de laboratorio. Con agua fría (sin hielo): 8-10 hrs los tres.',
    },
    {
      q: '¿Qué pasa si mi Stanley tiene un defecto?',
      a: 'La garantía de por vida de Stanley se gestiona directamente con Stanley. Necesitas comprobante de compra y fotos del defecto. Solo aplica a defectos de fabricación, no a caídas o mal uso.',
    },
  ],
}

// ─── Crema de Colágeno ────────────────────────────────────────────────────────

const creamaColageno: ComparatorProduct = {
  slug:           'crema-colageno',
  name:           'Crema de Colágeno',
  category:       'Belleza y Cuidado',
  emoji:          '✨',
  description:    'Comparamos las cremas de colágeno más vendidas en México. Incluimos ingredientes reales y lo que dice la ciencia.',
  trend_score:    79,
  searches_today: 4_210,
  last_updated:   '2026-05-05',
  options: [
    {
      id:              'neutrogena-collagen',
      name:            'Neutrogena Rapid Collagen',
      platform:        'mercadolibre',
      platform_label:  'MercadoLibre',
      price:           219,
      original_price:  299,
      stars:           4.3,
      reviews_count:   4_892,
      delivery_days:   2,
      free_shipping:   true,
      stock_remaining: 112,
      trust_score:     86,
      warranty_months: 0,
      returns_days:    30,
      affiliate_url:   'https://www.mercadolibre.com.mx/neutrogena-rapid-collagen',
      seller_name:     'Neutrogena México',
      seller_level:    'MercadoLíder',
      pros: [
        'Precio más económico — 27% más barata hoy',
        'Marca farmacéutica respaldada por dermatólogos',
        'Envío rápido 2 días con flete gratis',
        'Fórmula sin fragancia — apta para piel sensible',
        'Más de 4,800 opiniones positivas',
      ],
      cons: [
        'Textura más pesada — no ideal para piel grasa',
        'El colágeno tópico tiene evidencia científica limitada',
        'Puede causar granos en piel acnéica',
      ],
    },
    {
      id:              'loreal-revitalift',
      name:            "L'Oréal Revitalift Colágeno",
      platform:        'amazon',
      platform_label:  'Amazon MX',
      price:           349,
      original_price:  429,
      stars:           4.5,
      reviews_count:   8_341,
      delivery_days:   1,
      free_shipping:   true,
      stock_remaining: 78,
      trust_score:     89,
      warranty_months: 0,
      returns_days:    30,
      affiliate_url:   'https://www.amazon.com.mx/loreal-revitalift-colageno',
      seller_name:     "L'Oréal Oficial Amazon",
      seller_level:    'Oficial',
      pros: [
        'La más vendida en México (8,000+ opiniones)',
        'Amazon Prime — llega mañana',
        'Textura ligera — apta para piel grasa y mixta',
        'Retinol + Colágeno — combinación más completa',
        'Resultados visibles documentados en 4 semanas',
      ],
      cons: [
        'La más cara de las tres',
        'Contiene fragancia — puede irritar piel muy sensible',
        'El retinol requiere protector solar obligatorio',
      ],
    },
    {
      id:              'cetaphil-pro-collagen',
      name:            'Cetaphil Pro Collagen',
      platform:        'shopify',
      platform_label:  'Farmacia en línea',
      price:           289,
      stars:           4.4,
      reviews_count:   1_205,
      delivery_days:   4,
      free_shipping:   false,
      stock_remaining: 34,
      trust_score:     91,
      warranty_months: 0,
      returns_days:    30,
      affiliate_url:   'https://www.farmaciasguadalajara.com/cetaphil-pro',
      seller_name:     'Farmacias Guadalajara',
      seller_level:    'Verificado',
      pros: [
        'La más recomendada por dermatólogos mexicanos',
        'Fórmula hipoalergénica — la más segura para piel sensible',
        'Sin fragancia, sin parabenos, sin colorantes',
        'pH balanceado clínicamente probado',
      ],
      cons: [
        'Menos disponible — envío 4 días',
        'Sin flete gratis',
        'Menos opiniones disponibles',
        'Textura muy básica — poca experiencia sensorial',
      ],
    },
    {
      id:              'shein-crema-colageno',
      name:            'Crema Anti-edad Colágeno SHEIN',
      platform:        'shein' as const,
      platform_label:  'SHEIN MX',
      price:           149,
      original_price:  299,
      stars:           4.1,
      reviews_count:   3_402,
      delivery_days:   5,
      free_shipping:   true,
      stock_remaining: 999,
      trust_score:     70,
      warranty_months: 0,
      returns_days:    35,
      affiliate_url:   'https://shein.com.mx/collagen-anti-aging-cream-p-9876543.html?ref=4544144225&ref_uid=4544144225&url_from=3EF4J',
      seller_name:     'SHEIN Beauty México',
      seller_level:    'Verificado',
      pros: [
        'El precio más bajo — 50% menos que L\'Oréal',
        'Colágeno + Vitamina E formulación hidratante',
        'Entrega 5 días desde almacén México',
        '35 días para devolución gratuita',
        '+3,000 opiniones de compradoras reales',
      ],
      cons: [
        'Sin aval dermatológico certificado',
        'Sin retinol — menos efectiva para líneas profundas',
        'Calidad de ingredientes no verificable independientemente',
      ],
    },
  ],
  reviews: [
    {
      user: 'Gabriela H.', initials: 'GH', stars: 5,
      text: "Llevo 2 meses con L'Oréal Revitalift y sí se nota diferencia en hidratación. Llegó al día siguiente con Amazon. El retinol pica un poco al principio — es normal.",
      platform: 'Amazon MX', option_name: "L'Oréal Revitalift",
      verified: true, helpful: 112, date: '2026-04-18',
    },
    {
      user: 'Patricia N.', initials: 'PN', stars: 4,
      text: 'Compré la Neutrogena porque es la más barata. Cumple para hidratación básica pero no esperes milagros. El colágeno en crema no penetra la piel — eso lo dice la ciencia.',
      platform: 'MercadoLibre', option_name: 'Neutrogena Rapid Collagen',
      verified: true, helpful: 87, date: '2026-04-05',
    },
    {
      user: 'Rosa C.', initials: 'RC', stars: 5,
      text: 'Piel muy sensible y la Cetaphil es lo único que no me irrita. Sí tarda 4 días en llegar pero vale la espera. Mi dermatólogo la recomienda explícitamente.',
      platform: 'Farmacias Guadalajara', option_name: 'Cetaphil Pro Collagen',
      verified: true, helpful: 64, date: '2026-04-22',
    },
    {
      user: 'Diana S.', initials: 'DS', stars: 2,
      text: 'La Neutrogena me tapó los poros. Piel grasa no es compatible con esta fórmula. Debería estar más claro en la descripción.',
      platform: 'MercadoLibre', option_name: 'Neutrogena Rapid Collagen',
      verified: true, helpful: 49, date: '2026-03-30',
    },
    {
      user: 'Mónica V.', initials: 'MV', stars: 4,
      text: "La L'Oréal es buena pero con el retinol HAY que usar bloqueador solar sí o sí. Eso no lo explican bien en el empaque y varias amigas se quemaron por no saberlo.",
      platform: 'Amazon MX', option_name: "L'Oréal Revitalift",
      verified: true, helpful: 138, date: '2026-04-29',
    },
  ],
  faq: [
    {
      q: '¿El colágeno en crema realmente funciona?',
      a: 'La ciencia dice: el colágeno tópico no penetra la dermis porque la molécula es muy grande. Lo que sí funciona es el retinol (estimula producción propia de colágeno) y la hidratación. Te lo decimos aunque eso no te haga comprar más.',
    },
    {
      q: '¿Cuál crema recomienda TrendPilot?',
      a: 'Depende de tu tipo de piel. Piel sensible → Cetaphil (la más segura). Piel normal/mixta y quieres resultados → L\'Oréal Revitalift (la más completa). Presupuesto limitado → Neutrogena (cumple para hidratación).',
    },
    {
      q: '¿Debo usar protector solar con estas cremas?',
      a: 'Con L\'Oréal Revitalift: obligatorio (contiene retinol que fotosensibiliza). Con Neutrogena y Cetaphil: recomendado para protección diaria, pero no es urgente.',
    },
    {
      q: '¿TrendPilot gana si compro aquí?',
      a: 'Sí, el 25% de comisión. Lo declaramos. Nuestro negocio depende de que encuentres un buen producto — si te decepciona, no vuelves.',
    },
    {
      q: '¿En cuánto tiempo se ven resultados?',
      a: 'Hidratación: desde el primer uso. Líneas de expresión finas: 4-8 semanas de uso constante. Cambios estructurales reales: 3-6 meses. Las cremas no reemplazan tratamientos médicos estéticos.',
    },
    {
      q: '¿Puedo usar estas cremas si tengo acné activo?',
      a: 'Cetaphil Pro: sí, es la más segura para piel acnéica. Neutrogena: con cuidado, puede tapar poros. L\'Oréal con retinol: puede irritar pieles con acné activo. Consulta a tu dermatólogo si tienes acné severo.',
    },
  ],
}

// ─── Cargador Inalámbrico ─────────────────────────────────────────────────────

const cargadorInalambrico: ComparatorProduct = {
  slug:           'cargador-inalambrico',
  name:           'Cargador Inalámbrico',
  category:       'Electrónicos',
  emoji:          '⚡',
  description:    'Comparamos los mejores cargadores inalámbricos disponibles en México. Velocidad real vs velocidad anunciada.',
  trend_score:    85,
  searches_today: 3_890,
  last_updated:   '2026-05-05',
  options: [
    {
      id:              'anker-pad-15w',
      name:            'Anker 315 Wireless Pad 15W',
      platform:        'mercadolibre',
      platform_label:  'MercadoLibre',
      price:           299,
      original_price:  399,
      stars:           4.5,
      reviews_count:   6_214,
      delivery_days:   2,
      free_shipping:   true,
      stock_remaining: 87,
      trust_score:     88,
      warranty_months: 18,
      returns_days:    30,
      affiliate_url:   'https://www.mercadolibre.com.mx/anker-wireless-pad-15w',
      seller_name:     'Anker México Oficial',
      seller_level:    'MercadoLíder',
      pros: [
        'Precio más bajo — 40% más barato que Belkin',
        '15W para Samsung, 7.5W para iPhone',
        'Carga hasta 10x en un año sin degradar calidad',
        'Incluye cable USB-C — no necesitas comprar nada extra',
        'Más de 6,000 opiniones — la más probada',
      ],
      cons: [
        'Sin adaptador de corriente — necesitas uno propio',
        'Diseño básico — no se ve premium',
        'Calienta ligeramente el teléfono (normal pero notable)',
      ],
    },
    {
      id:              'belkin-boost-15w',
      name:            'Belkin BoostCharge 15W',
      platform:        'amazon',
      platform_label:  'Amazon MX',
      price:           499,
      original_price:  649,
      stars:           4.6,
      reviews_count:   3_841,
      delivery_days:   1,
      free_shipping:   true,
      stock_remaining: 41,
      trust_score:     90,
      warranty_months: 24,
      returns_days:    30,
      affiliate_url:   'https://www.amazon.com.mx/belkin-boostcharge-15w',
      seller_name:     'Belkin México',
      seller_level:    'Oficial',
      pros: [
        'Amazon Prime — llega mañana',
        'Carga la más rápida en pruebas reales',
        'Garantía 2 años — la más larga',
        'Certificado Made for MagSafe (iPhone)',
        'Disipación de calor superior — cuida más la batería',
      ],
      cons: [
        'El más caro — $200 más que Anker',
        'NO incluye adaptador de corriente',
        'Solo 15W — Samsung Galaxy puede ir a 25W con cargador Samsung',
      ],
    },
    {
      id:              'samsung-wireless-15w',
      name:            'Samsung Wireless Charger Pad 15W',
      platform:        'mercadolibre',
      platform_label:  'MercadoLibre',
      price:           429,
      stars:           4.4,
      reviews_count:   2_103,
      delivery_days:   3,
      free_shipping:   false,
      stock_remaining: 19,
      trust_score:     86,
      warranty_months: 12,
      returns_days:    30,
      affiliate_url:   'https://www.mercadolibre.com.mx/samsung-wireless-charger-pad',
      seller_name:     'Samsung Galaxy Store MX',
      seller_level:    'MercadoLíder',
      pros: [
        'Optimizado para Galaxy — carga a 15W real sin límites',
        'Compatible con todos los estándares Qi',
        'Diseño ultrafino — 4.7mm de grosor',
        'Indicador LED discreto — no molesta de noche',
      ],
      cons: [
        'Para iPhone carga a 7.5W (no es malo, pero Belkin certifica MagSafe)',
        'Sin cable ni adaptador incluidos',
        'Envío 3 días',
        'Garantía más corta — solo 12 meses',
      ],
    },
  ],
  reviews: [
    {
      user: 'Eduardo M.', initials: 'EM', stars: 5,
      text: 'El Anker lleva 1 año en mi buró y carga perfecto todos los días. Por $299 es imposible pedirle más. Lo único: necesitas tu propio adaptador de corriente.',
      platform: 'MercadoLibre', option_name: 'Anker 315 Wireless 15W',
      verified: true, helpful: 174, date: '2026-04-12',
    },
    {
      user: 'Claudia R.', initials: 'CR', stars: 5,
      text: 'Compré el Belkin para mi iPhone 15 Pro. Carga rápido y el certificado MagSafe es importante para no dañar la batería. Llegó en 24 hrs con Amazon Prime.',
      platform: 'Amazon MX', option_name: 'Belkin BoostCharge 15W',
      verified: true, helpful: 91, date: '2026-04-27',
    },
    {
      user: 'Omar T.', initials: 'OT', stars: 3,
      text: 'El Samsung carga bien mi Galaxy S24 pero el envío tardó 4 días y vino sin cable. Para ese precio esperaba más contenido en la caja.',
      platform: 'MercadoLibre', option_name: 'Samsung Wireless Charger 15W',
      verified: true, helpful: 38, date: '2026-04-20',
    },
    {
      user: 'Fernanda B.', initials: 'FB', stars: 4,
      text: 'El Anker calienta un poco más que el Belkin — lo comprobé con termómetro. No es peligroso pero sí perceptible. Para el precio, sigue siendo la mejor opción.',
      platform: 'MercadoLibre', option_name: 'Anker 315 Wireless 15W',
      verified: true, helpful: 67, date: '2026-05-02',
    },
  ],
  faq: [
    {
      q: '¿Qué velocidad de carga inalámbrica es real?',
      a: 'Los 15W anunciados aplican en condiciones ideales (teléfono frio, batería entre 20-80%). En uso real: iPhone carga a ~7W, Samsung Galaxy a ~12W. La carga inalámbrica siempre es más lenta que cable.',
    },
    {
      q: '¿Cuál es compatible con mi iPhone?',
      a: 'Los tres son compatibles con iPhone. Sin embargo, el Belkin tiene certificación MagSafe oficial, lo que asegura que opera dentro de los parámetros de Apple. Los otros son Qi genérico — funcionan pero sin garantía de Apple.',
    },
    {
      q: '¿La carga inalámbrica daña la batería?',
      a: 'Genera más calor que el cable, y el calor sí degrada la batería con el tiempo. Para uso diario no es grave. El Belkin tiene la mejor disipación de calor de los tres.',
    },
    {
      q: '¿Necesito comprar algo extra?',
      a: 'Los tres vienen SIN adaptador de corriente (clavija de pared). Solo el Anker incluye el cable USB-C. Necesitas tu propio adaptador de al menos 18W para carga rápida. Un adaptador de 5W lento reduce la velocidad a la mitad.',
    },
    {
      q: '¿TrendPilot gana comisión si compro?',
      a: 'Sí, el 25%. Lo declaramos porque creemos que la honestidad es más valiosa que el truco. Si no es el producto correcto para ti, te lo decimos aunque perdamos la comisión.',
    },
    {
      q: '¿Funciona con funda de teléfono?',
      a: 'Sí, los tres funcionan con fundas de hasta 5mm de grosor (la mayoría de fundas delgadas). Fundas con tarjetas de crédito integradas o fundas de metal pueden bloquear la carga.',
    },
  ],
}

// ─── Mapa de productos ────────────────────────────────────────────────────────

import { AFFILIATE_PRODUCTS } from './affiliate-comparators'

const PRODUCTS: Record<string, ComparatorProduct> = {
  'audifonos-bluetooth':  audifonosBluetooth,
  'termo-stanley-mini':   termoStanleyMini,
  'crema-colageno':       creamaColageno,
  'cargador-inalambrico': cargadorInalambrico,
  ...AFFILIATE_PRODUCTS,   // 5 productos afiliados: airfryer, smartwatch, teclado, suero, gps
}

export function getProduct(slug: string): ComparatorProduct | null {
  return PRODUCTS[slug] ?? null
}

export function getAllSlugs(): string[] {
  return Object.keys(PRODUCTS)
}

export function getAllProducts(): ComparatorProduct[] {
  return Object.values(PRODUCTS)
}
