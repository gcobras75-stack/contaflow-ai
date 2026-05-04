import { TrendingUp, Zap, AlertTriangle, Minus } from 'lucide-react'
import { cn } from '@/utils'

interface TrendCardProps {
  keyword:        string
  trend_score:    number
  badge:          string
  is_early_signal: boolean
  total_results:  number
  avg_price:      number
  detected_at:    string
  source:         string
}

const badgeConfig = {
  EXPLOSIVO: {
    color:     'text-[#00FF88]',
    bg:        'bg-[#00FF88]/10 border-[#00FF88]/30',
    bar:       'bg-[#00FF88]',
    icon:      Zap,
    iconColor: 'text-[#00FF88]',
  },
  'EN ALERTA': {
    color:     'text-[#FFB800]',
    bg:        'bg-[#FFB800]/10 border-[#FFB800]/30',
    bar:       'bg-[#FFB800]',
    icon:      AlertTriangle,
    iconColor: 'text-[#FFB800]',
  },
  ESTABLE: {
    color:     'text-brand-muted',
    bg:        'bg-brand-border/50 border-brand-border',
    bar:       'bg-brand-muted',
    icon:      Minus,
    iconColor: 'text-brand-muted',
  },
}

function formatPrice(price: number): string {
  if (price === 0) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(price)
}

function formatResults(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export function TrendCard({
  keyword,
  trend_score,
  badge,
  is_early_signal,
  total_results,
  avg_price,
  detected_at,
}: TrendCardProps) {
  const config = badgeConfig[badge as keyof typeof badgeConfig] ?? badgeConfig['ESTABLE']
  const Icon = config.icon

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 hover:border-brand-primary/50 transition-colors group">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={16} className={cn('shrink-0', config.iconColor)} />
          <h3 className="text-sm font-semibold text-white capitalize truncate">{keyword}</h3>
        </div>
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0', config.bg, config.color)}>
          {badge}
        </span>
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-brand-muted">TrendScore</span>
          <span className={cn('text-sm font-bold tabular-nums', config.color)}>{trend_score}</span>
        </div>
        <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', config.bar)}
            style={{ width: `${trend_score}%` }}
          />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-brand-border/50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-brand-muted mb-0.5">Competencia</p>
          <p className="text-sm font-semibold text-white">{formatResults(total_results)}</p>
        </div>
        <div className="bg-brand-border/50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-brand-muted mb-0.5">Precio promedio</p>
          <p className="text-sm font-semibold text-white">{formatPrice(avg_price)}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border">
        <div className="flex items-center gap-1.5">
          {is_early_signal && (
            <span className="text-[10px] font-bold bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded-full">
              EARLY SIGNAL
            </span>
          )}
        </div>
        <span className="text-[10px] text-brand-muted">{timeAgo(detected_at)}</span>
      </div>
    </div>
  )
}
