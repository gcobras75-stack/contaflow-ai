import {
  pgTable, pgEnum, uuid, text, integer, numeric,
  boolean, timestamp, jsonb, index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const vendorStatusEnum    = pgEnum('vendor_status',    ['pending', 'active', 'suspended'])
export const productStatusEnum   = pgEnum('product_status',   ['pending', 'approved', 'rejected'])
export const campaignStatusEnum  = pgEnum('campaign_status',  ['green', 'yellow', 'red', 'paused'])
export const commissionStatusEnum = pgEnum('commission_status', ['pending', 'paid'])
export const trendSourceEnum     = pgEnum('trend_source',     ['google', 'mercadolibre', 'tiktok'])
export const platformEnum        = pgEnum('platform',         ['meta', 'tiktok', 'both'])
export const roleEnum            = pgEnum('user_role',        ['admin', 'vendor'])
export const planEnum            = pgEnum('plan_type',        ['despegue', 'piloto', 'comandante', 'flota'])
export const creativeTypeEnum    = pgEnum('creative_type',    ['image', 'video', 'carousel'])
export const influencerStatusEnum = pgEnum('influencer_status', ['contacted', 'active', 'rejected'])

// ─── profiles (usuarios del sistema) ─────────────────────────────────────────

export const profiles = pgTable('profiles', {
  id:            uuid('id').primaryKey().defaultRandom(),
  email:         text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name:          text('name').notNull(),
  role:          roleEnum('role').notNull().default('vendor'),
  vendor_id:     uuid('vendor_id'),                      // null para admins
  created_at:    timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('profiles_email_idx').on(t.email),
])

// ─── vendors ─────────────────────────────────────────────────────────────────

export const vendors = pgTable('vendors', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  name:                  text('name').notNull(),
  email:                 text('email').notNull().unique(),
  phone:                 text('phone'),
  whatsapp_number:       text('whatsapp_number'),
  product_type:          text('product_type'),
  trust_score:           integer('trust_score').notNull().default(50),
  status:                vendorStatusEnum('status').notNull().default('pending'),
  growth_fund_balance:   integer('growth_fund_balance').notNull().default(0),  // centavos
  total_sales:           integer('total_sales').notNull().default(0),           // centavos
  total_commissions_paid: integer('total_commissions_paid').notNull().default(0), // centavos
  plan:                  planEnum('plan').notNull().default('despegue'),
  created_at:            timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('vendors_email_idx').on(t.email),
  index('vendors_status_idx').on(t.status),
])

// ─── products ────────────────────────────────────────────────────────────────

export const products = pgTable('products', {
  id:               uuid('id').primaryKey().defaultRandom(),
  vendor_id:        uuid('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  name:             text('name').notNull(),
  description:      text('description'),
  price:            integer('price').notNull().default(0),   // centavos
  category:         text('category'),
  images:           jsonb('images').$type<string[]>().default([]),
  product_score:    integer('product_score'),
  score_breakdown:  jsonb('score_breakdown').$type<Record<string, number>>(),
  scored_at:        timestamp('scored_at'),
  status:           productStatusEnum('status').notNull().default('pending'),
  rejection_reason: text('rejection_reason'),
  trend_data:       jsonb('trend_data').$type<Record<string, unknown>>(),
  created_at:       timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('products_vendor_idx').on(t.vendor_id),
  index('products_status_idx').on(t.status),
])

// ─── trends ──────────────────────────────────────────────────────────────────

export const trends = pgTable('trends', {
  id:              uuid('id').primaryKey().defaultRandom(),
  keyword:         text('keyword').notNull(),
  category:        text('category'),
  trend_score:     integer('trend_score').notNull().default(0),
  source:          trendSourceEnum('source').notNull(),
  historical_data: jsonb('historical_data').$type<Record<string, unknown>>(),
  is_early_signal: boolean('is_early_signal').notNull().default(false),
  detected_at:     timestamp('detected_at').notNull().defaultNow(),
}, (t) => [
  index('trends_keyword_idx').on(t.keyword),
  index('trends_score_idx').on(t.trend_score),
  index('trends_detected_idx').on(t.detected_at),
])

// ─── campaigns ───────────────────────────────────────────────────────────────

export const campaigns = pgTable('campaigns', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  product_id:          uuid('product_id').references(() => products.id),
  vendor_id:           uuid('vendor_id').references(() => vendors.id),
  name:                text('name'),
  platform:            platformEnum('platform').notNull().default('meta'),
  status:              campaignStatusEnum('status').notNull().default('yellow'),
  semaphore_color:     campaignStatusEnum('semaphore_color').notNull().default('yellow'),
  budget_total:        integer('budget_total').notNull().default(0),       // centavos
  budget_spent:        integer('budget_spent').notNull().default(0),       // centavos
  budget_fund:         integer('budget_fund').notNull().default(0),        // GrowthFund en centavos
  sales_generated:     integer('sales_generated').notNull().default(0),    // centavos
  commissions_earned:  integer('commissions_earned').notNull().default(0), // centavos
  audience_data:       jsonb('audience_data').$type<Record<string, unknown>>(),
  ab_variants:         jsonb('ab_variants').$type<Record<string, unknown>>(),
  pause_reason:        text('pause_reason'),
  ai_suggestions:      jsonb('ai_suggestions').$type<Record<string, unknown>>(),
  created_at:          timestamp('created_at').notNull().defaultNow(),
  paused_at:           timestamp('paused_at'),
}, (t) => [
  index('campaigns_vendor_idx').on(t.vendor_id),
  index('campaigns_status_idx').on(t.semaphore_color),
])

// ─── ad_creatives ────────────────────────────────────────────────────────────

export const adCreatives = pgTable('ad_creatives', {
  id:                uuid('id').primaryKey().defaultRandom(),
  campaign_id:       uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
  vendor_id:         uuid('vendor_id').references(() => vendors.id),
  type:              creativeTypeEnum('type').notNull().default('image'),
  headline:          text('headline').notNull(),
  body_copy:         text('body_copy').notNull(),
  cta:               text('cta').notNull(),
  image_url:         text('image_url'),
  platform:          text('platform'),
  all_headlines:     jsonb('all_headlines').$type<string[]>(),
  all_descriptions:  jsonb('all_descriptions').$type<string[]>(),
  cta_options:       jsonb('cta_options').$type<string[]>(),
  audience_data:     jsonb('audience_data').$type<Record<string, unknown>>(),
  performance_score: integer('performance_score'),
  is_winner:         boolean('is_winner').notNull().default(false),
  is_active:         boolean('is_active').notNull().default(true),
  created_at:        timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('ad_creatives_campaign_idx').on(t.campaign_id),
])

// ─── commissions ─────────────────────────────────────────────────────────────

export const commissions = pgTable('commissions', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  campaign_id:           uuid('campaign_id').references(() => campaigns.id),
  vendor_id:             uuid('vendor_id').references(() => vendors.id),
  sale_amount:           integer('sale_amount').notNull(),          // centavos
  commission_rate:       numeric('commission_rate', { precision: 5, scale: 4 }).notNull(),
  commission_amount:     integer('commission_amount').notNull(),    // centavos
  growth_fund_amount:    integer('growth_fund_amount').notNull(),   // centavos
  platform_earning:      integer('platform_earning').notNull(),     // centavos
  status:                commissionStatusEnum('status').notNull().default('pending'),
  mercadopago_transfer_id: text('mercadopago_transfer_id'),
  product_name:          text('product_name'),
  vendor_name:           text('vendor_name'),
  created_at:            timestamp('created_at').notNull().defaultNow(),
  paid_at:               timestamp('paid_at'),
}, (t) => [
  index('commissions_vendor_idx').on(t.vendor_id),
  index('commissions_status_idx').on(t.status),
])

// ─── influencers ─────────────────────────────────────────────────────────────

export const influencers = pgTable('influencers', {
  id:               uuid('id').primaryKey().defaultRandom(),
  platform:         text('platform').notNull(),   // instagram | tiktok
  handle:           text('handle').notNull(),
  followers:        integer('followers').notNull().default(0),
  engagement_rate:  numeric('engagement_rate', { precision: 5, scale: 2 }),
  niche:            text('niche'),
  contact_email:    text('contact_email'),
  status:           influencerStatusEnum('status').notNull().default('contacted'),
  products_promoted: jsonb('products_promoted').$type<string[]>().default([]),
  created_at:       timestamp('created_at').notNull().defaultNow(),
})

// ─── competitors ─────────────────────────────────────────────────────────────

export const competitors = pgTable('competitors', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  name:               text('name').notNull(),
  platform_url:       text('platform_url'),
  estimated_vendors:  integer('estimated_vendors'),
  active_campaigns:   integer('active_campaigns'),
  top_products:       jsonb('top_products').$type<Record<string, unknown>>(),
  last_analyzed_at:   timestamp('last_analyzed_at').defaultNow(),
})

// ─── Relations ───────────────────────────────────────────────────────────────

export const vendorRelations = relations(vendors, ({ many }) => ({
  products:    many(products),
  campaigns:   many(campaigns),
  commissions: many(commissions),
  adCreatives: many(adCreatives),
}))

export const productRelations = relations(products, ({ one, many }) => ({
  vendor:    one(vendors, { fields: [products.vendor_id], references: [vendors.id] }),
  campaigns: many(campaigns),
}))

export const campaignRelations = relations(campaigns, ({ one, many }) => ({
  product:     one(products,  { fields: [campaigns.product_id], references: [products.id] }),
  vendor:      one(vendors,   { fields: [campaigns.vendor_id],  references: [vendors.id] }),
  commissions: many(commissions),
  adCreatives: many(adCreatives),
}))

export const commissionRelations = relations(commissions, ({ one }) => ({
  campaign: one(campaigns, { fields: [commissions.campaign_id], references: [campaigns.id] }),
  vendor:   one(vendors,   { fields: [commissions.vendor_id],   references: [vendors.id] }),
}))

export const adCreativeRelations = relations(adCreatives, ({ one }) => ({
  campaign: one(campaigns, { fields: [adCreatives.campaign_id], references: [campaigns.id] }),
  vendor:   one(vendors,   { fields: [adCreatives.vendor_id],   references: [vendors.id] }),
}))

export const profileRelations = relations(profiles, ({ one }) => ({
  vendor: one(vendors, { fields: [profiles.vendor_id], references: [vendors.id] }),
}))
