'use client'

import {
  TrendingUp, Users, Coins, Bell,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { formatMXN, getSemaphoreClasses, getSemaphoreLabel } from '@/utils'
import type { SemaphoreColor } from '@/types'
import { SeasonAlertWidget } from '@/components/dashboard/SeasonAlertWidget'

// Mock data — se reemplazará con queries reales a Supabase
const stats = {
  daily_commissions: 18_450,
  daily_commissions_change: 12.4,
  active_vendors: 34,
  active_vendors_change: 3,
  active_campaigns: 7,
  pending_approvals: 5,
}

const mockTrends = [
  { keyword: 'Aretes de plata', score: 94, source: 'mercadolibre', is_early: true },
  { keyword: 'Bolsas de tela ecológica', score: 88, source: 'google', is_early: false },
  { keyword: 'Suplementos colágeno', score: 82, source: 'tiktok', is_early: true },
  { keyword: 'Ropa deportiva mujer', score: 79, source: 'google', is_early: false },
  { keyword: 'Mini aspiradora inalámbrica', score: 76, source: 'mercadolibre', is_early: false },
]

const mockCampaigns = [
  { name: 'Aretes Plata — Meta', platform: 'meta', color: 'green' as SemaphoreColor, roi: 210, budget_spent: 3_200 },
  { name: 'Bolsas Eco — TikTok', platform: 'tiktok', color: 'green' as SemaphoreColor, roi: 175, budget_spent: 1_800 },
  { name: 'Colágeno — Meta', platform: 'meta', color: 'yellow' as SemaphoreColor, roi: 112, budget_spent: 2_100 },
  { name: 'Ropa Deportiva — TikTok', platform: 'tiktok', color: 'yellow' as SemaphoreColor, roi: 95, budget_spent: 980 },
  { name: 'Mini Aspiradora — Meta', platform: 'meta', color: 'red' as SemaphoreColor, roi: 61, budget_spent: 1_500 },
]

const mockAlerts = [
  { type: 'vendor', message: 'Nuevo vendedor pendiente: Moda Fina MX', time: 'hace 12 min' },
  { type: 'product', message: '3 productos esperan aprobación de ProductScore', time: 'hace 45 min' },
  { type: 'campaign', message: 'Mini Aspiradora: ROI bajo 80% — revisar', time: 'hace 2 hrs' },
]

// Tarjeta de estadística
function StatCard({
  label,
  value,
  change,
  icon: Icon,
  valueColor,
}: {
  label: string
  value: string
  change?: number
  icon: React.ElementType
  valueColor?: string
}) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-brand-muted font-medium uppercase tracking-wider">
          {label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
          <Icon size={15} className="text-brand-primary" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${valueColor ?? 'text-white'}`}>{value}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${change >= 0 ? 'text-[#00FF88]' : 'text-[#FF3B30]'}`}>
          {change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          <span>{Math.abs(change)}% vs ayer</span>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-brand-muted mt-0.5">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Comisiones hoy"
          value={formatMXN(stats.daily_commissions)}
          change={stats.daily_commissions_change}
          icon={Coins}
          valueColor="text-[#00FF88]"
        />
        <StatCard
          label="Vendedores activos"
          value={stats.active_vendors.toString()}
          change={stats.active_vendors_change}
          icon={Users}
        />
        <StatCard
          label="Campañas activas"
          value={stats.active_campaigns.toString()}
          icon={TrendingUp}
        />
        <StatCard
          label="Pendientes aprobación"
          value={stats.pending_approvals.toString()}
          icon={Bell}
          valueColor={stats.pending_approvals > 0 ? 'text-[#FFB800]' : 'text-white'}
        />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TrendRadar */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp size={15} className="text-brand-primary" />
              TrendRadar — Hoy
            </h2>
            <span className="text-[10px] text-brand-muted bg-brand-border px-2 py-0.5 rounded-full">
              Módulo 01
            </span>
          </div>
          <div className="space-y-2.5">
            {mockTrends.map((trend) => (
              <div
                key={trend.keyword}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-brand-border/50 transition-colors"
              >
                {/* Score bar */}
                <div className="flex-shrink-0 w-10 text-center">
                  <span className="text-sm font-bold text-white">{trend.score}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white truncate">{trend.keyword}</span>
                    {trend.is_early && (
                      <span className="text-[9px] bg-brand-primary/20 text-brand-primary border border-brand-primary/30 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                        EARLY
                      </span>
                    )}
                  </div>
                  {/* Mini barra de progreso */}
                  <div className="mt-1 h-1 rounded-full bg-brand-border">
                    <div
                      className="h-1 rounded-full bg-brand-primary"
                      style={{ width: `${trend.score}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-brand-muted capitalize flex-shrink-0">
                  {trend.source}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Semáforo campañas */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#00FF88] animate-pulse inline-block" />
              CampaignPilot — Semáforo
            </h2>
            <span className="text-[10px] text-brand-muted bg-brand-border px-2 py-0.5 rounded-full">
              Módulo 07
            </span>
          </div>
          <div className="space-y-2">
            {mockCampaigns.map((c) => (
              <div
                key={c.name}
                className={`flex items-center gap-3 p-3 rounded-lg border ${getSemaphoreClasses(c.color)}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  c.color === 'green' ? 'bg-[#00FF88]' :
                  c.color === 'yellow' ? 'bg-[#FFB800]' : 'bg-[#FF3B30]'
                }`} />
                <span className="flex-1 text-sm text-white truncate">{c.name}</span>
                <span className="text-xs font-semibold">ROI {c.roi}%</span>
                <span className="text-xs text-brand-muted">{formatMXN(c.budget_spent)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SeasonAlert */}
      <SeasonAlertWidget />

      {/* Alertas pendientes */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <Bell size={15} className="text-[#FFB800]" />
          Alertas pendientes
        </h2>
        <div className="space-y-2">
          {mockAlerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg bg-brand-border/40 hover:bg-brand-border transition-colors cursor-pointer"
            >
              <p className="text-sm text-white">{alert.message}</p>
              <span className="text-xs text-brand-muted flex-shrink-0 ml-4">{alert.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
