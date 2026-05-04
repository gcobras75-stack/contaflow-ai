'use client'

import { useMemo } from 'react'
import { Calendar, Zap, ChevronRight } from 'lucide-react'
import { getUpcomingSeasons, type UpcomingSeason } from '@/lib/seasonalert'
import { cn } from '@/utils'
import Link from 'next/link'

const alertColors = {
  peak:       { text: 'text-brand-green',   bg: 'bg-brand-green/10 border-brand-green/30',   dot: 'bg-brand-green'  },
  approaching:{ text: 'text-brand-yellow',  bg: 'bg-brand-yellow/10 border-brand-yellow/30', dot: 'bg-brand-yellow' },
  normal:     { text: 'text-brand-primary', bg: 'bg-brand-primary/10 border-brand-primary/30',dot: 'bg-brand-primary'},
  low:        { text: 'text-brand-muted',   bg: 'bg-brand-hover border-brand-border',         dot: 'bg-brand-muted'  },
}

const importanceBadge: Record<string, { label: string; cls: string }> = {
  major:  { label: 'GRANDE',  cls: 'bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20' },
  medium: { label: 'MEDIO',   cls: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' },
  minor:  { label: 'MENOR',   cls: 'bg-brand-hover text-brand-muted border border-brand-border' },
}

function SeasonCard({ season }: { season: UpcomingSeason }) {
  const cfg = alertColors[season.alert_type]
  const imp = importanceBadge[season.importance] ?? importanceBadge.minor

  return (
    <div className={cn('rounded-xl border p-3 space-y-1.5', cfg.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot, season.alert_type === 'peak' && 'animate-pulse')} />
          <span className={cn('text-xs font-bold tabular-nums', cfg.text)}>
            {season.days_away === 0 ? '¡AHORA!' : `en ${season.days_away}d`}
          </span>
        </div>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', imp.cls)}>
          {imp.label}
        </span>
      </div>
      <p className="text-sm font-semibold text-brand-text">{season.name}</p>
      <p className="text-[10px] text-brand-faint line-clamp-1">
        {season.categories.slice(0, 4).join(' · ')}
      </p>
    </div>
  )
}

export function SeasonAlertWidget() {
  const seasons = useMemo(() => getUpcomingSeasons(new Date(), 3), [])

  if (seasons.length === 0) {
    return (
      <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} className="text-brand-primary" />
          <h3 className="text-sm font-semibold text-brand-text">SeasonAlert</h3>
        </div>
        <p className="text-xs text-brand-muted">Sin temporadas importantes en los próximos 90 días.</p>
      </div>
    )
  }

  const next     = seasons[0]
  const isUrgent = next.days_away <= 21
  const isPeak   = next.days_away === 0

  return (
    <div className={cn(
      'bg-brand-card border rounded-2xl p-4 space-y-3',
      isPeak   ? 'border-brand-green/40'  :
      isUrgent ? 'border-brand-yellow/40' :
      'border-brand-border'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center',
            isPeak   ? 'bg-brand-green/15'  :
            isUrgent ? 'bg-brand-yellow/15' :
            'bg-brand-primary/12'
          )}>
            <Calendar size={14} className={isPeak ? 'text-brand-green' : isUrgent ? 'text-brand-yellow' : 'text-brand-primary'} />
          </div>
          <h3 className="text-sm font-semibold text-brand-text">SeasonAlert</h3>
        </div>
        {isUrgent && !isPeak && (
          <div className="flex items-center gap-1 text-[10px] text-brand-yellow font-bold animate-pulse">
            <Zap size={10} /> PREPARAR AHORA
          </div>
        )}
        {isPeak && (
          <div className="flex items-center gap-1 text-[10px] text-brand-green font-bold animate-pulse">
            <Zap size={10} /> ¡TEMPORADA ACTIVA!
          </div>
        )}
      </div>

      {/* Countdown prominente para la primera temporada */}
      {next.days_away > 0 && next.days_away <= 45 && (
        <div className={cn(
          'rounded-xl px-4 py-3 flex items-center justify-between',
          isUrgent ? 'bg-brand-yellow/10' : 'bg-brand-primary/8'
        )}>
          <div>
            <p className="text-[10px] text-brand-faint uppercase tracking-widest mb-0.5">Próxima temporada</p>
            <p className="text-sm font-bold text-brand-text">{next.name}</p>
          </div>
          <div className="text-right">
            <p className={cn('text-2xl font-bold font-mono tabular-nums', isUrgent ? 'text-brand-yellow' : 'text-brand-primary')}>
              {next.days_away}
            </p>
            <p className="text-[10px] text-brand-faint">días</p>
          </div>
        </div>
      )}

      {/* Cards de temporadas */}
      <div className="space-y-2">
        {seasons.map((s, i) => (
          <SeasonCard key={i} season={s} />
        ))}
      </div>

      {/* Pie */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-brand-faint leading-relaxed">
          Prepara campañas 3 semanas antes del pico.
        </p>
        <Link
          href="/dashboard/trends"
          className="text-[10px] text-brand-primary hover:underline flex items-center gap-0.5"
        >
          Tendencias <ChevronRight size={10} />
        </Link>
      </div>
    </div>
  )
}
