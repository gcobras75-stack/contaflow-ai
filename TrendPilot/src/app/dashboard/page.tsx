'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp, Users, Coins, Bell,
  ArrowUpRight, Flame, Zap,
  Radio, ChevronRight, Target, Package,
} from 'lucide-react'
import Link from 'next/link'
import { formatMXN, getSemaphoreClasses } from '@/utils'
import type { SemaphoreColor } from '@/types'
import { SeasonAlertWidget } from '@/components/dashboard/SeasonAlertWidget'
import { EarlySignalWidget } from '@/components/dashboard/EarlySignalWidget'
import { GrowthFundWidget } from '@/components/dashboard/GrowthFundWidget'
import { ProductImage } from '@/components/ui/ProductImage'

interface DashboardStats {
  daily_commissions: number
  active_vendors:    number
  active_campaigns:  number
  pending_approvals: number
  growth_fund:       number
}

interface Trend {
  id:           string
  keyword:      string
  trend_score:  number
  source:       string
  is_early_signal: boolean
}

interface Campaign {
  id:              string
  name:            string
  platform:        string
  semaphore_color: SemaphoreColor
  budget_spent:    number
  sales_generated: number
}

// ─── Config de badges de tendencias ──────────────────────────────────────────

const badgeConfig = {
  'EXPLOSIVO': { bg: 'bg-brand-red/15',    text: 'text-brand-red',    pulse: true  },
  'EN ALERTA': { bg: 'bg-brand-yellow/15', text: 'text-brand-yellow', pulse: false },
  'ESTABLE':   { bg: 'bg-brand-green/15',  text: 'text-brand-green',  pulse: false },
}

const sourceColor: Record<string, string> = {
  mercadolibre: 'text-[#FFE600] bg-[#FFE600]/10',
  google:       'text-[#4285F4] bg-[#4285F4]/10',
  tiktok:       'text-[#FF0050] bg-[#FF0050]/10',
}

function trendBadge(score: number): keyof typeof badgeConfig {
  if (score >= 88) return 'EXPLOSIVO'
  if (score >= 72) return 'EN ALERTA'
  return 'ESTABLE'
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, change, icon: Icon, gradient, delay = 0,
}: {
  label: string; value: string; change?: number; icon: React.ElementType
  gradient?: boolean; delay?: number
}) {
  return (
    <div
      className="card-hover bg-brand-card border border-brand-border rounded-2xl p-5 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${gradient ? 'btn-gradient' : 'bg-brand-primary/12'}`}>
          <Icon size={15} className="text-white" />
        </div>
      </div>
      <p className={`text-2xl font-bold font-mono tracking-tight ${gradient ? 'gradient-text-green' : 'text-brand-text'}`}>
        {value}
      </p>
      {change !== undefined && change > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs font-medium text-brand-green">
          <ArrowUpRight size={12} />
          <span>+{change} nuevas</span>
        </div>
      )}
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const [stats, setStats] = useState<DashboardStats>({
    daily_commissions: 0,
    active_vendors:    0,
    active_campaigns:  0,
    pending_approvals: 0,
    growth_fund:       0,
  })
  const [trends,    setTrends]    = useState<Trend[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      const [campaignRes, vendorRes, commRes, trendRes] = await Promise.allSettled([
        fetch('/api/campaigns?limit=5').then(r => r.json()),
        fetch('/api/vendors?limit=1').then(r => r.json()),
        fetch('/api/commissions?limit=50').then(r => r.json()),
        fetch('/api/trends?limit=6').then(r => r.json()),
      ])

      // Campañas reales
      if (campaignRes.status === 'fulfilled') {
        const data: Record<string, unknown>[] = campaignRes.value.data ?? []
        setCampaigns(data.slice(0, 5).map(c => ({
          id:              c.id as string,
          name:            (c.name as string | undefined) ?? ((c.products as Record<string, unknown>)?.name as string | undefined) ?? 'Campaña',
          platform:        (c.platform as string) ?? 'meta',
          semaphore_color: (c.semaphore_color as SemaphoreColor) ?? 'green',
          budget_spent:    (c.budget_spent as number) ?? 0,
          sales_generated: (c.sales_generated as number) ?? 0,
        })))
        const paused = data.filter(c => c.semaphore_color === 'red' || c.semaphore_color === 'paused').length
        setStats(s => ({
          ...s,
          active_campaigns:  data.filter(c => c.semaphore_color === 'green' || c.semaphore_color === 'yellow').length,
          pending_approvals: paused,
          growth_fund:       data.reduce((sum, c) => sum + ((c.budget_fund as number) ?? 0), 0),
        }))
      }

      // Vendors reales
      if (vendorRes.status === 'fulfilled') {
        setStats(s => ({ ...s, active_vendors: vendorRes.value.total ?? 0 }))
      }

      // Comisiones reales
      if (commRes.status === 'fulfilled') {
        const allComms: Record<string, unknown>[] = commRes.value.data ?? []
        const today  = new Date().toDateString()
        const todayC = allComms
          .filter(c => new Date(c.created_at as string).toDateString() === today)
          .reduce((sum, c) => sum + ((c.commission_amount as number) ?? 0), 0)
        setStats(s => ({ ...s, daily_commissions: todayC }))
      }

      // Tendencias reales — deduplicar por keyword
      if (trendRes.status === 'fulfilled') {
        const raw: Trend[] = trendRes.value.data ?? []
        const seen = new Map<string, Trend>()
        for (const t of raw) { if (!seen.has(t.keyword.toLowerCase())) seen.set(t.keyword.toLowerCase(), t) }
        setTrends(Array.from(seen.values()).slice(0, 10))
      }

      setLoading(false)
    }

    loadDashboard()
  }, [])

  const colorMap = {
    green:  { dot: 'bg-brand-green',  text: 'text-brand-green',  bg: 'bg-brand-green/8'  },
    yellow: { dot: 'bg-brand-yellow', text: 'text-brand-yellow', bg: 'bg-brand-yellow/8' },
    red:    { dot: 'bg-brand-red',    text: 'text-brand-red',    bg: 'bg-brand-red/8'    },
    paused: { dot: 'bg-brand-red',    text: 'text-brand-red',    bg: 'bg-brand-red/8'    },
  }

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Hero */}
      <div className="animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-text">
              Bienvenido, Antonio 👋
            </h1>
            <p className="text-sm text-brand-muted mt-0.5 capitalize">{today}</p>
          </div>
          {stats.active_campaigns > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-green/10 border border-brand-green/20 rounded-xl">
              <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
              <span className="text-xs font-medium text-brand-text">
                {stats.active_campaigns} campañas activas en Meta
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats reales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <StatCard
          label="Comisiones hoy"
          value={loading ? '—' : formatMXN(stats.daily_commissions)}
          icon={Coins}
          gradient
          delay={0}
        />
        <StatCard
          label="Vendedores activos"
          value={loading ? '—' : stats.active_vendors.toString()}
          icon={Users}
          delay={60}
        />
        <StatCard
          label="Campañas activas"
          value={loading ? '—' : stats.active_campaigns.toString()}
          icon={Radio}
          delay={120}
        />
        <StatCard
          label="Pendientes aprobación"
          value={loading ? '—' : stats.pending_approvals.toString()}
          icon={Bell}
          delay={180}
        />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* TrendRadar — datos reales */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-primary/15 flex items-center justify-center">
                <Flame size={13} className="text-brand-primary" />
              </div>
              <h2 className="text-sm font-bold text-brand-text">TrendRadar</h2>
              <span className="text-xs text-brand-faint">— Tendencias del momento</span>
            </div>
            <Link href="/dashboard/trends" className="text-xs text-brand-primary hover:underline flex items-center gap-1">
              Ver todo <ChevronRight size={11} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse bg-brand-hover rounded-xl" />
              ))}
            </div>
          ) : trends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <TrendingUp size={28} className="text-brand-faint mb-3" />
              <p className="text-sm font-semibold text-brand-text mb-1">Cargando tendencias...</p>
              <p className="text-xs text-brand-faint max-w-xs">
                El TrendRadar analiza MercadoLibre y Google Trends en tiempo real. Los datos aparecerán en breve.
              </p>
              <Link href="/dashboard/trends" className="mt-3 text-xs text-brand-primary hover:underline">
                Ver TrendRadar completo →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {trends.map((trend) => {
                const badge  = trendBadge(trend.trend_score)
                const badgeCfg = badgeConfig[badge]
                const src    = sourceColor[trend.source] ?? 'text-brand-muted bg-brand-hover'
                return (
                  <div
                    key={trend.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-brand-hover transition-colors cursor-pointer"
                  >
                    <ProductImage keyword={trend.keyword} size={48} radius={10} className="shrink-0" />
                    <div className="w-8 text-center shrink-0">
                      <span className="text-sm font-bold font-mono text-brand-text">{trend.trend_score}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm font-medium text-brand-text truncate">{trend.keyword}</span>
                        {trend.is_early_signal && <Zap size={10} className="text-brand-yellow shrink-0" />}
                      </div>
                      <div className="h-1 rounded-full bg-brand-hover">
                        <div className="score-bar-fill" style={{ width: `${trend.trend_score}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeCfg.bg} ${badgeCfg.text} ${badgeCfg.pulse ? 'animate-pulse' : ''}`}>
                        {badge}
                      </span>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${src} hidden sm:inline`}>
                        {trend.source === 'mercadolibre' ? 'ML' : trend.source.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* CampaignPilot — datos reales */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="relative w-7 h-7 rounded-lg bg-brand-green/15 flex items-center justify-center">
                <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
              </div>
              <h2 className="text-sm font-bold text-brand-text">CampaignPilot</h2>
              <span className="text-xs text-brand-faint">— Semáforo</span>
            </div>
            <Link href="/dashboard/campaigns" className="text-xs text-brand-primary hover:underline flex items-center gap-1">
              Ver todo <ChevronRight size={11} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse bg-brand-hover rounded-xl" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Target size={28} className="text-brand-faint mb-3" />
              <p className="text-sm font-semibold text-brand-text mb-1">Campañas activas</p>
              <p className="text-xs text-brand-faint max-w-xs">
                Las campañas aparecerán aquí cuando estén configuradas en Meta Ads Manager.
              </p>
              <Link href="/dashboard/campaigns" className="mt-3 text-xs text-brand-primary hover:underline">
                Ver CampaignPilot →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => {
                const cfg = colorMap[c.semaphore_color] ?? colorMap.yellow
                const roi = c.budget_spent > 0
                  ? Math.round(((c.sales_generated - c.budget_spent) / c.budget_spent) * 100)
                  : 0
                return (
                  <div key={c.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border border-transparent ${cfg.bg} hover:border-brand-border transition-all`}>
                    <ProductImage keyword={c.name} size={40} radius={8} className="shrink-0" />
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${c.semaphore_color === 'green' ? 'animate-pulse' : ''}`} />
                    <span className="flex-1 text-sm text-brand-text truncate font-medium">{c.name}</span>
                    {c.sales_generated > 0 ? (
                      <span className={`text-sm font-bold font-mono ${cfg.text}`}>
                        {roi > 0 ? '+' : ''}{roi}%
                      </span>
                    ) : (
                      <span className="text-xs text-brand-yellow font-mono">⏳ Esperando Meta</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* GrowthFund real */}
          <div className="mt-4 p-3 rounded-xl bg-brand-primary/8 border border-brand-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={13} className="text-brand-primary" />
                <span className="text-xs font-semibold text-brand-text">GrowthFund disponible</span>
              </div>
              <span className="text-sm font-bold font-mono gradient-text">
                {loading ? '—' : formatMXN(stats.growth_fund)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* EarlySignal + GrowthFund + SeasonAlert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <EarlySignalWidget />
        <GrowthFundWidget />
        <SeasonAlertWidget />
      </div>

      {/* Afiliados configurados — info real */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '240ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <Package size={15} className="text-brand-yellow" />
          <h2 className="text-sm font-bold text-brand-text">Plataformas de afiliados</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { name: 'MercadoLibre', id: 'GCOBRAS', status: 'active' },
            { name: 'SHEIN',        id: '4544144225', status: 'active' },
            { name: 'Temu',         id: 'Pendiente', status: 'pending' },
            { name: 'AliExpress',   id: 'Pendiente', status: 'pending' },
            { name: 'Amazon MX',    id: 'Pendiente', status: 'pending' },
          ].map(({ name, id, status }) => (
            <div
              key={name}
              className={`p-3 rounded-xl border ${status === 'active' ? 'border-brand-green/30 bg-brand-green/5' : 'border-brand-border bg-brand-hover/30'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-brand-green animate-pulse' : 'bg-brand-faint'}`} />
                <span className="text-xs font-bold text-brand-text">{name}</span>
              </div>
              <span className="text-[10px] text-brand-faint font-mono">{id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
