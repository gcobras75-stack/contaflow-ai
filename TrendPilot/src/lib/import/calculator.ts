// Calculadora de importación China → México
// Calcula: CIF, Arancel, IVA, DTA, Agente Aduanal, Flete Interno

import type { CalculatorInput, CalculatorResult } from './types'

// Tipo de cambio USD → MXN (en producción fetch de Banxico)
const EXCHANGE_RATE = 17.5

// ─── Categorías de productos con fracción arancelaria y tasa ─────────────────

interface TariffInfo {
  hs_code:         string
  description:     string
  arancel_rate:    number  // porcentaje
  special_permits: string[]
}

const TARIFF_MAP: Record<string, TariffInfo> = {
  // Óptica
  lentes: {
    hs_code: '9004.10',
    description: 'Gafas de sol',
    arancel_rate: 20,
    special_permits: [],
  },
  optica: {
    hs_code: '9004.90',
    description: 'Gafas correctivas y de seguridad',
    arancel_rate: 15,
    special_permits: [],
  },
  // Electrónica
  electronica: {
    hs_code: '8517.12',
    description: 'Teléfonos inteligentes y dispositivos',
    arancel_rate: 0,
    special_permits: ['IFT (Instituto Federal de Telecomunicaciones)'],
  },
  tech: {
    hs_code: '8518.30',
    description: 'Auriculares y audífonos',
    arancel_rate: 15,
    special_permits: [],
  },
  cargadores: {
    hs_code: '8504.40',
    description: 'Convertidores y cargadores eléctricos',
    arancel_rate: 5,
    special_permits: ['NOM-001-SCFI (seguridad eléctrica)'],
  },
  // Moda / Textil
  moda: {
    hs_code: '6211.42',
    description: 'Prendas de vestir de algodón',
    arancel_rate: 30,
    special_permits: [],
  },
  ropa: {
    hs_code: '6204.42',
    description: 'Ropa de vestir mujer',
    arancel_rate: 30,
    special_permits: [],
  },
  textil: {
    hs_code: '5208.21',
    description: 'Tejidos de algodón',
    arancel_rate: 20,
    special_permits: [],
  },
  // Calzado
  calzado: {
    hs_code: '6404.11',
    description: 'Calzado deportivo con suela de goma',
    arancel_rate: 25,
    special_permits: [],
  },
  // Herramientas
  herramientas: {
    hs_code: '8467.21',
    description: 'Taladros y herramientas eléctricas',
    arancel_rate: 10,
    special_permits: ['NOM-016-SCFI (herramienta eléctrica)'],
  },
  industrial: {
    hs_code: '8205.59',
    description: 'Herramientas de mano diversas',
    arancel_rate: 10,
    special_permits: [],
  },
  // Automotriz
  automotriz: {
    hs_code: '8708.99',
    description: 'Partes y accesorios para automóviles',
    arancel_rate: 20,
    special_permits: [],
  },
  // Agrícola
  agricola: {
    hs_code: '8424.82',
    description: 'Equipos de irrigación agrícola',
    arancel_rate: 5,
    special_permits: ['SEMARNAT si contiene pesticidas'],
  },
  // Belleza / Cosméticos
  cosmeticos: {
    hs_code: '3304.99',
    description: 'Cosméticos y productos de belleza',
    arancel_rate: 15,
    special_permits: ['COFEPRIS (registro sanitario)'],
  },
  belleza: {
    hs_code: '3304.99',
    description: 'Productos de cuidado personal',
    arancel_rate: 15,
    special_permits: ['COFEPRIS (registro sanitario)'],
  },
  // Joyería
  joyeria: {
    hs_code: '7117.19',
    description: 'Bisutería y joyería de fantasía',
    arancel_rate: 15,
    special_permits: [],
  },
  // Juguetes
  juguetes: {
    hs_code: '9503.00',
    description: 'Juguetes y artículos de recreo',
    arancel_rate: 20,
    special_permits: ['NOM-015-SCFI (juguetes)'],
  },
  // Default
  general: {
    hs_code: '9999.99',
    description: 'Mercancía general',
    arancel_rate: 15,
    special_permits: [],
  },
}

// ─── Costos de flete marítimo por ruta (USD) ──────────────────────────────────

const SEA_FREIGHT_BASE: Record<string, number> = {
  'Guangzhou':  750,
  'Shenzhen':   800,
  'Shanghai':   900,
  'Yiwu':       850,
  'Beijing':   1100,
  'Tianjin':   1000,
  'Ningbo':     870,
}

const AIR_FREIGHT_RATE_PER_KG = 8  // USD/kg promedio

// Estimado de peso por 100 unidades según producto (kg)
const WEIGHT_PER_100_UNITS: Record<string, number> = {
  lentes:       2,
  electronica:  8,
  tech:         5,
  moda:         15,
  ropa:         12,
  herramientas: 30,
  industrial:   25,
  automotriz:   40,
  agricola:     20,
  cosmeticos:   10,
  joyeria:      1,
  general:      10,
}

// ─── Flete interno México (MXN por embarque desde puerto) ────────────────────

const INLAND_FREIGHT: Record<string, Record<string, number>> = {
  Manzanillo: {
    'Culiacán':     4500,
    'Mazatlán':     3800,
    'Guadalajara':  3500,
    'CDMX':         7500,
    'Monterrey':    9500,
    'Tijuana':     12000,
    'Hermosillo':   6500,
    'Chihuahua':    8000,
    'León':         5000,
    'Puebla':       8000,
    'Querétaro':    7000,
    'Mérida':      11000,
    'default':      7000,
  },
  'Lázaro Cárdenas': {
    'Culiacán':     7000,
    'Guadalajara':  4000,
    'CDMX':         6500,
    'Monterrey':   10500,
    'default':      7500,
  },
  AICM: {
    'CDMX':         1500,
    'Guadalajara':  4500,
    'Monterrey':    5500,
    'Culiacán':     8000,
    'default':      4000,
  },
  Veracruz: {
    'CDMX':         4500,
    'Monterrey':    7000,
    'Guadalajara':  8000,
    'default':      6000,
  },
}

// ─── Puerto de entrada por origen y modo ─────────────────────────────────────

function getPortOfEntry(origin: string, airFreight: boolean): string {
  if (airFreight) return 'AICM'
  // Todos los destinos principales desde China van por Manzanillo
  return 'Manzanillo'
}

// ─── Detectar categoría del producto ─────────────────────────────────────────

function detectCategory(product: string): string {
  const p = product.toLowerCase()
  if (p.includes('lente') || p.includes('gafa') || p.includes('óptico') || p.includes('sol')) return 'lentes'
  if (p.includes('celular') || p.includes('iphone') || p.includes('samsung') || p.includes('teléfono')) return 'electronica'
  if (p.includes('audifon') || p.includes('auricular') || p.includes('bluetooth')) return 'tech'
  if (p.includes('cargador') || p.includes('powerbank')) return 'cargadores'
  if (p.includes('ropa') || p.includes('vestido') || p.includes('blusa') || p.includes('pantalón')) return 'moda'
  if (p.includes('playera') || p.includes('camisa') || p.includes('textil') || p.includes('tela')) return 'ropa'
  if (p.includes('zapato') || p.includes('tenis') || p.includes('calzado') || p.includes('sandalia')) return 'calzado'
  if (p.includes('taladro') || p.includes('pulidora') || p.includes('sierra') || p.includes('herramienta')) return 'herramientas'
  if (p.includes('industri') || p.includes('maquinaria') || p.includes('equipo')) return 'industrial'
  if (p.includes('auto') || p.includes('carro') || p.includes('refaccion') || p.includes('moto')) return 'automotriz'
  if (p.includes('riego') || p.includes('agricol') || p.includes('semilla') || p.includes('invernadero')) return 'agricola'
  if (p.includes('crema') || p.includes('cosmético') || p.includes('maquillaje') || p.includes('serum')) return 'cosmeticos'
  if (p.includes('joya') || p.includes('bisuter') || p.includes('collar') || p.includes('pulsera')) return 'joyeria'
  if (p.includes('juguete') || p.includes('muñeca') || p.includes('lego')) return 'juguetes'
  return 'general'
}

// ─── Función principal de cálculo ────────────────────────────────────────────

export function calculateImportCost(input: CalculatorInput): CalculatorResult {
  const {
    product,
    unit_price_usd,
    quantity,
    origin_city,
    destination_city,
    use_air_freight = false,
  } = input

  const category = detectCategory(product)
  const tariff   = TARIFF_MAP[category] ?? TARIFF_MAP.general

  // 1. FOB (Free On Board) — valor del producto
  const fob_value_usd = unit_price_usd * quantity

  // 2. Flete
  let freight_usd: number
  if (use_air_freight) {
    const weight_kg = ((WEIGHT_PER_100_UNITS[category] ?? 10) / 100) * quantity
    freight_usd = Math.max(weight_kg * AIR_FREIGHT_RATE_PER_KG, 150)
  } else {
    const base = SEA_FREIGHT_BASE[origin_city] ?? 900
    // Escalar por tamaño del pedido (LCL hasta ~$5,000 USD, luego FCL)
    if (fob_value_usd < 5000) {
      freight_usd = base * 0.4  // LCL (Less than Container Load)
    } else if (fob_value_usd < 20000) {
      freight_usd = base         // LCL mediano
    } else {
      freight_usd = base * 1.8  // FCL (Full Container Load)
    }
  }

  // 3. Seguro (1.5% del FOB+Flete)
  const insurance_usd = (fob_value_usd + freight_usd) * 0.015

  // 4. CIF (Cost Insurance Freight) — base imponible en aduana
  const cif_usd = fob_value_usd + freight_usd + insurance_usd
  const cif_mxn = cif_usd * EXCHANGE_RATE

  // 5. Arancel
  const arancel_rate = tariff.arancel_rate
  const arancel_mxn  = cif_mxn * (arancel_rate / 100)

  // 6. IVA (16% sobre CIF + Arancel)
  const iva_mxn = (cif_mxn + arancel_mxn) * 0.16

  // 7. DTA — Derecho de Trámite Aduanero (0.8% del CIF, máx ~$9,000 MXN)
  const dta_mxn = Math.min(cif_mxn * 0.008, 9000)

  // 8. Honorarios agente aduanal (tarifa plana por pedido)
  let agent_fees_mxn: number
  if (cif_usd < 1000)       agent_fees_mxn = 3500
  else if (cif_usd < 5000)  agent_fees_mxn = 5500
  else if (cif_usd < 20000) agent_fees_mxn = 7500
  else                       agent_fees_mxn = 10000

  // 9. Flete interno México
  const port_entry = getPortOfEntry(origin_city, use_air_freight)
  const portFreight = INLAND_FREIGHT[port_entry] ?? INLAND_FREIGHT.Manzanillo
  const inland_freight_mxn = portFreight[destination_city] ?? portFreight.default ?? 7000

  // 10. Totales
  const total_cost_mxn    = cif_mxn + arancel_mxn + iva_mxn + dta_mxn + agent_fees_mxn + inland_freight_mxn
  const cost_per_unit_mxn = total_cost_mxn / quantity

  // Tiempo de tránsito estimado
  const transit_days = use_air_freight ? 8 : 35

  return {
    product,
    quantity,
    exchange_rate: EXCHANGE_RATE,

    fob_value_usd: round2(fob_value_usd),
    freight_usd:   round2(freight_usd),
    insurance_usd: round2(insurance_usd),
    cif_usd:       round2(cif_usd),

    cif_mxn:       round0(cif_mxn),
    arancel_rate,
    arancel_mxn:   round0(arancel_mxn),
    iva_mxn:       round0(iva_mxn),
    dta_mxn:       round0(dta_mxn),

    agent_fees_mxn:      round0(agent_fees_mxn),
    inland_freight_mxn:  round0(inland_freight_mxn),

    total_cost_mxn:     round0(total_cost_mxn),
    cost_per_unit_mxn:  round2(cost_per_unit_mxn),

    hs_code:          tariff.hs_code,
    hs_description:   tariff.description,
    special_permits:  tariff.special_permits,
    transit_days,
    freight_mode:     use_air_freight ? 'air' : 'sea',
    port_entry,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number) { return Math.round(n * 100) / 100 }
function round0(n: number) { return Math.round(n) }

export function formatMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

export function formatUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

// Ciudades de destino disponibles
export const DESTINATION_CITIES = [
  'Culiacán', 'Mazatlán', 'Guadalajara', 'CDMX', 'Monterrey',
  'Tijuana', 'Hermosillo', 'Chihuahua', 'León', 'Puebla',
  'Querétaro', 'Mérida', 'Cancún', 'Veracruz', 'Oaxaca',
]

// Ciudades de origen disponibles
export const ORIGIN_CITIES = [
  'Guangzhou', 'Shenzhen', 'Shanghai', 'Yiwu', 'Ningbo', 'Tianjin', 'Beijing',
]

// Pre-calcular ejemplo lentes para el caso real
export function getLentesExample(): CalculatorResult {
  return calculateImportCost({
    product:          'Lentes de Sol',
    unit_price_usd:   3.50,
    quantity:         500,
    origin_city:      'Guangzhou',
    destination_city: 'Culiacán',
    use_air_freight:  false,
  })
}
