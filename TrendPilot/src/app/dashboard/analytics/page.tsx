'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { BarChart2, TrendingUp, ArrowRight, Zap, Target, DollarSign, MousePointer, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/utils'

// ─── Dynamic imports (no SSR — recharts) ─────────────────────────────────────

const SpendRevenueChart = dynamic(
  () => import('@/components/dashboard/AnalyticsCharts').then((m) => m.SpendRevenueChart),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-brand-hover rounded-xl" /> },
)

const TopAdsChart = dynamic(
  () => import('@/components/dashboard/AnalyticsCharts').then((m) => m.TopAdsChart),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-brand-hover rounded-xl" /> },
)

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface DailySnapshot { date: string; spend: number; revenue: number; impressions: number; clicks: number; conversions: number }
interface TopAd         { ad_id: string; ad_name: string; ctr: number; roas: number; spend: number; conversions: number; mock?: boolean }
interface MotionAd      { id: string; brand: string; headline: string; description: string; cta: string; format: string; days_running: number; ctr_estimate: number; niche: string; mock?: boolean }
interface CreativeInsights { best_format: string; best_cta: string; avg_text_length: number; best_time_range: string; top_niches: string[]; mock?: boolean }

interface OverviewData {
  total_spend:       number
  total_conversions: number
  avg_roas:          number
  avg_cpm:           number
  avg_ctr:           number
  daily_data:        DailySnapshot[]
  source?:           'live' | 'meta_direct' | 'demo'
  mock?:             boolean  // legacy compat
}

interface TopAdsData {
  byCtr:  TopAd[]
  byRoas: TopAd[]
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [overview,   setOverview]   = useState<OverviewData | null>(null)
  const [topAds,     setTopAds]     = useState<TopAdsData | null>(null)
  const [motionAds,  setMotionAds]  = useState<MotionAd[]>([])
  const [insights,   setInsights]   = useState<CreativeInsights | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab,        setTab]        = useState<'performance' | 'creativos' | 'benchmark' | 'google'>('performance')

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [ovRes, topRes, motionRes, insRes] = await Promise.all([
        fetch('/api/analytics/overview'),
        fetch('/api/analytics/top-ads'),
        fetch('/api/analytics/inspiration?niche=moda'),
        fetch('/api/analytics/insights'),
      ])

      if (ovRes.ok)     setOverview(await ovRes.json())
      if (topRes.ok)    setTopAds(await topRes.json())
      if (motionRes.ok) setMotionAds((await motionRes.json()).ads ?? [])
      if (insRes.ok)    setInsights(await insRes.json())
    } catch { /* mantener estado anterior */ }
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n / 100)

  const kpiCards = overview ? [
    { label: 'Invertido este mes',     value: fmt(overview.total_spend),       icon: DollarSign,   color: 'text-brand-text',   border: 'border-brand-border' },
    { label: 'Generado en ventas',     value: fmt(overview.total_spend * (overview.avg_roas || 2.1)), icon: TrendingUp, color: 'text-brand-green', border: 'border-brand-green/25' },
    { label: 'ROAS general',           value: `${overview.avg_roas}x`,          icon: Target,       color: 'text-brand-primary', border: 'border-brand-primary/25' },
    { label: 'CPM promedio',           value: fmt(overview.avg_cpm),            icon: BarChart2,    color: 'text-brand-muted',   border: 'border-brand-border' },
    { label: 'CTR promedio',           value: `${overview.avg_ctr}%`,           icon: MousePointer, color: 'text-brand-yellow',  border: 'border-brand-yellow/20' },
    { label: 'Total conversiones',     value: overview.total_conversions.toLocaleString('es-MX'), icon: Zap, color: 'text-brand-green', border: 'border-brand-green/20' },
  ] : []

  const formatLabel = (f: string) => ({ video: '🎬 Video', image: '🖼️ Imagen', carousel: '🎠 Carrusel', stories: '📱 Stories' }[f] ?? f)

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Encabezado */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
              <BarChart2 size={15} className="text-brand-primary" />
            </div>
            Analytics
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Meta Ads + Supermetrics — métricas y creativos de tu cuenta
            {(overview?.source === 'live' || (overview?.source === 'meta_direct')) && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-brand-green/15 text-brand-green rounded-full">
                {overview.source === 'live' ? '⚡ EN VIVO' : '📡 META DIRECTO'}
              </span>
            )}
            {(overview?.source === 'demo' || overview?.mock) && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-brand-yellow/15 text-brand-yellow rounded-full">MODO DEMO</span>
            )}
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-hover border border-brand-border text-brand-muted rounded-xl text-sm hover:text-brand-text transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-brand-hover rounded-xl p-1 w-fit animate-fade-in" style={{ animationDelay: '50ms' }}>
        {([ ['performance', '📊 Performance'], ['creativos', '🎨 Creativos'], ['benchmark', '🔍 Benchmark'], ['google', '🛒 Google Shopping'] ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key
                ? 'bg-brand-card text-brand-text shadow-sm'
                : 'text-brand-faint hover:text-brand-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── TAB: PERFORMANCE ─────────────────────────────────────────────── */}
      {tab === 'performance' && (
        <div className="space-y-5 animate-fade-in">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)
              : kpiCards.map(({ label, value, icon: Icon, color, border }) => (
                <div key={label} className={cn('bg-brand-card border rounded-2xl p-4', border)}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest leading-tight">{label}</p>
                    <Icon size={12} className={color} />
                  </div>
                  <p className={cn('text-lg font-bold font-mono', color)}>{value}</p>
                </div>
              ))
            }
          </div>

          {/* Gráfica Gasto vs Ingresos */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-brand-text">Gasto vs Ingresos</p>
                <p className="text-[10px] text-brand-faint mt-0.5">Últimos 30 días — datos Supermetrics</p>
              </div>
            </div>
            {loading || !overview
              ? <div className="h-64 animate-pulse bg-brand-hover rounded-xl" />
              : <SpendRevenueChart data={overview.daily_data} />
            }
          </div>

          {/* Top anuncios por CTR */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-brand-text">Top anuncios por CTR</p>
                <p className="text-[10px] text-brand-faint mt-0.5">Los 5 con mejor click-through rate este mes</p>
              </div>
              {topAds?.byCtr?.[0]?.mock && (
                <span className="text-[10px] px-2 py-0.5 bg-brand-yellow/10 text-brand-yellow rounded-full border border-brand-yellow/20">DEMO</span>
              )}
            </div>
            {loading || !topAds
              ? <div className="h-48 animate-pulse bg-brand-hover rounded-xl" />
              : <TopAdsChart data={topAds.byCtr.map((a) => ({ name: a.ad_name, ctr: a.ctr, roas: a.roas }))} />
            }
          </div>

          {/* Top por ROAS */}
          {!loading && topAds && (
            <div className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <p className="text-sm font-semibold text-brand-text mb-1">Top anuncios por ROAS</p>
              <p className="text-[10px] text-brand-faint mb-4">Mejor retorno sobre inversión publicitaria</p>
              <div className="space-y-2">
                {topAds.byRoas.map((ad, i) => (
                  <div key={ad.ad_id} className="flex items-center gap-3 p-3 bg-brand-hover rounded-xl">
                    <span className="text-[10px] font-bold text-brand-faint font-mono w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-brand-text truncate">{ad.ad_name}</p>
                      <p className="text-[10px] text-brand-faint">{ad.conversions} conversiones · {fmt(ad.spend)} gastado</p>
                    </div>
                    <span className={cn(
                      'text-xs font-bold font-mono px-2 py-1 rounded-lg',
                      ad.roas >= 3 ? 'text-brand-green bg-brand-green/10' : 'text-brand-yellow bg-brand-yellow/10',
                    )}>
                      {ad.roas}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: CREATIVOS ───────────────────────────────────────────────── */}
      {tab === 'creativos' && (
        <div className="space-y-5 animate-fade-in">

          {/* Insights de formato */}
          {insights && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Mejor formato', value: formatLabel(insights.best_format), icon: '🎬' },
                { label: 'Mejor CTA',     value: insights.best_cta,                icon: '👆' },
                { label: 'Texto ganador', value: `~${insights.avg_text_length} palabras`, icon: '📝' },
                { label: 'Mejor horario', value: insights.best_time_range,         icon: '⏰' },
              ].map((item) => (
                <div key={item.label} className="bg-brand-card border border-brand-border rounded-2xl p-4">
                  <p className="text-lg mb-1">{item.icon}</p>
                  <p className="text-sm font-semibold text-brand-text">{item.value}</p>
                  <p className="text-[10px] text-brand-faint mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Grid de creativos top — Motion */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-brand-text">Anuncios más efectivos esta semana</p>
                <p className="text-[10px] text-brand-faint mt-0.5">
                  Motion — los que llevan más días activos convierten mejor
                  {motionAds[0]?.mock && <span className="ml-2 px-1.5 py-0.5 bg-brand-yellow/10 text-brand-yellow rounded-full">DEMO</span>}
                </p>
              </div>
            </div>

            {loading
              ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 skeleton rounded-xl" />)}
                </div>
              : motionAds.length === 0
                ? <p className="text-sm text-brand-faint text-center py-10">Sin creativos disponibles</p>
                : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {motionAds.map((ad) => (
                      <div key={ad.id} className="bg-brand-hover border border-brand-border rounded-xl p-4 space-y-3">
                        {/* Preview placeholder */}
                        <div className="w-full h-32 rounded-lg bg-brand-card border border-brand-border flex items-center justify-center">
                          <span className="text-2xl">
                            {ad.format === 'video' ? '🎬' : ad.format === 'carousel' ? '🎠' : ad.format === 'stories' ? '📱' : '🖼️'}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs font-bold text-brand-text leading-tight">{ad.headline}</p>
                            <span className="text-[9px] px-1.5 py-0.5 bg-brand-primary/15 text-brand-primary rounded-full shrink-0 font-mono">
                              {ad.days_running}d
                            </span>
                          </div>
                          <p className="text-[10px] text-brand-muted leading-relaxed line-clamp-2">{ad.description}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-1 bg-brand-hover border border-brand-border rounded-lg text-brand-muted">
                            {ad.cta}
                          </span>
                          <span className="text-[10px] text-brand-faint">{ad.ctr_estimate}% CTR est.</span>
                        </div>

                        <Link
                          href="/dashboard/ads"
                          className="flex items-center justify-center gap-1.5 w-full py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-lg text-[10px] font-semibold text-brand-primary hover:bg-brand-primary/20 transition-colors"
                        >
                          Usar como inspiración <ArrowRight size={10} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )
            }
          </div>
        </div>
      )}

      {/* ─── TAB: GOOGLE SHOPPING ────────────────────────────────────────── */}
      {tab === 'google' && (
        <div className="space-y-5 animate-fade-in">

          {/* Pending state — sin credenciales Google Ads */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#4285F4]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🛒</span>
            </div>
            <p className="text-sm font-semibold text-brand-text mb-1">Google Shopping pendiente de configuración</p>
            <p className="text-xs text-brand-muted mb-5 max-w-sm mx-auto">
              Los datos reales de impresiones, clics y ROAS aparecerán aquí cuando conectes tu cuenta Google Ads.
            </p>
            <a
              href="/dashboard/setup/google-ads"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4285F4]/15 border border-[#4285F4]/25 text-[#4285F4] rounded-xl text-sm font-semibold hover:bg-[#4285F4]/25 transition-colors"
            >
              Configurar Google Ads
            </a>
          </div>

          {/* CTA configuración */}
          <div className="bg-[#4285F4]/5 border border-[#4285F4]/20 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#4285F4]/15 flex items-center justify-center shrink-0">
              <span className="text-xl">🛒</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-brand-text">Conecta tu cuenta Google Ads</p>
              <p className="text-xs text-brand-muted mt-0.5">Datos en vivo disponibles cuando configures las credenciales API</p>
            </div>
            <a
              href="/dashboard/setup/google-ads"
              className="shrink-0 px-4 py-2 bg-[#4285F4]/15 border border-[#4285F4]/25 text-[#4285F4] rounded-xl text-xs font-semibold hover:bg-[#4285F4]/25 transition-colors"
            >
              Configurar →
            </a>
          </div>
        </div>
      )}

      {/* ─── TAB: BENCHMARK ───────────────────────────────────────────────── */}
      {tab === 'benchmark' && (
        <div className="space-y-5 animate-fade-in">

          {/* Tu rendimiento vs mercado */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-brand-text mb-1">Tu rendimiento vs mercado MX</p>
            <p className="text-[10px] text-brand-faint mb-5">Comparativa con promedios de la industria e-commerce México</p>

            {loading || !overview
              ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-xl" />)}</div>
              : (
                <div className="space-y-4">
                  {[
                    {
                      metric: 'CTR',
                      yours:  overview.avg_ctr,
                      market: 2.1,
                      unit:   '%',
                      desc:   'Click-through rate promedio',
                    },
                    {
                      metric: 'ROAS',
                      yours:  overview.avg_roas,
                      market: 2.8,
                      unit:   'x',
                      desc:   'Retorno sobre gasto publicitario',
                    },
                    {
                      metric: 'CPM',
                      yours:  overview.avg_cpm / 100,
                      market: 85,
                      unit:   ' MXN',
                      desc:   'Costo por mil impresiones',
                      lowerIsBetter: true,
                    },
                    {
                      metric: 'Conv. Rate',
                      yours:  overview.avg_ctr * 0.04,  // estimado
                      market: 1.8,
                      unit:   '%',
                      desc:   'Tasa de conversión estimada',
                    },
                  ].map(({ metric, yours, market, unit, desc, lowerIsBetter }) => {
                    const better  = lowerIsBetter ? yours < market : yours > market
                    const diff    = ((yours - market) / market * 100)
                    const pct     = lowerIsBetter ? -diff : diff
                    const barYou  = Math.min(100, (yours / (Math.max(yours, market) * 1.2)) * 100)
                    const barMkt  = Math.min(100, (market / (Math.max(yours, market) * 1.2)) * 100)

                    return (
                      <div key={metric} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-semibold text-brand-text">{metric}</span>
                            <span className="ml-2 text-[10px] text-brand-faint">{desc}</span>
                          </div>
                          <span className={cn(
                            'text-xs font-bold px-2 py-0.5 rounded-full',
                            pct >= 10 ? 'text-brand-green bg-brand-green/10' :
                            pct >= 0  ? 'text-brand-yellow bg-brand-yellow/10' :
                            'text-brand-red bg-brand-red/10',
                          )}>
                            {pct >= 0 ? '+' : ''}{pct.toFixed(0)}% vs mercado
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-brand-muted w-12 text-right font-mono">Tú</span>
                            <div className="flex-1 h-2.5 bg-brand-hover rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', better ? 'bg-brand-green' : 'bg-brand-yellow')}
                                style={{ width: `${barYou}%` }}
                              />
                            </div>
                            <span className={cn('text-xs font-bold font-mono w-16', better ? 'text-brand-green' : 'text-brand-yellow')}>
                              {yours.toFixed(1)}{unit}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-brand-faint w-12 text-right font-mono">Mercado</span>
                            <div className="flex-1 h-2.5 bg-brand-hover rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-brand-border" style={{ width: `${barMkt}%` }} />
                            </div>
                            <span className="text-xs text-brand-faint font-mono w-16">{market.toFixed(1)}{unit}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>

          {/* Oportunidades detectadas */}
          {insights && (
            <div className="bg-brand-card border border-brand-primary/20 rounded-2xl p-5">
              <p className="text-sm font-semibold text-brand-text mb-1">Oportunidades detectadas</p>
              <p className="text-[10px] text-brand-faint mb-4">Basado en datos de Motion + Supermetrics para el mercado MX</p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 bg-brand-green/5 border border-brand-green/15 rounded-xl">
                  <span className="text-sm mt-0.5">💡</span>
                  <div>
                    <p className="text-xs font-semibold text-brand-text">Cambia a formato {formatLabel(insights.best_format)}</p>
                    <p className="text-[10px] text-brand-muted mt-0.5">Es el formato con mejor CTR en e-commerce MX actualmente</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-brand-primary/5 border border-brand-primary/15 rounded-xl">
                  <span className="text-sm mt-0.5">🎯</span>
                  <div>
                    <p className="text-xs font-semibold text-brand-text">Usa el CTA: &quot;{insights.best_cta}&quot;</p>
                    <p className="text-[10px] text-brand-muted mt-0.5">Los CTAs en primera persona convierten hasta 35% más</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-brand-yellow/5 border border-brand-yellow/15 rounded-xl">
                  <span className="text-sm mt-0.5">⏰</span>
                  <div>
                    <p className="text-xs font-semibold text-brand-text">Publica entre {insights.best_time_range}</p>
                    <p className="text-[10px] text-brand-muted mt-0.5">Mayor engagement en ese rango horario para tu audiencia</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-brand-hover border border-brand-border rounded-xl">
                  <span className="text-sm mt-0.5">📝</span>
                  <div>
                    <p className="text-xs font-semibold text-brand-text">Textos de ~{insights.avg_text_length} palabras</p>
                    <p className="text-[10px] text-brand-muted mt-0.5">Los anuncios ganadores son concisos y directos al beneficio</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
