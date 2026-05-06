'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, TrendingUp, Zap, Target, Sparkles, ArrowRight, Clock } from 'lucide-react'
import { TrendCard } from '@/components/trends/TrendCard'
import { cn } from '@/utils'

interface TrendItem {
  keyword:         string
  source:          string
  trend_score:     number
  badge:           string
  is_early_signal: boolean
  total_results:   number
  avg_price:       number
  detected_at:     string
}

interface Opportunity {
  trend:                   string
  score:                   number
  product_idea:            string
  affiliate_network:       string
  estimated_commission_pct: number
  reason:                  string
  urgency:                 'alta' | 'media' | 'baja'
}

type DataSource = 'cache' | 'stale_cache' | 'mock' | 'live'

const sourceLabel: Record<DataSource, { text: string; color: string }> = {
  live:        { text: 'Datos en vivo',    color: 'text-[#00FF88]' },
  cache:       { text: 'Caché actualizada',color: 'text-[#00FF88]' },
  stale_cache: { text: 'Caché antigua',    color: 'text-[#FFB800]' },
  mock:        { text: 'Datos de ejemplo', color: 'text-brand-muted' },
}

export default function TrendsPage() {
  const router = useRouter()
  const [trends, setTrends] = useState<TrendItem[]>([])
  const [source, setSource] = useState<DataSource>('cache')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'EXPLOSIVO' | 'EN ALERTA' | 'ESTABLE'>('all')
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [marketMood, setMarketMood]       = useState('')
  const [topRec, setTopRec]               = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisUpdated, setAnalysisUpdated] = useState<string | null>(null)

  const fetchTrends = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/trends')
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      setTrends(json.data ?? [])
      setSource(json.source ?? 'cache')
    } catch (err) {
      setError('No se pudieron cargar las tendencias. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTrends() }, [fetchTrends])

  const fetchAnalysis = useCallback(async () => {
    setAnalysisLoading(true)
    try {
      const res = await fetch('/api/trends/refresh')
      if (!res.ok) return
      const json = await res.json()
      setOpportunities(json.opportunities ?? [])
      setMarketMood(json.market_mood ?? '')
      setTopRec(json.top_recommendation ?? null)
      setAnalysisUpdated(json.last_updated ?? null)
    } catch {
      // fallo silencioso — tendencias ML siguen mostrándose
    } finally {
      setAnalysisLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnalysis() }, [fetchAnalysis])

  const searchVendors = useCallback(async () => {
    setSearching(true)
    try {
      await fetch('/api/lead-finder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ use_trends: true }),
      })
      router.push('/dashboard/lead-finder')
    } catch {
      router.push('/dashboard/lead-finder')
    }
  }, [router])

  const filtered = filter === 'all'
    ? trends
    : trends.filter((t) => t.badge === filter)

  const earlySignals = trends.filter((t) => t.is_early_signal).length

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={24} className="text-brand-primary" />
            TrendRadar
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Tendencias en tiempo real de MercadoLibre México
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={searchVendors}
            disabled={searching || loading}
            className="flex items-center gap-2 px-4 py-2 btn-gradient text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            <Target size={14} className={cn(searching && 'animate-pulse')} />
            {searching ? 'Buscando...' : 'Buscar vendedores'}
          </button>
          <button
            onClick={fetchTrends}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-sm text-brand-muted hover:text-white hover:border-brand-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1">Total tendencias</p>
          <p className="text-2xl font-bold text-white">{trends.length}</p>
        </div>
        <div className="bg-brand-surface border border-[#00FF88]/30 rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1">Explosivas</p>
          <p className="text-2xl font-bold text-[#00FF88]">
            {trends.filter((t) => t.badge === 'EXPLOSIVO').length}
          </p>
        </div>
        <div className="bg-brand-surface border border-[#FFB800]/30 rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1">En alerta</p>
          <p className="text-2xl font-bold text-[#FFB800]">
            {trends.filter((t) => t.badge === 'EN ALERTA').length}
          </p>
        </div>
        <div className="bg-brand-surface border border-brand-primary/30 rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1 flex items-center gap-1">
            <Zap size={10} className="text-brand-primary" />
            Early signals
          </p>
          <p className="text-2xl font-bold text-brand-primary">{earlySignals}</p>
        </div>
      </div>

      {/* Oportunidades Claude IA */}
      <div className="bg-brand-card border border-brand-primary/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-primary/15 flex items-center justify-center">
              <Sparkles size={13} className="text-brand-primary" />
            </div>
            <h2 className="text-sm font-bold text-brand-text">Oportunidades detectadas por IA</h2>
            {analysisLoading && (
              <span className="text-[10px] text-brand-muted animate-pulse">Analizando…</span>
            )}
          </div>
          {analysisUpdated && (
            <span className="text-[10px] text-brand-faint flex items-center gap-1">
              <Clock size={9} />
              {new Date(analysisUpdated).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {marketMood && (
          <p className="text-xs text-brand-muted italic border-l-2 border-brand-primary/30 pl-3">
            {marketMood}
          </p>
        )}

        {topRec && (
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-green/8 border border-brand-green/20 rounded-xl">
            <Zap size={11} className="text-brand-green shrink-0" />
            <p className="text-xs text-brand-green font-medium">Top rec: {topRec}</p>
          </div>
        )}

        {analysisLoading && opportunities.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse bg-brand-hover rounded-xl" />
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <p className="text-xs text-brand-faint text-center py-4">
            Sin oportunidades detectadas aún. El análisis se actualiza cada hora.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {opportunities.map((op, i) => {
              const urgencyColor = op.urgency === 'alta'
                ? { bg: 'bg-brand-red/15', text: 'text-brand-red', border: 'border-brand-red/25' }
                : op.urgency === 'media'
                ? { bg: 'bg-brand-yellow/15', text: 'text-brand-yellow', border: 'border-brand-yellow/25' }
                : { bg: 'bg-brand-hover', text: 'text-brand-muted', border: 'border-brand-border' }

              return (
                <div key={i} className={cn('rounded-xl border p-3 space-y-2', urgencyColor.border)}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-brand-text leading-tight">{op.product_idea}</p>
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0', urgencyColor.bg, urgencyColor.text)}>
                      {op.urgency}
                    </span>
                  </div>
                  <p className="text-[10px] text-brand-faint">{op.trend}</p>
                  <p className="text-[10px] text-brand-muted leading-relaxed">{op.reason}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-brand-text bg-brand-hover px-1.5 py-0.5 rounded-full">
                        Score {op.score}
                      </span>
                      <span className="text-[9px] text-brand-muted capitalize">
                        {op.affiliate_network === 'mercadolibre' ? '🛒 ML' : '👗 SHEIN'} · {op.estimated_commission_pct}%
                      </span>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/campaigns/new?idea=${encodeURIComponent(op.product_idea)}&network=${op.affiliate_network}`)}
                      className="flex items-center gap-1 text-[9px] text-brand-primary hover:underline"
                    >
                      Crear campaña <ArrowRight size={9} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Fuente de datos */}
      <div className="flex items-center justify-between">
        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'EXPLOSIVO', 'EN ALERTA', 'ESTABLE'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-brand-primary text-white'
                  : 'bg-brand-surface border border-brand-border text-brand-muted hover:text-white'
              )}
            >
              {f === 'all' ? 'Todos' : f}
            </button>
          ))}
        </div>

        {/* Indicador de fuente */}
        {!loading && (
          <span className={cn('text-xs', sourceLabel[source]?.color ?? 'text-brand-muted')}>
            ● {sourceLabel[source]?.text ?? source}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl px-4 py-3 text-sm text-[#FF3B30]">
          {error}
        </div>
      )}

      {/* Grid de tarjetas */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-brand-surface border border-brand-border rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-brand-border rounded mb-3 w-3/4" />
              <div className="h-1.5 bg-brand-border rounded mb-3" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 bg-brand-border rounded-lg" />
                <div className="h-12 bg-brand-border rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-brand-muted">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay tendencias con el filtro seleccionado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((trend) => (
            <TrendCard key={`${trend.keyword}-${trend.source}`} {...trend} />
          ))}
        </div>
      )}
    </div>
  )
}
