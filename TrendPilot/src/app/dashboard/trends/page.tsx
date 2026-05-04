'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, TrendingUp, Zap } from 'lucide-react'
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

type DataSource = 'cache' | 'stale_cache' | 'mock' | 'live'

const sourceLabel: Record<DataSource, { text: string; color: string }> = {
  live:        { text: 'Datos en vivo',    color: 'text-[#00FF88]' },
  cache:       { text: 'Caché actualizada',color: 'text-[#00FF88]' },
  stale_cache: { text: 'Caché antigua',    color: 'text-[#FFB800]' },
  mock:        { text: 'Datos de ejemplo', color: 'text-brand-muted' },
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrendItem[]>([])
  const [source, setSource] = useState<DataSource>('cache')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'EXPLOSIVO' | 'EN ALERTA' | 'ESTABLE'>('all')

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
        <button
          onClick={fetchTrends}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-sm text-brand-muted hover:text-white hover:border-brand-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          Actualizar
        </button>
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
