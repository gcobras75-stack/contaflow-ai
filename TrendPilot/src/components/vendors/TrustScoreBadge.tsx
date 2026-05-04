import { cn } from '@/utils'

interface TrustScoreBadgeProps {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

function getConfig(score: number) {
  if (score >= 90) return { label: 'Elite',          color: 'text-[#0066FF]',  bg: 'bg-[#0066FF]/10 border-[#0066FF]/30',  bar: 'bg-[#0066FF]' }
  if (score >= 70) return { label: 'Confiable',      color: 'text-[#00FF88]',  bg: 'bg-[#00FF88]/10 border-[#00FF88]/30',  bar: 'bg-[#00FF88]' }
  if (score >= 40) return { label: 'En desarrollo',  color: 'text-[#FFB800]',  bg: 'bg-[#FFB800]/10 border-[#FFB800]/30',  bar: 'bg-[#FFB800]' }
  return              { label: 'Vendedor nuevo',  color: 'text-[#FF3B30]',  bg: 'bg-[#FF3B30]/10 border-[#FF3B30]/30',  bar: 'bg-[#FF3B30]' }
}

export function TrustScoreBadge({ score, showLabel = true, size = 'md' }: TrustScoreBadgeProps) {
  const config = getConfig(score)

  const numSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }[size]

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className={cn('font-bold tabular-nums', numSize, config.color)}>
          {score}
        </span>
        {showLabel && (
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', config.bg, config.color)}>
            {config.label}
          </span>
        )}
      </div>
      {size !== 'sm' && (
        <div className="h-1 w-16 bg-brand-border rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full', config.bar)}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  )
}
