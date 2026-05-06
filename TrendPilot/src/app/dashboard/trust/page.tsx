'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Shield, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/utils'
import { calculateTrustScore, TRUST_LEVELS, getTrustLevel } from '@/lib/trustscore'
import type { TrustScoreBreakdown, TrustLevel } from '@/lib/trustscore'

interface VendorWithTrust {
  id:          string
  name:        string
  email:       string
  trust_score: number
  total_sales: number
  created_at:  string
  plan:        string
  breakdown?:  TrustScoreBreakdown
}

// ─── Donut chart SVG ─────────────────────────────────────────────────────────

function DonutChart({ score, level, size = 120 }: { score: number; level: TrustLevel; size?: number }) {
  const cfg      = TRUST_LEVELS[level]
  const radius   = 45
  const circ     = 2 * Math.PI * radius
  const filled   = (score / 100) * circ

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120" className="-rotate-90">
        {/* Track */}
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-brand-border" />
        {/* Progress */}
        <circle
          cx="60" cy="60" r={radius} fill="none" strokeWidth="10"
          stroke="currentColor"
          className={cfg.color}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold tabular-nums leading-none', size >= 100 ? 'text-2xl' : 'text-sm', cfg.color)}>
          {score}
        </span>
        <span className="text-[9px] text-brand-faint mt-0.5">/100</span>
      </div>
    </div>
  )
}

// ─── Mock vendors para cuando la API no tiene datos ───────────────────────────

const MOCK_VENDORS: VendorWithTrust[] = [
  { id: '1', name: 'Artes Mexicanas SA',   email: 'artes@mail.com',   trust_score: 72, total_sales: 3_200_000, created_at: new Date(Date.now() - 7 * 30 * 24 * 3600 * 1000).toISOString(), plan: 'piloto' },
  { id: '2', name: 'Moda Sustentable MX',  email: 'moda@mail.com',    trust_score: 91, total_sales: 8_500_000, created_at: new Date(Date.now() - 14 * 30 * 24 * 3600 * 1000).toISOString(), plan: 'comandante' },
  { id: '3', name: 'Suplementos Vitales',  email: 'supl@mail.com',    trust_score: 55, total_sales: 900_000,   created_at: new Date(Date.now() - 2 * 30 * 24 * 3600 * 1000).toISOString(), plan: 'despegue' },
  { id: '4', name: 'Tech Gadgets CDMX',    email: 'tech@mail.com',    trust_score: 38, total_sales: 250_000,   created_at: new Date(Date.now() - 1 * 30 * 24 * 3600 * 1000).toISOString(), plan: 'despegue' },
  { id: '5', name: 'Joyería Artesanal GDL',email: 'joya@mail.com',    trust_score: 85, total_sales: 5_100_000, created_at: new Date(Date.now() - 10 * 30 * 24 * 3600 * 1000).toISOString(), plan: 'piloto' },
]

export default function TrustScorePage() {
  const [vendors, setVendors]       = useState<VendorWithTrust[]>([])
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [levelFilter, setLevelFilter] = useState<TrustLevel | 'all'>('all')

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/vendors?limit=100')
      if (res.ok) {
        const json = await res.json()
        const list: VendorWithTrust[] = (json.data ?? []).map((v: VendorWithTrust) => ({
          ...v,
          breakdown: calculateTrustScore(v),
        }))
        setVendors(list.length > 0 ? list : MOCK_VENDORS.map((v) => ({ ...v, breakdown: calculateTrustScore(v) })))
      } else {
        setVendors(MOCK_VENDORS.map((v) => ({ ...v, breakdown: calculateTrustScore(v) })))
      }
    } catch {
      setVendors(MOCK_VENDORS.map((v) => ({ ...v, breakdown: calculateTrustScore(v) })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchVendors() }, [fetchVendors])

  const vendorsWithBreakdown = vendors.map((v) => ({
    ...v,
    breakdown: v.breakdown ?? calculateTrustScore(v),
  }))

  const filtered = levelFilter === 'all'
    ? vendorsWithBreakdown
    : vendorsWithBreakdown.filter((v) => v.breakdown.level === levelFilter)

  // KPIs
  const avg   = vendors.length ? Math.round(vendors.reduce((s, v) => s + v.trust_score, 0) / vendors.length) : 0
  const diam  = vendors.filter((v) => getTrustLevel(v.trust_score) === 'diamante').length
  const elite = vendors.filter((v) => getTrustLevel(v.trust_score) === 'elite').length
  const risk  = vendors.filter((v) => getTrustLevel(v.trust_score) === 'nuevo').length

  const FACTORS_META = [
    { key: 'history',   emoji: '📦', label: 'Historial' },
    { key: 'response',  emoji: '⏱️',  label: 'Respuesta' },
    { key: 'sales',     emoji: '💰', label: 'Ventas' },
    { key: 'seniority', emoji: '📅', label: 'Antigüedad' },
  ]

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Encabezado */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
            <Shield size={15} className="text-brand-primary" />
          </div>
          TrustScore
        </h1>
        <p className="text-sm text-brand-muted mt-1">Reputación automática de vendedores — 4 factores</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '60ms' }}>
        {[
          { label: 'Score promedio',    value: avg,              suffix: '/100', color: 'text-brand-primary' },
          { label: '💎 Diamante',       value: diam,             suffix: ' vendors', color: 'text-[#0066FF]' },
          { label: '🥇 Elite',          value: elite,            suffix: ' vendors', color: 'text-[#00FF88]' },
          { label: '🔴 Riesgo (Nuevo)', value: risk,             suffix: ' vendors', color: 'text-brand-red' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-brand-card border border-brand-border rounded-2xl p-5">
            <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className={cn('text-2xl font-bold font-mono', kpi.color)}>
              {loading ? '—' : kpi.value}
              <span className="text-sm font-normal text-brand-faint ml-1">{kpi.suffix}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Niveles leyenda */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <p className="text-xs font-semibold text-brand-faint uppercase tracking-widest mb-4">Niveles de TrustScore</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.entries(TRUST_LEVELS) as [TrustLevel, typeof TRUST_LEVELS[TrustLevel]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setLevelFilter(levelFilter === key ? 'all' : key)}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                cfg.bg, cfg.border,
                levelFilter === key && 'ring-2 ring-offset-2 ring-offset-brand-card',
                cfg.ring,
              )}
            >
              <p className="text-base mb-1">{cfg.emoji}</p>
              <p className={cn('text-xs font-bold', cfg.color)}>{cfg.label}</p>
              <p className="text-[10px] text-brand-faint mt-0.5">Comisión: {cfg.commission}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de vendors */}
      <div className="space-y-3 animate-fade-in" style={{ animationDelay: '150ms' }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-brand-faint uppercase tracking-widest">
            {filtered.length} vendedor{filtered.length !== 1 ? 'es' : ''}
            {levelFilter !== 'all' && ` — ${TRUST_LEVELS[levelFilter].emoji} ${TRUST_LEVELS[levelFilter].label}`}
          </p>
          {levelFilter !== 'all' && (
            <button onClick={() => setLevelFilter('all')} className="text-xs text-brand-primary hover:underline">
              Ver todos
            </button>
          )}
        </div>

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-2xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-brand-faint">
            <Shield size={28} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No hay vendors en este nivel.</p>
          </div>
        ) : (
          filtered.map((vendor) => {
            const bd    = vendor.breakdown!
            const cfg   = TRUST_LEVELS[bd.level]
            const isExp = expanded === vendor.id

            return (
              <div key={vendor.id} className={cn('rounded-2xl border overflow-hidden', cfg.bg, cfg.border)}>
                <button
                  onClick={() => setExpanded(isExp ? null : vendor.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:opacity-90 transition-opacity"
                >
                  {/* Donut mini */}
                  <DonutChart score={bd.total} level={bd.level} size={56} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-brand-text truncate">{vendor.name}</p>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full border', cfg.bg, cfg.border, cfg.color)}>
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-brand-faint">{vendor.email}</p>
                    {cfg.maxBudget && (
                      <p className="text-[10px] text-brand-yellow mt-0.5">Límite de presupuesto: {cfg.maxBudget}</p>
                    )}
                  </div>

                  {/* Factors mini */}
                  <div className="hidden md:flex gap-3 items-center">
                    {FACTORS_META.map((f) => {
                      const factor = bd[f.key as keyof typeof bd] as { score: number; max: number } | undefined
                      if (!factor || typeof factor !== 'object' || !('score' in factor)) return null
                      const pct = Math.round((factor.score / factor.max) * 100)
                      const c   = pct >= 75 ? 'text-brand-green' : pct >= 50 ? 'text-brand-yellow' : 'text-brand-red'
                      return (
                        <div key={f.key} className="text-center">
                          <p className="text-base">{f.emoji}</p>
                          <p className={cn('text-xs font-bold font-mono', c)}>{factor.score}</p>
                          <p className="text-[9px] text-brand-faint">/{factor.max}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Expand */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/vendors/${vendor.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg hover:bg-brand-border transition-colors text-brand-faint hover:text-brand-text"
                    >
                      <ChevronRight size={14} />
                    </Link>
                    {isExp ? <ChevronUp size={14} className="text-brand-faint" /> : <ChevronDown size={14} className="text-brand-faint" />}
                  </div>
                </button>

                {/* Breakdown expandido */}
                {isExp && (
                  <div className="border-t border-brand-border/40 px-4 pb-4 pt-3 space-y-3">
                    <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">Desglose de factores</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {FACTORS_META.map((f) => {
                        const factor = bd[f.key as keyof typeof bd] as { score: number; max: number; label: string; reason: string } | undefined
                        if (!factor || typeof factor !== 'object' || !('score' in factor)) return null
                        const pct = Math.round((factor.score / factor.max) * 100)
                        const barColor = pct >= 75 ? 'bg-brand-green' : pct >= 50 ? 'bg-brand-yellow' : 'bg-brand-red'
                        return (
                          <div key={f.key} className="bg-brand-card/60 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-brand-text">{f.emoji} {factor.label}</span>
                              <span className="text-xs font-bold font-mono text-brand-text">{factor.score}/{factor.max}</span>
                            </div>
                            <div className="h-1.5 bg-brand-hover rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[10px] text-brand-muted leading-relaxed">{factor.reason}</p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Cómo mejorar */}
                    <div className="bg-brand-primary/5 border border-brand-primary/15 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-brand-primary mb-1.5">💡 Cómo mejorar tu TrustScore</p>
                      <ul className="text-[10px] text-brand-muted space-y-0.5">
                        {bd.history.score < 28 && <li>• Completa más ventas para mejorar tu historial de entregas</li>}
                        {bd.response.score < 20 && <li>• Responde mensajes en menos de 2 horas para ganar puntos de respuesta</li>}
                        {bd.sales.score < 18 && <li>• Genera más ventas para aumentar tu puntuación de ventas</li>}
                        {bd.seniority.score < 10 && <li>• El score mejora automáticamente con el tiempo en la plataforma</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
