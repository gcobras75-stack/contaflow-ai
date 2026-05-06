'use client'

import { useEffect, useState } from 'react'
import { Zap, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/utils'
import {
  MOCK_EARLY_SIGNALS, SIGNAL_LABELS, detectEarlySignals,
  type EarlySignalOpportunity, type RawTrend,
} from '@/lib/earlysignal'

const COMPETITION_COLOR: Record<string, string> = {
  'muy baja': 'text-brand-green',
  'baja':     'text-brand-yellow',
  'media':    'text-brand-primary',
}

export function EarlySignalWidget() {
  const [signals, setSignals] = useState<EarlySignalOpportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/trends?limit=50')
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (!json) { setSignals(MOCK_EARLY_SIGNALS); return }
        const rawTrends: RawTrend[] = (json.data ?? []).map((t: Record<string, unknown>) => ({
          keyword:         t.keyword,
          trend_score:     t.trend_score,
          is_early_signal: t.is_early_signal,
          historical_data: t.historical_data,
          detected_at:     t.detected_at ?? t.created_at,
        }))
        // Deduplicar por keyword antes de detectar señales
        const seenKw = new Map<string, RawTrend>()
        for (const t of rawTrends) { const k = String(t.keyword).toLowerCase(); if (!seenKw.has(k)) seenKw.set(k, t) }
        const uniqueTrends = Array.from(seenKw.values())
        const detected = detectEarlySignals(uniqueTrends)
        setSignals(detected.length > 0 ? detected : MOCK_EARLY_SIGNALS)
      })
      .catch(() => setSignals(MOCK_EARLY_SIGNALS))
      .finally(() => setLoading(false))
  }, [])

  const top = signals.slice(0, 3)

  return (
    <div className="bg-brand-card border border-brand-yellow/25 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-yellow/15 flex items-center justify-center">
            <Zap size={13} className="text-brand-yellow" />
          </div>
          <h2 className="text-sm font-bold text-brand-text">EarlySignal™</h2>
          {!loading && signals.length > 0 && (
            <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 bg-brand-yellow text-black rounded-full animate-pulse">
              {signals.length} activas
            </span>
          )}
        </div>
        <Link
          href="/dashboard/early"
          className="text-xs text-brand-primary hover:underline flex items-center gap-1"
        >
          Ver todas <ChevronRight size={11} />
        </Link>
      </div>

      {/* Lista */}
      <div className="space-y-2.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))
        ) : top.length === 0 ? (
          <div className="text-center py-6 text-brand-faint">
            <Zap size={20} className="mx-auto mb-2 opacity-20" />
            <p className="text-xs">Sin señales activas</p>
          </div>
        ) : (
          top.map((opp, i) => (
            <div
              key={opp.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all hover:border-brand-yellow/30',
                i === 0 ? 'bg-brand-yellow/6 border-brand-yellow/20' : 'bg-brand-hover border-transparent',
              )}
            >
              {/* Score */}
              <div className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-brand-yellow/12 border border-brand-yellow/25">
                <span className="text-[11px] font-bold font-mono text-brand-yellow">{opp.score}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold text-brand-text truncate">{opp.keyword}</span>
                  {i === 0 && (
                    <span className="text-[8px] font-bold px-1 py-0.5 bg-brand-yellow text-black rounded-full shrink-0 animate-pulse">
                      ⚡
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn('text-[9px]', COMPETITION_COLOR[opp.competition] ?? 'text-brand-muted')}>
                    Comp. {opp.competition}
                  </span>
                  <span className="text-[9px] text-brand-faint">·</span>
                  {opp.signals.slice(0, 2).map((s) => {
                    const cfg = SIGNAL_LABELS[s]
                    return (
                      <span key={s} className={cn('text-[9px]', cfg.color)}>
                        {cfg.emoji}
                      </span>
                    )
                  })}
                  <span className="text-[9px] text-brand-faint">~{opp.windowWeeks} sem.</span>
                </div>
              </div>

              {/* CTA */}
              <Link
                href={`/dashboard/ads?keyword=${encodeURIComponent(opp.keyword)}`}
                className="shrink-0 text-[9px] font-bold px-2 py-1 btn-gradient text-white rounded-lg whitespace-nowrap"
              >
                🚀 Crear
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
