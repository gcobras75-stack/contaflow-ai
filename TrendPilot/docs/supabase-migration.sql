-- TrendPilot — Migración inicial Supabase
-- Ejecutar en el SQL Editor del proyecto trendpilot

-- ============================================================
-- vendors
-- ============================================================
create table if not exists vendors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  phone         text,
  whatsapp_number text,
  trust_score   smallint not null default 50 check (trust_score between 0 and 100),
  status        text not null default 'pending' check (status in ('pending','active','suspended')),
  growth_fund_balance numeric(12,2) not null default 0,
  total_sales   numeric(12,2) not null default 0,
  total_commissions_paid numeric(12,2) not null default 0,
  plan          text not null default 'despegue' check (plan in ('despegue','piloto','comandante','flota')),
  created_at    timestamptz not null default now()
);
create index on vendors (status);
create index on vendors (plan);

-- ============================================================
-- products
-- ============================================================
create table if not exists products (
  id              uuid primary key default gen_random_uuid(),
  vendor_id       uuid not null references vendors(id) on delete cascade,
  name            text not null,
  description     text,
  price           numeric(12,2) not null,
  category        text,
  images          text[] default '{}',
  product_score   smallint default 0 check (product_score between 0 and 100),
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  trend_data      jsonb default '{}',
  created_at      timestamptz not null default now()
);
create index on products (vendor_id);
create index on products (status);
create index on products (category);

-- ============================================================
-- trends
-- ============================================================
create table if not exists trends (
  id              uuid primary key default gen_random_uuid(),
  keyword         text not null,
  category        text,
  trend_score     smallint not null default 0 check (trend_score between 0 and 100),
  source          text not null check (source in ('google','mercadolibre','tiktok')),
  historical_data jsonb default '{}',
  is_early_signal boolean not null default false,
  detected_at     timestamptz not null default now()
);
create index on trends (trend_score desc);
create index on trends (source);
create index on trends (detected_at desc);

-- ============================================================
-- campaigns
-- ============================================================
create table if not exists campaigns (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references products(id) on delete cascade,
  vendor_id           uuid not null references vendors(id) on delete cascade,
  platform            text not null check (platform in ('meta','tiktok','both')),
  status              text not null default 'yellow' check (status in ('green','yellow','red','paused')),
  budget_total        numeric(12,2) not null default 0,
  budget_spent        numeric(12,2) not null default 0,
  budget_fund         numeric(12,2) not null default 0,
  sales_generated     integer not null default 0,
  commissions_earned  numeric(12,2) not null default 0,
  audience_data       jsonb default '{}',
  ab_variants         jsonb default '{}',
  semaphore_color     text not null default 'yellow' check (semaphore_color in ('green','yellow','red','paused')),
  pause_reason        text,
  ai_suggestions      jsonb default '{}',
  created_at          timestamptz not null default now(),
  paused_at           timestamptz
);
create index on campaigns (vendor_id);
create index on campaigns (product_id);
create index on campaigns (semaphore_color);
create index on campaigns (status);

-- ============================================================
-- ad_creatives
-- ============================================================
create table if not exists ad_creatives (
  id                uuid primary key default gen_random_uuid(),
  campaign_id       uuid not null references campaigns(id) on delete cascade,
  type              text not null check (type in ('image','video','carousel')),
  headline          text not null,
  body_copy         text,
  cta               text,
  image_url         text,
  platform          text not null check (platform in ('meta','tiktok','both')),
  performance_score smallint default 0 check (performance_score between 0 and 100),
  is_winner         boolean not null default false,
  created_at        timestamptz not null default now()
);
create index on ad_creatives (campaign_id);

-- ============================================================
-- commissions
-- ============================================================
create table if not exists commissions (
  id                      uuid primary key default gen_random_uuid(),
  campaign_id             uuid not null references campaigns(id),
  vendor_id               uuid not null references vendors(id),
  sale_amount             numeric(12,2) not null,
  commission_rate         numeric(5,4) not null,
  commission_amount       numeric(12,2) not null,
  growth_fund_amount      numeric(12,2) not null,
  platform_earning        numeric(12,2) not null,
  status                  text not null default 'pending' check (status in ('pending','paid')),
  mercadopago_transfer_id text,
  created_at              timestamptz not null default now(),
  paid_at                 timestamptz
);
create index on commissions (vendor_id);
create index on commissions (status);
create index on commissions (created_at desc);

-- ============================================================
-- influencers
-- ============================================================
create table if not exists influencers (
  id               uuid primary key default gen_random_uuid(),
  platform         text not null check (platform in ('instagram','tiktok')),
  handle           text not null,
  followers        integer not null default 0,
  engagement_rate  numeric(5,2) not null default 0,
  niche            text,
  contact_email    text,
  status           text not null default 'contacted' check (status in ('contacted','active','rejected')),
  products_promoted text[] default '{}',
  created_at       timestamptz not null default now()
);
create index on influencers (platform);
create index on influencers (status);

-- ============================================================
-- competitors
-- ============================================================
create table if not exists competitors (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  platform_url        text,
  estimated_vendors   integer default 0,
  active_campaigns    integer default 0,
  top_products        jsonb default '{}',
  last_analyzed_at    timestamptz not null default now()
);

-- ============================================================
-- Row Level Security — habilitar en todas las tablas
-- ============================================================
alter table vendors     enable row level security;
alter table products    enable row level security;
alter table trends      enable row level security;
alter table campaigns   enable row level security;
alter table ad_creatives enable row level security;
alter table commissions enable row level security;
alter table influencers enable row level security;
alter table competitors enable row level security;

-- Política base: solo service_role tiene acceso total
-- (el frontend usará service_role a través de las API Routes)
-- Agregar políticas granulares en sesión 2 cuando tengamos auth
