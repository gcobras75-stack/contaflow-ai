'use client'

import { useEffect, useState, useCallback } from 'react'
import { Zap, ChevronRight, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/utils'
import {
  MOCK_EARLY_SIGNALS, SIGNAL_LABELS,
  detectEarlySignals,
  type EarlySignalOpportunity, type RawTrend,
} from '@/lib/earlysignal'

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return 'hace un momento'
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} hr`
  return `hace ${Math.floor(diff / 86400)} días`
}

const COMPETITION_CONFIG = {
  'muy baja': { label: 'Muy baja',  color: 'text-brand-green',   bg: 'bg-brand-green/10'   },
  'baja':     { label: 'Baja',      color: 'text-brand-yellow',  bg: 'bg-brand-yellow/10'  },
  'media':    { label: 'Media',     color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
}

function ScoreRing({ score }: { score: number }) {
  const r    = 20
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 85 ? '#00FF88' : score >= 70 ? '#FFB800' : '#0066FF'

  return (
    <svg width={52} height={52} className="shrink-0">
      <circle cx={26} cy={26} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle
        cx={26} cy={26} r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={11} fontWeight={700} fontFamily="monospace">
        {score}
      </text>
    </svg>
  )
}

export default function EarlySignalPage() {
  const [signals, setSignals]   = useState<EarlySignalOpportunity[]>([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState<string | null>(null)

  const fetchSignals = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/trends?limit=50')
      if (res.ok) {
        const json  = await res.json()
        const trends: RawTrend[] = (json.data ?? []).map((t: Record<string, unknown>) => ({
          keyword:         t.keyword,
          trend_score:     t.trend_score,
          is_early_signal: t.is_early_signal,
          historical_data: t.historical_data,
          detected_at:     t.detected_at ?? t.created_at,
        }))
        const detected = detectEarlySignals(trends)
        setSignals(detected.length > 0 ? detected : MOCK_EARLY_SIGNALS)
      } else {
        setSignals(MOCK_EARLY_SIGNALS)
      }
    } catch {
      setSignals(MOCK_EARLY_SIGNALS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSignals() }, [fetchSignals])

  async function handleCreateCampaign(opp: EarlySignalOpportunity) {
    setCreating(opp.id)
    // Redirigir a AdBuilder con el keyword pre-cargado
    setTimeout(() => {
      setCreating(null)
      window.location.href = `/dashboard/ads?keyword=${encodeURIComponent(opp.keyword)}`
    }, 800)
  }

  const topSignal = signals[0]

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Encabezado */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-yellow/15 flex items-center justify-center">
              <Zap size={15} className="text-brand-yellow" />
            </div>
            EarlySignal™
          </h1>
          <p className="text-sm text-brand-muted mt-1">Detector temprano de oportunidades — antes de que exploten</p>
        </div>
        {!loading && signals.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-yellow/10 border border-brand-yellow/30 rounded-xl">
            <span className="w-2 h-2 bg-brand-yellow rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-brand-yellow">{signals.length} ventanas abiertas</span>
          </div>
        )}
      </div>

      {/* Hero — top opportunity */}
      {!loading && topSignal && (
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-yellow/12 via-brand-card to-brand-card border border-brand-yellow/30 rounded-2xl p-6 animate-fade-in">
          {/* Glow decorativo */}
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-brand-yellow/6 blur-3xl pointer-events-none" />

          <div className="relative flex items-start gap-5">
            <ScoreRing score={topSignal.score} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-yellow text-black rounded-full animate-pulse">
                  ⚡ VENTANA ABIERTA
                </span>
                <span className="text-[10px] text-brand-yellow font-medium">
                  #{1} oportunidad detectada
                </span>
              </div>

              <h2 className="text-xl font-bold text-brand-text mb-1">{topSignal.keyword}</h2>
              <p className="text-xs text-brand-muted mb-3">
                Categoría: <span className="text-brand-text">{topSignal.category}</span>
                {topSignal.priceMXN && (
                  <> · Precio est: <span className="text-brand-text font-mono">${topSignal.priceMXN.toLocaleString('es-MX')} MXN</span></>
                )}
              </p>

              <div className="flex items-center gap-3 flex-wrap text-xs mb-4">
                <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg', COMPETITION_CONFIG[topSignal.competition].bg)}>
                  <TrendingUp size={11} className={COMPETITION_CONFIG[topSignal.competition].color} />
                  <span className={COMPETITION_CONFIG[topSignal.competition].color}>
                    Competencia {COMPETITION_CONFIG[topSignal.competition].label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-primary/10">
                  <Clock size={11} className="text-brand-primary" />
                  <span className="text-brand-primary">Ventana ~{topSignal.windowWeeks} semanas</span>
                </div>
                <span className="text-brand-faint">{timeAgo(topSignal.detected_at)}</span>
              </div>

              {/* Señales */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {topSignal.signals.map((s) => {
                  const cfg = SIGNAL_LABELS[s]
                  return (
                    <span key={s} className={cn('text-[10px] px-2 py-0.5 rounded-full bg-brand-hover font-medium', cfg.color)}>
                      {cfg.emoji} {cfg.label}
                    </span>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleCreateCampaign(topSignal)}
                  disabled={creating === topSignal.id}
                  className="flex items-center gap-2 px-4 py-2 btn-gradient text-white rounded-xl text-sm font-semibold disabled:opacity-70"
                >
                  {creating === topSignal.id ? '⏳ Preparando…' : '🚀 Crear campaña ahora'}
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-brand-hover border border-brand-border text-brand-muted rounded-xl text-sm hover:text-brand-text hover:border-brand-primary transition-colors">
                  👀 Monitorear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista completa */}
      <div className="space-y-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <p className="text-xs font-semibold text-brand-faint uppercase tracking-widest px-1">
          Todas las oportunidades detectadas
        </p>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)
        ) : signals.length === 0 ? (
          <div className="text-center py-16 bg-brand-card border border-brand-border rounded-2xl text-brand-faint">
            <Zap size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Sin señales detectadas en este momento.</p>
            <p className="text-xs mt-1">El motor escanea tendencias cada 6 horas.</p>
          </div>
        ) : (
          signals.map((opp, idx) => {
            const compCfg = COMPETITION_CONFIG[opp.competition]
            return (
              <div
                key={opp.id}
                className={cn(
                  'bg-brand-card border rounded-2xl p-4 transition-all hover:border-brand-primary/40',
                  idx === 0 ? 'border-brand-yellow/30' : 'border-brand-border',
                )}
              >
                <div className="flex items-center gap-4">
                  <ScoreRing score={opp.score} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-bold text-brand-text">{opp.keyword}</h3>
                      {idx === 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-brand-yellow text-black rounded-full animate-pulse">
                          ⚡ VENTANA ABIERTA
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-brand-muted mb-2">
                      <span className={cn('px-1.5 py-0.5 rounded-md', compCfg.bg, compCfg.color)}>
                        Competencia {compCfg.label}
                      </span>
                      <span>~{opp.windowWeeks} sem.</span>
                      {opp.priceMXN && <span className="font-mono">${opp.priceMXN.toLocaleString('es-MX')} MXN</span>}
                      <span className="text-brand-faint">{timeAgo(opp.detected_at)}</span>
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      {opp.signals.map((s) => {
                        const cfg = SIGNAL_LABELS[s]
                        return (
                          <span key={s} className={cn('text-[9px] px-1.5 py-0.5 rounded-full bg-brand-hover', cfg.color)}>
                            {cfg.emoji} {cfg.label}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleCreateCampaign(opp)}
                      disabled={creating === opp.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 btn-gradient text-white rounded-xl text-xs font-semibold disabled:opacity-70 whitespace-nowrap"
                    >
                      {creating === opp.id ? '⏳…' : '🚀 Campaña'}
                    </button>
                    <Link
                      href={`/dashboard/trends?q=${encodeURIComponent(opp.keyword)}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-brand-hover border border-brand-border text-brand-muted rounded-xl text-xs hover:text-brand-text transition-colors text-center justify-center"
                    >
                      Ver trend <ChevronRight size={9} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Info footer */}
      <div className="text-center text-xs text-brand-faint animate-fade-in" style={{ animationDelay: '200ms' }}>
        <p>EarlySignal™ escanea tendencias de MercadoLibre, Google y TikTok cada 6 horas.</p>
        <p className="mt-0.5">Solo muestra oportunidades con alta demanda y baja competencia.</p>
      </div>

    </div>
  )
}
