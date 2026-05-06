// Tipos compartidos para el módulo de importaciones China-México

export type TrustBadge = 'ELITE' | 'CONFIABLE' | 'REVISAR' | 'EVITAR'

export interface Supplier {
  id:                  string
  name:                string
  name_es:             string        // nombre en español para UI
  location:            string        // ciudad de origen China
  years_on_platform:   number
  positive_rating:     number        // porcentaje 0-100
  response_time_hours: number
  trade_assurance:     boolean
  verified_supplier:   boolean
  gold_supplier:       boolean
  certifications:      string[]
  main_products:       string[]
  categories:          string[]      // para filtrar búsquedas
  min_order:           number        // unidades mínimas
  price_range:         { min: number; max: number }  // USD por unidad
  delivery_days_sea:   number
  delivery_days_air:   number
  trust_badge:         TrustBadge
  trust_score:         number        // 0-100
  export_to_mexico:    boolean
  total_transactions:  number
  reorder_rate:        number        // porcentaje clientes que regresan
  image_url:           string        // placeholder
  alibaba_url:         string
  mexico_customers:    number
  description_es:      string        // descripción en español
  photo_analysis:      PhotoAnalysis
  warnings:            string[]      // alertas de riesgo
  strengths:           string[]      // ventajas verificadas
}

export interface PhotoAnalysis {
  total_photos: number
  real_photos:  number
  stock_photos: number
  concerns:     string[]
}

export interface CalculatorInput {
  product:          string
  unit_price_usd:   number
  quantity:         number
  origin_city:      string   // Guangzhou | Shanghai | Shenzhen | Yiwu | Beijing
  destination_city: string   // Culiacán | CDMX | Monterrey | Guadalajara | Tijuana | etc.
  use_air_freight?: boolean
}

export interface CalculatorResult {
  // Inputs
  product:          string
  quantity:         number
  exchange_rate:    number

  // Valores en USD
  fob_value_usd:    number
  freight_usd:      number
  insurance_usd:    number
  cif_usd:          number

  // Impuestos en MXN
  cif_mxn:          number
  arancel_rate:     number   // porcentaje
  arancel_mxn:      number
  iva_mxn:          number
  dta_mxn:          number

  // Costos operativos MXN
  agent_fees_mxn:   number
  inland_freight_mxn: number

  // Totales
  total_cost_mxn:   number
  cost_per_unit_mxn: number

  // Info adicional
  hs_code:          string
  hs_description:   string
  special_permits:  string[]
  transit_days:     number   // días de tránsito estimados
  freight_mode:     'sea' | 'air'
  port_entry:       string   // Manzanillo | Lázaro | Veracruz | AICM | Tijuana
}

export interface SearchResult {
  query:      string
  suppliers:  Supplier[]
  total:      number
  category:   string
}

export interface ImportOrderStatus {
  id:               string
  product_name:     string
  supplier_name:    string
  status:           string
  status_label:     string
  status_emoji:     string
  tracking_number?: string
  eta_mexico?:      string
  progress:         number   // 0-100
}

export interface ChatMessage {
  role:        'user' | 'supplier' | 'system'
  content:     string
  translated?: string
  warning?:    string
  timestamp:   string
}
