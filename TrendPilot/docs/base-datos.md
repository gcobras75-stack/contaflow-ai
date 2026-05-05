# Estructura Supabase — TrendPilot

## vendors
id, name, email, phone, whatsapp_number,
trust_score (0-100), status (pending/active/suspended),
growth_fund_balance, total_sales,
total_commissions_paid, plan, created_at

## products
id, vendor_id, name, description, price,
category, images[], product_score (0-100),
status (pending/approved/rejected),
rejection_reason, trend_data (JSON), created_at

## trends
id, keyword, category, trend_score (0-100),
source (google/mercadolibre/tiktok),
historical_data (JSON), is_early_signal (boolean),
detected_at

## campaigns
id, product_id, vendor_id, platform (meta/tiktok/both),
status (green/yellow/red/paused),
budget_total, budget_spent, budget_fund (GrowthFund),
sales_generated, commissions_earned,
audience_data (JSON), ab_variants (JSON),
semaphore_color, pause_reason,
ai_suggestions (JSON), created_at, paused_at

## ad_creatives
id, campaign_id, type (image/video/carousel),
headline, body_copy, cta, image_url, platform,
performance_score, is_winner (boolean), created_at

## commissions
id, campaign_id, vendor_id,
sale_amount, commission_rate, commission_amount,
growth_fund_amount, platform_earning,
status (pending/paid), mercadopago_transfer_id,
created_at, paid_at

## influencers
id, platform (instagram/tiktok),
handle, followers, engagement_rate,
niche, contact_email,
status (contacted/active/rejected),
products_promoted[], created_at

## competitors
id, name, platform_url,
estimated_vendors, active_campaigns,
top_products (JSON), last_analyzed_at
