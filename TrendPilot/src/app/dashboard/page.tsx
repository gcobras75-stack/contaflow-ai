'use client'

import {
  TrendingUp, Users, Coins, Bell,
  ArrowUpRight, ArrowDownRight, Flame, Zap,
  Radio, ChevronRight, Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { formatMXN, getSemaphoreClasses } from '@/utils'
import type { SemaphoreColor } from '@/types'
import { SeasonAlertWidget } from '@/components/dashboard/SeasonAlertWidget'
import { ProductImage } from '@/components/ui/ProductImage'

const stats = {
  daily_commissions:        18_450,
  daily_commissions_change: 12.4,
  active_vendors:           34,
  active_vendors_change:    3,
  active_campaigns:         7,
  pending_approvals:        5,
  growth_fund:              124_500,
}

const mockTrends = [
  { keyword: 'Aretes de plata',          score: 94, source: 'mercadolibre', is_early: true,  badge: 'EXPLOSIVO',   price: 320 },
  { keyword: 'Bolsas de tela ecológica', score: 88, source: 'google',       is_early: false, badge: 'EN ALERTA',   price: 180 },
  { keyword: 'Suplementos colágeno',     score: 82, source: 'tiktok',       is_early: true,  badge: 'EXPLOSIVO',   price: 450 },
  { keyword: 'Ropa deportiva mujer',     score: 79, source: 'google',       is_early: false, badge: 'EN ALERTA',   price: 620 },
  { keyword: 'Mini aspiradora',          score: 74, source: 'mercadolibre', is_early: false, badge: 'ESTABLE',     price: 890 },
  { keyword: 'Teclado mecánico',         score: 71, source: 'mercadolibre', is_early: false, badge: 'ESTABLE',     price: 1200 },
]

const mockCampaigns = [
  { name: 'Aretes Plata — Meta',      platform: 'meta',   color: 'green'  as SemaphoreColor, roi: 210, budget_spent: 3_200, keyword: 'Aretes de plata' },
  { name: 'Bolsas Eco — TikTok',      platform: 'tiktok', color: 'green'  as SemaphoreColor, roi: 175, budget_spent: 1_800, keyword: 'Bolsas de tela ecológica' },
  { name: 'Colágeno — Meta',          platform: 'meta',   color: 'yellow' as SemaphoreColor, roi: 112, budget_spent: 2_100, keyword: 'Suplementos colágeno' },
  { name: 'Ropa Deportiva — TikTok',  platform: 'tiktok', color: 'yellow' as SemaphoreColor, roi: 95,  budget_spent: 980,   keyword: 'Ropa deportiva mujer' },
  { name: 'Mini Aspiradora — Meta',   platform: 'meta',   color: 'red'    as SemaphoreColor, roi: 61,  budget_spent: 1_500, keyword: 'Mini aspiradora' },
]

const mockAlerts = [
  { type: 'vendor',   message: 'Nuevo vendedor pendiente: Moda Fina MX',         time: 'hace 12 min', urgent: false },
  { type: 'product',  message: '3 productos esperan aprobación de ProductScore',  time: 'hace 45 min', urgent: true  },
  { type: 'campaign', message: 'Mini Aspiradora: ROI bajo 80% — revisar',         time: 'hace 2 hrs',  urgent: true  },
]

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

// ─── Componentes ─────────────────────────────────────────────────────────────

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
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${change >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
          {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          <span>{Math.abs(change)}% vs ayer</span>
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
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
            <Flame size={14} className="text-brand-primary" />
            <span className="text-xs font-medium text-brand-text">
              TrendPilot detectó 3 oportunidades hoy
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <StatCard label="Comisiones hoy"      value={formatMXN(stats.daily_commissions)} change={stats.daily_commissions_change} icon={Coins}  gradient delay={0}   />
        <StatCard label="Vendedores activos"  value={stats.active_vendors.toString()}    change={stats.active_vendors_change}    icon={Users}         delay={60}  />
        <StatCard label="Campañas activas"    value={stats.active_campaigns.toString()}                                          icon={Radio}         delay={120} />
        <StatCard label="Pendientes aprobación" value={stats.pending_approvals.toString()}                                       icon={Bell}          delay={180} />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* TrendRadar */}
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

          <div className="space-y-2">
            {mockTrends.map((trend) => {
              const badge = badgeConfig[trend.badge as keyof typeof badgeConfig] ?? badgeConfig['ESTABLE']
              const src   = sourceColor[trend.source] ?? 'text-brand-muted bg-brand-hover'
              return (
                <div
                  key={trend.keyword}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-brand-hover transition-colors group cursor-pointer"
                >
                  {/* Imagen del producto */}
                  <ProductImage keyword={trend.keyword} size={48} radius={10} className="shrink-0" />

                  {/* Score */}
                  <div className="w-8 text-center shrink-0">
                    <span className="text-sm font-bold font-mono text-brand-text">{trend.score}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-medium text-brand-text truncate">{trend.keyword}</span>
                      {trend.is_early && <Zap size={10} className="text-brand-yellow shrink-0" />}
                    </div>
                    <div className="h-1 rounded-full bg-brand-hover">
                      <div className="score-bar-fill" style={{ width: `${trend.score}%` }} />
                    </div>
                  </div>

                  {/* Badge + source */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.text} ${badge.pulse ? 'animate-pulse' : ''}`}>
                      {trend.badge}
                    </span>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${src} hidden sm:inline`}>
                      {trend.source === 'mercadolibre' ? 'ML' : trend.source.toUpperCase()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CampaignPilot semáforo */}
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

          <div className="space-y-2">
            {mockCampaigns.map((c) => {
              const colorMap = {
                green:  { dot: 'bg-brand-green',  text: 'text-brand-green',  bg: 'bg-brand-green/8'  },
                yellow: { dot: 'bg-brand-yellow', text: 'text-brand-yellow', bg: 'bg-brand-yellow/8' },
                red:    { dot: 'bg-brand-red',    text: 'text-brand-red',    bg: 'bg-brand-red/8'    },
                paused: { dot: 'bg-brand-red',    text: 'text-brand-red',    bg: 'bg-brand-red/8'    },
              }
              const cfg = colorMap[c.color] ?? colorMap.yellow
              return (
                <div key={c.name} className={`flex items-center gap-3 px-3 py-2 rounded-xl border border-transparent ${cfg.bg} hover:border-brand-border transition-all`}>
                  {/* Imagen pequeña del producto */}
                  <ProductImage keyword={c.keyword} size={36} radius={8} className="shrink-0" />
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${c.color === 'green' ? 'animate-pulse' : ''}`} />
                  <span className="flex-1 text-sm text-brand-text truncate font-medium">{c.name}</span>
                  <span className={`text-sm font-bold font-mono ${cfg.text}`}>
                    {c.roi > 0 ? '+' : ''}{c.roi}%
                  </span>
                  <span className="text-xs text-brand-faint font-mono tabular-nums hidden sm:block">
                    ${(c.budget_spent / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )
            })}
          </div>

          {/* GrowthFund */}
          <div className="mt-4 p-3 rounded-xl bg-brand-primary/8 border border-brand-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={13} className="text-brand-primary" />
                <span className="text-xs font-semibold text-brand-text">GrowthFund disponible</span>
              </div>
              <span className="text-sm font-bold font-mono gradient-text">
                {formatMXN(stats.growth_fund)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SeasonAlert */}
      <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <SeasonAlertWidget />
      </div>

      {/* Alertas */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '240ms' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell size={15} className="text-brand-yellow" />
              {mockAlerts.some((a) => a.urgent) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-red rounded-full animate-pulse" />
              )}
            </div>
            <h2 className="text-sm font-bold text-brand-text">Alertas pendientes</h2>
            <span className="text-[10px] font-bold bg-brand-yellow/15 text-brand-yellow px-2 py-0.5 rounded-full">
              {mockAlerts.length}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          {mockAlerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-brand-hover/60 hover:bg-brand-hover transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                {alert.urgent && (
                  <span className="w-1.5 h-1.5 bg-brand-red rounded-full animate-pulse shrink-0" />
                )}
                <p className="text-sm text-brand-text">{alert.message}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-faint whitespace-nowrap">{alert.time}</span>
                <ChevronRight size={12} className="text-brand-faint group-hover:text-brand-muted transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
