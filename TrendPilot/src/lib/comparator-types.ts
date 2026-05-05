// Tipos compartidos para comparadores de productos
// Usado por comparator-data.ts y affiliate-comparators.ts

export interface ProductOption {
  id:               string
  name:             string
  platform:         'mercadolibre' | 'amazon' | 'shopify'
  platform_label:   string
  price:            number         // MXN
  original_price?:  number
  stars:            number         // 1.0–5.0
  reviews_count:    number
  delivery_days:    number
  free_shipping:    boolean
  stock_remaining:  number
  trust_score:      number         // 0–100
  warranty_months:  number
  returns_days:     number
  affiliate_url:    string
  pros:             string[]
  cons:             string[]
  seller_name:      string
  seller_level:     string         // 'MercadoLíder' | 'Oficial' | 'Verificado'
}

export interface Review {
  user:          string
  initials:      string
  stars:         number
  text:          string
  platform:      string
  option_name:   string
  verified:      boolean
  helpful:       number
  date:          string
}

export interface FAQItem {
  q: string
  a: string
}

export interface ComparatorProduct {
  slug:           string
  name:           string
  category:       string
  emoji:          string
  description:    string
  trend_score:    number
  searches_today: number
  options:        ProductOption[]
  reviews:        Review[]
  faq:            FAQItem[]
  last_updated:   string
}
