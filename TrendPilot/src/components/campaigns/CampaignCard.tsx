'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Pause, Zap } from 'lucide-react'
import { cn } from '@/utils'

export interface CampaignCardData {
  id:                string
  product_name:      string
  vendor_name:       string
  platform:          string
  semaphore_color:   'green' | 'yellow' | 'red' | 'paused'
  budget_total:      number
  budget_spent:      number
  sales_generated:   number
  commissions_earned: number
  pause_reason?:     string
  ai_suggestions?:   Record<string, unknown>
  created_at:        string
}

const semConfig = {
  green: {
    border:   'border-[#00FF88]/40',
    bg:       'bg-[#00FF88]/5',
    dot:      'bg-[#00FF88]',
    label:    'Activa',
    icon:     TrendingUp,
    iconColor:'text-[#00FF88]',
    roiColor: 'text-[#00FF88]',
  },
  yellow: {
    border:   'border-[#FFB800]/40',
    bg:       'bg-[#FFB800]/5',
    dot:      'bg-[#FFB800]',
    label:    'En revisión',
    icon:     AlertTriangle,
    iconColor:'text-[#FFB800]',
    roiColor: 'text-[#FFB800]',
  },
  red: {
    border:   'border-[#FF3B30]/40',
    bg:       'bg-[#FF3B30]/5',
    dot:      'bg-[#FF3B30]',
    label:    'Pausada',
    icon:     TrendingDown,
    iconColor:'text-[#FF3B30]',
    roiColor: 'text-[#FF3B30]',
  },
  paused: {
    border:   'border-[#FF3B30]/40',
    bg:       'bg-[#FF3B30]/5',
    dot:      'bg-[#FF3B30]',
    label:    'Pausada',
    icon:     Pause,
    iconColor:'text-[#FF3B30]',
    roiColor: 'text-[#FF3B30]',
  },
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n / 100)
}

export function CampaignCard({ campaign, onApplySuggestions }: {
  campaign: CampaignCardData
  onApplySuggestions?: (id: string) => void
}) {
  const cfg    = semConfig[campaign.semaphore_color] ?? semConfig.yellow
  const Icon   = cfg.icon
  const roi    = campaign.budget_spent > 0
    ? Math.round(((campaign.sales_generated - campaign.budget_spent) / campaign.budget_spent) * 100)
    : 0
  const spendPct = campaign.budget_total > 0
    ? Math.min(100, Math.round((campaign.budget_spent / campaign.budget_total) * 100))
    : 0

  // GrowthFund = 40% de comisiones
  const growthFund     = Math.round(campaign.commissions_earned * 0.4)
  const platformEarning = campaign.commissions_earned - growthFund

  return (
    <div className={cn('rounded-2xl border p-4 space-y-3', cfg.border, cfg.bg)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn('w-2 h-2 rounded-full shrink-0 animate-pulse', cfg.dot)} />
            <span className={cn('text-[10px] font-bold uppercase tracking-wider', cfg.iconColor)}>
              {cfg.label}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white truncate">{campaign.product_name}</h3>
          <p className="text-xs text-brand-muted truncate">{campaign.vendor_name} · {campaign.platform.toUpperCase()}</p>
        </div>
        <Icon size={18} className={cn('shrink-0 mt-1', cfg.iconColor)} />
      </div>

      {/* ROI */}
      <div className="flex items-end gap-1">
        <span className={cn('text-3xl font-bold tabular-nums leading-none', cfg.roiColor)}>
          {roi > 0 ? '+' : ''}{roi}%
        </span>
        <span className="text-xs text-brand-muted mb-0.5">ROI</span>
      </div>

      {/* Progreso de presupuesto */}
      <div>
        <div className="flex justify-between text-[10px] text-brand-muted mb-1">
          <span>Presupuesto usado</span>
          <span className="tabular-nums">{fmt(campaign.budget_spent)} / {fmt(campaign.budget_total)}</span>
        </div>
        <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', cfg.dot)}
            style={{ width: `${spendPct}%` }}
          />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-brand-bg/50 rounded-lg p-2">
          <p className="text-[10px] text-brand-muted">Ventas generadas</p>
          <p className="text-sm font-bold text-white">{fmt(campaign.sales_generated)}</p>
        </div>
        <div className="bg-brand-bg/50 rounded-lg p-2">
          <p className="text-[10px] text-brand-muted">Comisiones</p>
          <p className="text-sm font-bold text-white">{fmt(campaign.commissions_earned)}</p>
        </div>
      </div>

      {/* GrowthFund breakdown */}
      {campaign.commissions_earned > 0 && (
        <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-2.5 text-[10px] space-y-0.5">
          <p className="text-brand-primary font-semibold">GrowthFund</p>
          <p className="text-brand-muted">Tu ganancia (60%): <span className="text-white font-medium">{fmt(platformEarning)}</span></p>
          <p className="text-brand-muted">GrowthFund (40%): <span className="text-brand-primary font-medium">{fmt(growthFund)}</span></p>
        </div>
      )}

      {/* Alerta / sugerencia IA */}
      {campaign.semaphore_color === 'yellow' && (
        <div className="flex items-center gap-1.5 text-[10px] text-[#FFB800]">
          <Zap size={10} />
          <span>IA analizando métricas…</span>
        </div>
      )}
      {campaign.pause_reason && (
        <p className="text-[10px] text-[#FF3B30] bg-[#FF3B30]/5 rounded px-2 py-1">
          Pausa: {campaign.pause_reason}
        </p>
      )}

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <Link
          href={`/dashboard/campaigns/${campaign.id}`}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-brand-border hover:bg-brand-border/80 rounded-lg text-xs text-white transition-colors"
        >
          Ver detalle <ChevronRight size={12} />
        </Link>
        {(campaign.semaphore_color === 'red' || campaign.semaphore_color === 'paused') && onApplySuggestions && (
          <button
            onClick={() => onApplySuggestions(campaign.id)}
            className="flex-1 px-3 py-2 bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/30 rounded-lg text-xs font-medium hover:bg-[#FFB800]/20 transition-colors"
          >
            Aplicar IA
          </button>
        )}
      </div>
    </div>
  )
}
