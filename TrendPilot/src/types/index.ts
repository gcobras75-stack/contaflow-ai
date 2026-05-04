// Tipos globales de TrendPilot

export type VendorStatus = 'pending' | 'active' | 'suspended'
export type VendorPlan = 'despegue' | 'piloto' | 'comandante' | 'flota'

export interface Vendor {
  id: string
  name: string
  email: string
  phone: string
  whatsapp_number: string
  trust_score: number
  status: VendorStatus
  growth_fund_balance: number
  total_sales: number
  total_commissions_paid: number
  plan: VendorPlan
  created_at: string
}

export type ProductStatus = 'pending' | 'approved' | 'rejected'

export interface Product {
  id: string
  vendor_id: string
  name: string
  description: string
  price: number
  category: string
  images: string[]
  product_score: number
  status: ProductStatus
  rejection_reason?: string
  trend_data: Record<string, unknown>
  created_at: string
}

export type TrendSource = 'google' | 'mercadolibre' | 'tiktok'

export interface Trend {
  id: string
  keyword: string
  category: string
  trend_score: number
  source: TrendSource
  historical_data: Record<string, unknown>
  is_early_signal: boolean
  detected_at: string
}

export type CampaignPlatform = 'meta' | 'tiktok' | 'both'
export type SemaphoreColor = 'green' | 'yellow' | 'red' | 'paused'

export interface Campaign {
  id: string
  product_id: string
  vendor_id: string
  platform: CampaignPlatform
  status: SemaphoreColor
  budget_total: number
  budget_spent: number
  budget_fund: number
  sales_generated: number
  commissions_earned: number
  audience_data: Record<string, unknown>
  ab_variants: Record<string, unknown>
  semaphore_color: SemaphoreColor
  pause_reason?: string
  ai_suggestions: Record<string, unknown>
  created_at: string
  paused_at?: string
}

export type AdCreativeType = 'image' | 'video' | 'carousel'

export interface AdCreative {
  id: string
  campaign_id: string
  type: AdCreativeType
  headline: string
  body_copy: string
  cta: string
  image_url: string
  platform: CampaignPlatform
  performance_score: number
  is_winner: boolean
  created_at: string
}

export type CommissionStatus = 'pending' | 'paid'

export interface Commission {
  id: string
  campaign_id: string
  vendor_id: string
  sale_amount: number
  commission_rate: number
  commission_amount: number
  growth_fund_amount: number
  platform_earning: number
  status: CommissionStatus
  mercadopago_transfer_id?: string
  created_at: string
  paid_at?: string
}

export type InfluencerStatus = 'contacted' | 'active' | 'rejected'

export interface Influencer {
  id: string
  platform: 'instagram' | 'tiktok'
  handle: string
  followers: number
  engagement_rate: number
  niche: string
  contact_email: string
  status: InfluencerStatus
  products_promoted: string[]
  created_at: string
}

export interface Competitor {
  id: string
  name: string
  platform_url: string
  estimated_vendors: number
  active_campaigns: number
  top_products: Record<string, unknown>
  last_analyzed_at: string
}

// Tipos para el dashboard
export interface DashboardStats {
  daily_commissions: number
  active_vendors: number
  active_campaigns: number
  pending_approvals: number
  green_campaigns: number
  yellow_campaigns: number
  red_campaigns: number
}
