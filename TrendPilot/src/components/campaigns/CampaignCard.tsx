'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Pause, Zap, Coins } from 'lucide-react'
import { cn } from '@/utils'
import { ProductImage } from '@/components/ui/ProductImage'

export interface CampaignCardData {
  id:                 string
  product_name:       string
  vendor_name:        string
  platform:           string
  semaphore_color:    'green' | 'yellow' | 'red' | 'paused'
  budget_total:       number
  budget_spent:       number
  sales_generated:    number
  commissions_earned: number
  pause_reason?:      string
  ai_suggestions?:    Record<string, unknown>
  product_image?:     string | null   // URL de imagen del producto (images[0])
  created_at:         string
}

const semConfig = {
  green: {
    border:    'border-brand-green/25',
    bg:        'bg-brand-green/5',
    dot:       'bg-brand-green',
    dotPulse:  true,
    label:     'Activa',
    icon:      TrendingUp,
    iconColor: 'text-brand-green',
    roiColor:  'text-brand-green',
    badgeBg:   'bg-brand-green/15 text-brand-green',
  },
  yellow: {
    border:    'border-brand-yellow/25',
    bg:        'bg-brand-yellow/5',
    dot:       'bg-brand-yellow',
    dotPulse:  false,
    label:     'En revisión',
    icon:      AlertTriangle,
    iconColor: 'text-brand-yellow',
    roiColor:  'text-brand-yellow',
    badgeBg:   'bg-brand-yellow/15 text-brand-yellow',
  },
  red: {
    border:    'border-brand-red/25',
    bg:        'bg-brand-red/5',
    dot:       'bg-brand-red',
    dotPulse:  false,
    label:     'Pausada',
    icon:      TrendingDown,
    iconColor: 'text-brand-red',
    roiColor:  'text-brand-red',
    badgeBg:   'bg-brand-red/15 text-brand-red',
  },
  paused: {
    border:    'border-brand-red/25',
    bg:        'bg-brand-red/5',
    dot:       'bg-brand-red',
    dotPulse:  false,
    label:     'Pausada',
    icon:      Pause,
    iconColor: 'text-brand-red',
    roiColor:  'text-brand-red',
    badgeBg:   'bg-brand-red/15 text-brand-red',
  },
}

const platformBadge: Record<string, { label: string; cls: string }> = {
  meta:   { label: 'Meta',          cls: 'bg-[#1877F2]/15 text-[#1877F2]' },
  tiktok: { label: 'TikTok',        cls: 'bg-[#FF0050]/15 text-[#FF0050]' },
  both:   { label: 'Meta + TikTok', cls: 'bg-brand-purple/15 text-brand-purple' },
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
  }).format(n / 100)
}

export function CampaignCard({ campaign, onApplySuggestions }: {
  campaign: CampaignCardData
  onApplySuggestions?: (id: string) => void
}) {
  const cfg      = semConfig[campaign.semaphore_color] ?? semConfig.yellow
  const Icon     = cfg.icon
  const roi      = campaign.budget_spent > 0
    ? Math.round(((campaign.sales_generated - campaign.budget_spent) / campaign.budget_spent) * 100)
    : 0
  const spendPct = campaign.budget_total > 0
    ? Math.min(100, Math.round((campaign.budget_spent / campaign.budget_total) * 100))
    : 0

  const growthFund      = Math.round(campaign.commissions_earned * 0.4)
  const platformEarning = campaign.commissions_earned - growthFund
  const pb              = platformBadge[campaign.platform] ?? { label: campaign.platform.toUpperCase(), cls: 'bg-brand-hover text-brand-muted' }

  return (
    <div className={cn('rounded-2xl border p-4 space-y-3', cfg.border, cfg.bg)}>
      {/* Header con imagen */}
      <div className="flex items-start gap-3">
        {/* Imagen del producto 56x56 */}
        <ProductImage
          keyword={campaign.product_name}
          src={campaign.product_image}
          size={56}
          radius={10}
          className="shrink-0 mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot, cfg.dotPulse && 'animate-pulse')} />
            <span className={cn('text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full', cfg.badgeBg)}>
              {cfg.label}
            </span>
            <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full', pb.cls)}>
              {pb.label}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-brand-text truncate">{campaign.product_name}</h3>
          <p className="text-xs text-brand-muted truncate mt-0.5">{campaign.vendor_name}</p>
        </div>

        <Icon size={16} className={cn('shrink-0 mt-1', cfg.iconColor)} />
      </div>

      {/* ROI */}
      <div className="flex items-end gap-1">
        <span className={cn('text-2xl font-bold font-mono tabular-nums leading-none', cfg.roiColor)}>
          {roi > 0 ? '+' : ''}{roi}%
        </span>
        <span className="text-xs text-brand-faint mb-0.5">ROI</span>
      </div>

      {/* Barra de presupuesto */}
      <div>
        <div className="flex justify-between text-[10px] text-brand-faint mb-1.5">
          <span>Presupuesto</span>
          <span className="tabular-nums font-mono">{fmt(campaign.budget_spent)} / {fmt(campaign.budget_total)}</span>
        </div>
        <div className="h-1 bg-brand-hover rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', cfg.dot)} style={{ width: `${spendPct}%` }} />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-brand-card/60 rounded-xl p-2.5">
          <p className="text-[10px] text-brand-faint mb-0.5">Ventas</p>
          <p className="text-sm font-bold font-mono text-brand-text">{fmt(campaign.sales_generated)}</p>
        </div>
        <div className="bg-brand-card/60 rounded-xl p-2.5">
          <p className="text-[10px] text-brand-faint mb-0.5">Comisiones</p>
          <p className="text-sm font-bold font-mono text-brand-text">{fmt(campaign.commissions_earned)}</p>
        </div>
      </div>

      {/* GrowthFund breakdown */}
      {campaign.commissions_earned > 0 && (
        <div className="bg-brand-primary/8 border border-brand-primary/20 rounded-xl p-2.5 text-[10px] space-y-0.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Coins size={10} className="text-brand-primary" />
            <p className="text-brand-primary font-semibold">GrowthFund</p>
          </div>
          <p className="text-brand-muted">Tu ganancia (60%): <span className="text-brand-text font-medium">{fmt(platformEarning)}</span></p>
          <p className="text-brand-muted">GrowthFund (40%): <span className="text-brand-primary font-medium">{fmt(growthFund)}</span></p>
        </div>
      )}

      {/* Alertas */}
      {campaign.semaphore_color === 'yellow' && (
        <div className="flex items-center gap-1.5 text-[10px] text-brand-yellow">
          <Zap size={9} />
          <span>IA analizando métricas…</span>
        </div>
      )}
      {campaign.pause_reason && (
        <p className="text-[10px] text-brand-red bg-brand-red/8 border border-brand-red/20 rounded-lg px-2.5 py-1.5">
          Pausa: {campaign.pause_reason}
        </p>
      )}

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <Link
          href={`/dashboard/campaigns/${campaign.id}`}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-brand-hover hover:bg-brand-border rounded-xl text-xs text-brand-text transition-colors"
        >
          Ver detalle <ChevronRight size={11} />
        </Link>
        {(campaign.semaphore_color === 'red' || campaign.semaphore_color === 'paused') && onApplySuggestions && (
          <button
            onClick={() => onApplySuggestions(campaign.id)}
            className="flex-1 px-3 py-2 bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/25 rounded-xl text-xs font-medium hover:bg-brand-yellow/20 transition-colors"
          >
            Aplicar IA
          </button>
        )}
      </div>
    </div>
  )
}
