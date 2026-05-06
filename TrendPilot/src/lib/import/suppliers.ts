// Catálogo curado de proveedores chinos para importación México
// En producción conectaría con Alibaba API / web scraping verificado

import type { Supplier, TrustBadge } from './types'

// ─── Catálogo de proveedores ──────────────────────────────────────────────────

export const SUPPLIER_CATALOG: Supplier[] = [

  // ── LENTES Y ÓPTICA ──────────────────────────────────────────────────────
  {
    id: 'jieying-optical',
    name: 'Wenzhou Jieying Optical Co., Ltd.',
    name_es: 'Jieying Optical — Wenzhou',
    location: 'Wenzhou, Zhejiang',
    years_on_platform: 12,
    positive_rating: 98.2,
    response_time_hours: 1,
    trade_assurance: true,
    verified_supplier: true,
    gold_supplier: true,
    certifications: ['CE', 'UV400', 'ISO 9001', 'ANSI Z87.1'],
    main_products: ['lentes de sol', 'gafas ópticas', 'gafas de seguridad', 'lentes deportivos'],
    categories: ['lentes', 'optica', 'accesorios', 'moda', 'seguridad'],
    min_order: 200,
    price_range: { min: 2.80, max: 5.50 },
    delivery_days_sea: 28,
    delivery_days_air: 7,
    trust_badge: 'ELITE',
    trust_score: 92,
    export_to_mexico: true,
    total_transactions: 4821,
    reorder_rate: 78,
    mexico_customers: 43,
    image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop',
    alibaba_url: 'https://www.alibaba.com/product-detail/wholesale-sunglasses',
    description_es: 'Fabricante especializado en lentes ópticos y de sol con 12 años de experiencia exportando a América Latina. Certificación UV400 garantizada en todos sus productos. 43 compradores mexicanos activos.',
    photo_analysis: {
      total_photos: 24,
      real_photos: 21,
      stock_photos: 3,
      concerns: [],
    },
    warnings: [],
    strengths: [
      'Certificación UV400 verificada — protección solar real',
      'Trade Assurance activo — dinero protegido si no llega',
      'Historial con 43 compradores mexicanos verificados',
      '78% de clientes que regresan a comprar de nuevo',
      'Respuesta en menos de 1 hora',
    ],
  },

  {
    id: 'colorvision-shenzhen',
    name: 'Shenzhen Color Vision Eyewear Trading Co., Ltd.',
    name_es: 'Color Vision Eyewear — Shenzhen',
    location: 'Shenzhen, Guangdong',
    years_on_platform: 6,
    positive_rating: 96.8,
    response_time_hours: 2,
    trade_assurance: true,
    verified_supplier: true,
    gold_supplier: false,
    certifications: ['CE', 'UV400'],
    main_products: ['lentes de sol', 'gafas fashion', 'lentes con polarizado', 'monturas'],
    categories: ['lentes', 'optica', 'moda', 'accesorios'],
    min_order: 100,
    price_range: { min: 1.50, max: 4.20 },
    delivery_days_sea: 25,
    delivery_days_air: 6,
    trust_badge: 'CONFIABLE',
    trust_score: 78,
    export_to_mexico: true,
    total_transactions: 1943,
    reorder_rate: 61,
    mexico_customers: 18,
    image_url: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=200&h=200&fit=crop',
    alibaba_url: 'https://www.alibaba.com/product-detail/fashion-sunglasses',
    description_es: 'Proveedor verificado especializado en lentes de moda y con polarizado. MOQ bajo de 100 piezas ideal para primeros pedidos. Trade Assurance activo.',
    photo_analysis: {
      total_photos: 18,
      real_photos: 14,
      stock_photos: 4,
      concerns: ['3 fotos parecen ser de otra marca — preguntar'],
    },
    warnings: [
      'Algunas fotos podrían ser de modelos de otras marcas — solicitar fotos reales del stock',
    ],
    strengths: [
      'MOQ de solo 100 piezas — ideal para prueba de mercado',
      'Trade Assurance activo',
      'Precio competitivo desde $1.50 USD',
      'Envío marítimo en 25 días',
    ],
  },

  {
    id: 'guangzhou-fashion-glasses',
    name: 'Guangzhou New Style Fashion Glasses Co.',
    name_es: 'New Style Fashion — Guangzhou',
    location: 'Guangzhou, Guangdong',
    years_on_platform: 3,
    positive_rating: 89.1,
    response_time_hours: 8,
    trade_assurance: false,
    verified_supplier: false,
    gold_supplier: false,
    certifications: [],
    main_products: ['lentes de sol económicos', 'gafas sin marca', 'accesorios moda'],
    categories: ['lentes', 'moda', 'accesorios'],
    min_order: 500,
    price_range: { min: 0.80, max: 2.50 },
    delivery_days_sea: 32,
    delivery_days_air: 8,
    trust_badge: 'REVISAR',
    trust_score: 55,
    export_to_mexico: false,
    total_transactions: 312,
    reorder_rate: 34,
    mexico_customers: 2,
    image_url: 'https://images.unsplash.com/photo-1534126416832-a88fdf2911c2?w=200&h=200&fit=crop',
    alibaba_url: 'https://www.alibaba.com/product-detail/cheap-sunglasses',
    description_es: 'Proveedor con precio muy bajo pero sin certificaciones ni Trade Assurance. Solo 3 años en plataforma y 2 clientes en México. Requiere mucha verificación antes de comprar.',
    photo_analysis: {
      total_photos: 8,
      real_photos: 3,
      stock_photos: 5,
      concerns: [
        'La mayoría son fotos de stock — no muestran el producto real',
        'Descripción menciona UV400 pero sin certificado que lo respalde',
        'Dimensiones de los lentes no especificadas',
      ],
    },
    warnings: [
      'Sin Trade Assurance — tu dinero NO está protegido',
      'Sin certificaciones verificadas — calidad de UV incierta',
      'MOQ de 500 piezas es muy alto para primera compra sin verificar',
      'Tiempo de respuesta de 8 horas — comunicación lenta',
      'Historial de ventas limitado (312 transacciones totales)',
    ],
    strengths: [
      'Precio muy bajo — desde $0.80 USD/pc',
    ],
  },

  // ── TECNOLOGÍA / ELECTRÓNICOS ─────────────────────────────────────────────
  {
    id: 'shenzhen-tech-factory',
    name: 'Shenzhen TechPower Electronics Co., Ltd.',
    name_es: 'TechPower Electronics — Shenzhen',
    location: 'Shenzhen, Guangdong',
    years_on_platform: 9,
    positive_rating: 97.5,
    response_time_hours: 2,
    trade_assurance: true,
    verified_supplier: true,
    gold_supplier: true,
    certifications: ['CE', 'FCC', 'RoHS', 'ISO 9001'],
    main_products: ['audífonos bluetooth', 'cargadores', 'powerbanks', 'cables USB-C', 'smartwatch'],
    categories: ['electronica', 'tech', 'accesorios'],
    min_order: 100,
    price_range: { min: 3.50, max: 45.00 },
    delivery_days_sea: 30,
    delivery_days_air: 5,
    trust_badge: 'ELITE',
    trust_score: 89,
    export_to_mexico: true,
    total_transactions: 8932,
    reorder_rate: 72,
    mexico_customers: 67,
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
    alibaba_url: 'https://www.alibaba.com/product-detail/electronics',
    description_es: 'Fabricante de electrónicos de consumo con todas las certificaciones. 67 clientes activos en México. Especialistas en audífonos y wearables.',
    photo_analysis: { total_photos: 32, real_photos: 30, stock_photos: 2, concerns: [] },
    warnings: [],
    strengths: [
      'Certificación FCC y CE verificadas',
      '67 compradores mexicanos activos',
      'Trade Assurance hasta $100,000 USD',
      'Personalización de marca disponible (OEM/ODM)',
    ],
  },

  // ── MODA / ROPA ───────────────────────────────────────────────────────────
  {
    id: 'guangzhou-fashion-co',
    name: 'Guangzhou Fashion Style Clothing Co., Ltd.',
    name_es: 'Fashion Style — Guangzhou',
    location: 'Guangzhou, Guangdong',
    years_on_platform: 7,
    positive_rating: 95.3,
    response_time_hours: 3,
    trade_assurance: true,
    verified_supplier: true,
    gold_supplier: true,
    certifications: ['OEKO-TEX', 'ISO 9001'],
    main_products: ['vestidos', 'playeras', 'pantalones', 'ropa de temporada', 'conjunto deportivo'],
    categories: ['moda', 'ropa', 'textiles'],
    min_order: 50,
    price_range: { min: 4.50, max: 25.00 },
    delivery_days_sea: 30,
    delivery_days_air: 7,
    trust_badge: 'CONFIABLE',
    trust_score: 81,
    export_to_mexico: true,
    total_transactions: 3201,
    reorder_rate: 65,
    mexico_customers: 29,
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
    alibaba_url: 'https://www.alibaba.com/product-detail/wholesale-clothing',
    description_es: 'Fabricante de moda con certificación OEKO-TEX en materiales. MOQ bajo de 50 piezas por diseño. 29 clientes en México.',
    photo_analysis: { total_photos: 45, real_photos: 40, stock_photos: 5, concerns: ['Algunas fotos son de modelos con buena iluminación — pedir fotos del producto real sin modelo'] },
    warnings: ['Tallas pueden diferir de las mexicanas — solicitar tabla de tallas detallada'],
    strengths: [
      'Certificación OEKO-TEX — materiales sin sustancias dañinas',
      'MOQ muy bajo — 50 piezas por diseño',
      'Amplio catálogo de estilos',
    ],
  },

  // ── HERRAMIENTAS / INDUSTRIAL ─────────────────────────────────────────────
  {
    id: 'yongkang-tools',
    name: 'Yongkang Powerful Tools Manufacturing Co.',
    name_es: 'Powerful Tools — Yongkang',
    location: 'Yongkang, Zhejiang',
    years_on_platform: 15,
    positive_rating: 97.8,
    response_time_hours: 4,
    trade_assurance: true,
    verified_supplier: true,
    gold_supplier: true,
    certifications: ['CE', 'GS', 'ISO 9001', 'EMC'],
    main_products: ['taladros', 'pulidoras', 'sierras', 'herramienta de mano', 'equipo neumático'],
    categories: ['herramientas', 'industrial', 'construccion'],
    min_order: 50,
    price_range: { min: 8.00, max: 120.00 },
    delivery_days_sea: 35,
    delivery_days_air: 8,
    trust_badge: 'ELITE',
    trust_score: 95,
    export_to_mexico: true,
    total_transactions: 12540,
    reorder_rate: 82,
    mexico_customers: 94,
    image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&h=200&fit=crop',
    alibaba_url: 'https://www.alibaba.com/product-detail/power-tools',
    description_es: 'Fabricante líder de herramientas en Yongkang (capital mundial de herramientas). 15 años de experiencia, 94 clientes en México. El más alto volumen de exportación a MX de esta lista.',
    photo_analysis: { total_photos: 28, real_photos: 28, stock_photos: 0, concerns: [] },
    warnings: [],
    strengths: [
      'Capital mundial de herramientas — fabricante local lider',
      '94 clientes activos en México — máxima experiencia con tu mercado',
      'Certificaciones CE y GS — cumple estándares europeos de seguridad',
      '82% de tasa de recompra',
    ],
  },

  // ── AGRÍCOLA ──────────────────────────────────────────────────────────────
  {
    id: 'shandong-agro',
    name: 'Shandong AgroTech Supply Co., Ltd.',
    name_es: 'AgroTech — Shandong',
    location: 'Weifang, Shandong',
    years_on_platform: 8,
    positive_rating: 94.1,
    response_time_hours: 6,
    trade_assurance: true,
    verified_supplier: true,
    gold_supplier: false,
    certifications: ['ISO 9001', 'SGS'],
    main_products: ['sistema de riego', 'mangueras', 'invernadero', 'herramienta agrícola', 'cubiertas'],
    categories: ['agricola', 'riego', 'invernadero'],
    min_order: 100,
    price_range: { min: 2.50, max: 85.00 },
    delivery_days_sea: 40,
    delivery_days_air: 10,
    trust_badge: 'CONFIABLE',
    trust_score: 76,
    export_to_mexico: true,
    total_transactions: 2180,
    reorder_rate: 58,
    mexico_customers: 21,
    image_url: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=200&h=200&fit=crop',
    alibaba_url: 'https://www.alibaba.com/product-detail/agricultural',
    description_es: 'Proveedor de equipo agrícola con amplio catálogo de riego y estructuras. 21 clientes en México, principalmente en Sinaloa y Sonora.',
    photo_analysis: { total_photos: 20, real_photos: 17, stock_photos: 3, concerns: [] },
    warnings: ['Algunos productos pueden requerir permiso SEMARNAT para importar'],
    strengths: [
      'Experiencia con agricultura mexicana (clientes en Sinaloa y Sonora)',
      'Certificación SGS — calidad verificada por tercero',
      'Amplio catálogo de riego por goteo',
    ],
  },

  // ── AUTOMOTRIZ ────────────────────────────────────────────────────────────
  {
    id: 'guangzhou-autoparts',
    name: 'Guangzhou AutoParts Direct Co., Ltd.',
    name_es: 'AutoParts Direct — Guangzhou',
    location: 'Guangzhou, Guangdong',
    years_on_platform: 10,
    positive_rating: 96.0,
    response_time_hours: 3,
    trade_assurance: true,
    verified_supplier: true,
    gold_supplier: true,
    certifications: ['IATF 16949', 'ISO 9001', 'SGS'],
    main_products: ['refacciones', 'luces LED', 'accesorios interior', 'filtros', 'frenos'],
    categories: ['automotriz', 'refacciones', 'accesorios'],
    min_order: 50,
    price_range: { min: 5.00, max: 200.00 },
    delivery_days_sea: 30,
    delivery_days_air: 6,
    trust_badge: 'ELITE',
    trust_score: 88,
    export_to_mexico: true,
    total_transactions: 6730,
    reorder_rate: 70,
    mexico_customers: 55,
    image_url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&h=200&fit=crop',
    alibaba_url: 'https://www.alibaba.com/product-detail/auto-parts',
    description_es: 'Especialista en refacciones con certificación IATF 16949 (estándar automotriz). 55 clientes en México. Compatible con marcas japonesas y americanas populares en MX.',
    photo_analysis: { total_photos: 35, real_photos: 33, stock_photos: 2, concerns: [] },
    warnings: ['Verificar compatibilidad con modelo de vehículo antes de ordenar'],
    strengths: [
      'Certificación IATF 16949 — estándar de calidad automotriz internacional',
      '55 compradores en México — máxima familiaridad con parque vehicular MX',
      'Trade Assurance activo',
    ],
  },
]

// ─── Funciones de búsqueda ────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string[]> = {
  lentes:       ['lentes', 'gafas', 'optica', 'sol', 'sol mayoreo', 'sunglasses'],
  tech:         ['electronica', 'tech', 'bluetooth', 'audifono', 'cargador', 'smartwatch', 'cable'],
  moda:         ['ropa', 'vestido', 'playera', 'moda', 'textil', 'clothing'],
  industrial:   ['herramienta', 'taladro', 'industrial', 'tool', 'construccion'],
  agricola:     ['agricola', 'riego', 'invernadero', 'siembra', 'cosecha'],
  automotriz:   ['auto', 'carro', 'refaccion', 'autopart', 'llanta', 'freno', 'luz'],
  accesorios:   ['joyeria', 'bolsa', 'cinturon', 'accesorio', 'complemento'],
}

export function searchSuppliers(query: string, limit = 10): Supplier[] {
  const q = query.toLowerCase()

  // Score cada proveedor por relevancia
  const scored = SUPPLIER_CATALOG.map(s => {
    let score = 0

    // Match en productos principales
    if (s.main_products.some(p => p.includes(q) || q.includes(p.split(' ')[0]))) score += 10

    // Match en categorías
    if (s.categories.some(c => q.includes(c) || c.includes(q.split(' ')[0]))) score += 8

    // Match por palabras clave del mapa
    for (const [, keywords] of Object.entries(CATEGORY_MAP)) {
      if (keywords.some(kw => q.includes(kw))) {
        if (s.categories.some(c => keywords.includes(c))) score += 6
      }
    }

    // Match por nombre
    if (s.name.toLowerCase().includes(q) || q.includes('china') || q.includes('mayoreo')) score += 3

    // Boost por trust score
    score += s.trust_score * 0.05

    return { supplier: s, score }
  })

  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.supplier)
}

export function getSupplierById(id: string): Supplier | undefined {
  return SUPPLIER_CATALOG.find(s => s.id === id)
}

export function getTrustBadgeConfig(badge: TrustBadge) {
  const configs = {
    ELITE:     { color: '#00FF88', bg: 'rgba(0,255,136,0.15)', label: 'Proveedor Élite',    emoji: '⭐' },
    CONFIABLE: { color: '#0066FF', bg: 'rgba(0,102,255,0.15)', label: 'Confiable',          emoji: '✅' },
    REVISAR:   { color: '#FFB800', bg: 'rgba(255,184,0,0.15)', label: 'Revisar primero',    emoji: '⚠️' },
    EVITAR:    { color: '#FF3B30', bg: 'rgba(255,59,48,0.15)', label: 'No recomendado',     emoji: '❌' },
  }
  return configs[badge]
}

export function getProductCategories(): string[] {
  return Object.keys(CATEGORY_MAP)
}
