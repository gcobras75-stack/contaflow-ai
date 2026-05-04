'use client'

import { useMemo } from 'react'
import { Calendar, Zap } from 'lucide-react'
import { getUpcomingSeasons, type UpcomingSeason } from '@/lib/seasonalert'
import { cn } from '@/utils'

const alertColors = {
  peak:       { text: 'text-[#00FF88]', bg: 'bg-[#00FF88]/10 border-[#00FF88]/30', dot: 'bg-[#00FF88]' },
  approaching:{ text: 'text-[#FFB800]', bg: 'bg-[#FFB800]/10 border-[#FFB800]/30', dot: 'bg-[#FFB800]' },
  normal:     { text: 'text-brand-primary', bg: 'bg-brand-primary/10 border-brand-primary/30', dot: 'bg-brand-primary' },
  low:        { text: 'text-brand-muted',   bg: 'bg-brand-border',                              dot: 'bg-brand-muted' },
}

function SeasonCard({ season }: { season: UpcomingSeason }) {
  const cfg = alertColors[season.alert_type]

  return (
    <div className={cn('rounded-xl border p-3 space-y-1.5', cfg.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot, season.alert_type === 'peak' && 'animate-pulse')} />
          <span className={cn('text-xs font-bold', cfg.text)}>
            {season.days_away === 0 ? '¡HOY!' : `${season.days_away} días`}
          </span>
        </div>
        {season.importance === 'major' && (
          <span className="text-[10px] bg-[#FFB800]/10 text-[#FFB800] px-1.5 py-0.5 rounded-full font-bold border border-[#FFB800]/20">
            GRANDE
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-white">{season.name}</p>
      <p className="text-[10px] text-brand-muted line-clamp-1">
        {season.categories.slice(0, 4).join(' · ')}
      </p>
    </div>
  )
}

export function SeasonAlertWidget() {
  const seasons = useMemo(() => getUpcomingSeasons(new Date(), 3), [])

  if (seasons.length === 0) {
    return (
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} className="text-brand-primary" />
          <h3 className="text-sm font-semibold text-white">SeasonAlert</h3>
        </div>
        <p className="text-xs text-brand-muted">Sin temporadas importantes en los próximos 90 días.</p>
      </div>
    )
  }

  const next = seasons[0]
  const isUrgent = next.days_away <= 21

  return (
    <div className={cn(
      'bg-brand-surface border rounded-2xl p-4 space-y-3',
      isUrgent ? 'border-[#FFB800]/40' : 'border-brand-border'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={16} className={isUrgent ? 'text-[#FFB800]' : 'text-brand-primary'} />
          <h3 className="text-sm font-semibold text-white">SeasonAlert</h3>
        </div>
        {isUrgent && (
          <div className="flex items-center gap-1 text-[10px] text-[#FFB800] font-bold">
            <Zap size={10} /> PREPARAR AHORA
          </div>
        )}
      </div>

      <div className="space-y-2">
        {seasons.map((s, i) => (
          <SeasonCard key={i} season={s} />
        ))}
      </div>

      <p className="text-[10px] text-brand-muted leading-relaxed">
        Prepara campañas con al menos 3 semanas de anticipación para optimizar el algoritmo.
      </p>
    </div>
  )
}
