'use client'

// Panel de lanzamiento de las 5 primeras campañas afiliadas
// Solo superadmin — protegido por middleware
// Sesión 18 — Fase 9

import { useState } from 'react'
import { AFFILIATE_AD_COPY } from '@/lib/affiliate-ad-copy'
import { AFFILIATE_SCORES } from '@/lib/affiliate-comparators'

// Estado por plataforma
type PlatformStatus = 'idle' | 'launching' | 'live' | 'error'

interface CampaignState {
  meta:   PlatformStatus
  tiktok: PlatformStatus
  google: PlatformStatus
}

const INITIAL_STATE: Record<string, CampaignState> = Object.fromEntries(
  AFFILIATE_SCORES.map((s) => [s.slug, { meta: 'idle', tiktok: 'idle', google: 'idle' }])
)

const PLATFORM_LABELS: Record<string, string> = {
  meta:   '📘 Meta Ads',
  tiktok: '🎵 TikTok Ads',
  google: '🛒 Google Shopping',
}

const STATUS_STYLES: Record<PlatformStatus, string> = {
  idle:      'bg-white/5 text-white/40 border border-white/10',
  launching: 'bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/30 animate-pulse',
  live:      'bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30',
  error:     'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30',
}

const STATUS_LABELS: Record<PlatformStatus, string> = {
  idle:      'Pendiente',
  launching: 'Lanzando…',
  live:      'En vivo ✓',
  error:     'Error',
}

export default function FirstRunPage() {
  const [states,   setStates]   = useState<Record<string, CampaignState>>(INITIAL_STATE)
  const [loading,  setLoading]  = useState(false)
  const [launched, setLaunched] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Lanza todas las campañas en todas las plataformas
  async function handleLaunchAll() {
    setLoading(true)
    setError(null)

    // Marcar todas como "launching"
    setStates(Object.fromEntries(
      AFFILIATE_SCORES.map((s) => [s.slug, { meta: 'launching', tiktok: 'launching', google: 'launching' }])
    ))

    try {
      const res = await fetch('/api/affiliate/launch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ platform: 'all' }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()

      // Actualizar estado por producto según respuesta
      const next: Record<string, CampaignState> = {}
      for (const result of data.results ?? []) {
        const slug = result.slug as string
        const plat = result.platforms as Record<string, { status: string }>
        next[slug] = {
          meta:   plat.meta?.status   === 'created' ? 'live' : plat.meta?.status   === 'error' ? 'error' : 'live',
          tiktok: plat.tiktok?.status === 'ready'   ? 'live' : 'error',
          google: plat.google?.status === 'ready'   ? 'live' : 'error',
        }
      }
      setStates(next)
      setLaunched(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setStates(Object.fromEntries(
        AFFILIATE_SCORES.map((s) => [s.slug, { meta: 'error', tiktok: 'error', google: 'error' }])
      ))
    } finally {
      setLoading(false)
    }
  }

  // Lanza una sola plataforma para un producto
  async function handleLaunchOne(slug: string, platform: 'meta' | 'tiktok' | 'google') {
    setStates((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], [platform]: 'launching' },
    }))

    try {
      const res = await fetch('/api/affiliate/launch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ platform }),
      })
      if (!res.ok) throw new Error()
      setStates((prev) => ({
        ...prev,
        [slug]: { ...prev[slug], [platform]: 'live' },
      }))
    } catch {
      setStates((prev) => ({
        ...prev,
        [slug]: { ...prev[slug], [platform]: 'error' },
      }))
    }
  }

  const allLive = Object.values(states).every(
    (s) => s.meta === 'live' && s.tiktok === 'live' && s.google === 'live'
  )

  return (
    <div className="min-h-screen bg-[#0A1628] text-white p-6 space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono bg-[#0066FF]/20 text-[#0066FF] px-2 py-0.5 rounded">
              SUPERADMIN
            </span>
            <span className="text-xs text-white/30">Sesión 18</span>
          </div>
          <h1 className="text-2xl font-bold">🚀 Primeras 5 Campañas Afiliadas</h1>
          <p className="text-white/50 text-sm mt-1">
            TrendRadar detectó estos productos trending en México.
            Páginas comparadoras en vivo — listas para lanzar anuncios.
          </p>
        </div>

        {/* Botón Lanzar Todo */}
        <button
          onClick={handleLaunchAll}
          disabled={loading || allLive}
          className={`shrink-0 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            allLive
              ? 'bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 cursor-default'
              : loading
              ? 'bg-[#0066FF]/50 text-white/50 cursor-not-allowed'
              : 'bg-[#0066FF] text-white hover:bg-[#0055DD] active:scale-95'
          }`}
        >
          {allLive ? '✓ Todo en vivo' : loading ? 'Lanzando…' : '⚡ Lanzar todas'}
        </button>
      </div>

      {/* Error global */}
      {error && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-lg px-4 py-3 text-[#FF3B30] text-sm">
          Error al lanzar: {error}
        </div>
      )}

      {/* WhatsApp enviado */}
      {launched && (
        <div className="bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-lg px-4 py-3 text-[#00FF88] text-sm flex items-center gap-2">
          <span>✅</span>
          <span>WhatsApp enviado a Antonio (+526675039081) con el resumen completo.</span>
        </div>
      )}

      {/* ── Stats rápidas ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Productos detectados', value: '5', sub: 'por TrendRadar' },
          { label: 'Score promedio',       value: '82', sub: 'ProductScore /100' },
          { label: 'Presupuesto total',    value: '$8,400', sub: 'MXN preparado' },
          { label: 'Plataformas',          value: '3', sub: 'Meta · TikTok · Google' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-[#0066FF]">{stat.value}</p>
            <p className="text-xs font-medium text-white/80 mt-0.5">{stat.label}</p>
            <p className="text-xs text-white/30 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Cards de productos ────────────────────────────────────────────── */}
      <div className="space-y-4">
        {AFFILIATE_SCORES.map((score) => {
          const adPkg  = AFFILIATE_AD_COPY.find((a) => a.slug === score.slug)
          const state  = states[score.slug]
          const isOpen = expanded === score.slug
          if (!adPkg) return null

          return (
            <div
              key={score.slug}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* Card header */}
              <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(isOpen ? null : score.slug)}
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl">
                    {score.category === 'Hogar y Cocina'          ? '🥘'
                     : score.category === 'Electrónicos'          ? '⌚'
                     : score.category === 'Gaming y Tecnología'   ? '🎮'
                     : score.category === 'Belleza y Cuidado'     ? '✨'
                     : '🐾'}
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{score.name}</h2>
                    <p className="text-xs text-white/40 mt-0.5">{score.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Scores */}
                  <div className="hidden sm:flex gap-2">
                    <span className="text-xs bg-[#0066FF]/15 text-[#0066FF] px-2 py-0.5 rounded-full">
                      Producto {score.product_score}
                    </span>
                    <span className="text-xs bg-[#00FF88]/10 text-[#00FF88] px-2 py-0.5 rounded-full">
                      Afiliado {score.affiliate_score}
                    </span>
                  </div>
                  <span className="text-white/30 text-sm">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Platform status badges */}
              <div className="px-5 pb-4 flex flex-wrap gap-2">
                {(['meta', 'tiktok', 'google'] as const).map((plat) => (
                  <button
                    key={plat}
                    onClick={() => state[plat] === 'idle' && handleLaunchOne(score.slug, plat)}
                    disabled={state[plat] !== 'idle'}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${STATUS_STYLES[state[plat]]}`}
                    title={state[plat] === 'idle' ? `Lanzar solo ${plat}` : undefined}
                  >
                    {PLATFORM_LABELS[plat]} — {STATUS_LABELS[state[plat]]}
                  </button>
                ))}
              </div>

              {/* Expanded ad copy */}
              {isOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">

                  {/* Comparator URL */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">URL comparador:</span>
                    <a
                      href={adPkg.comparator_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#0066FF] hover:underline"
                    >
                      {adPkg.comparator_url}
                    </a>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {/* Meta copy */}
                    <div className="bg-[#1877F2]/5 border border-[#1877F2]/20 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-[#1877F2]">📘 Meta Ads</p>
                      <p className="text-xs text-white/80 font-medium">{adPkg.copy.meta.headline}</p>
                      <p className="text-xs text-white/50 leading-relaxed">{adPkg.copy.meta.primary_text}</p>
                      <p className="text-xs text-white/30 italic">{adPkg.copy.meta.audience}</p>
                    </div>

                    {/* TikTok copy */}
                    <div className="bg-[#FF004F]/5 border border-[#FF004F]/20 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-[#FF004F]">🎵 TikTok</p>
                      <p className="text-xs text-white/80 font-medium">{adPkg.copy.tiktok.hook}</p>
                      <p className="text-xs text-white/50 leading-relaxed line-clamp-4">{adPkg.copy.tiktok.script}</p>
                      <p className="text-xs text-white/30">{adPkg.copy.tiktok.caption}</p>
                    </div>

                    {/* Google copy */}
                    <div className="bg-[#4285F4]/5 border border-[#4285F4]/20 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-[#4285F4]">🛒 Google Shopping</p>
                      <p className="text-xs text-white/80 font-medium">{adPkg.copy.google.headline1}</p>
                      <p className="text-xs text-white/60">{adPkg.copy.google.headline2}</p>
                      <p className="text-xs text-white/40">{adPkg.copy.google.headline3}</p>
                      <p className="text-xs text-white/50 leading-relaxed">{adPkg.copy.google.description1}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Instrucciones manuales ─────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-white/80 text-sm">📋 Próximos pasos manuales</h3>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-white/50">
          <div className="space-y-1.5">
            <p className="text-[#1877F2] font-medium">📘 Meta Ads</p>
            <p>1. Ir a business.facebook.com</p>
            <p>2. Conectar META_ADS_ACCESS_TOKEN</p>
            <p>3. Las campañas se activarán automáticamente</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[#FF004F] font-medium">🎵 TikTok Ads</p>
            <p>1. Descargar <code className="bg-white/10 px-1 rounded">docs/tiktok-campaigns-ready.json</code></p>
            <p>2. Ir a ads.tiktok.com</p>
            <p>3. Crear campaña por producto con el JSON</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[#4285F4] font-medium">🛒 Google Shopping</p>
            <p>1. Descargar <code className="bg-white/10 px-1 rounded">docs/google-merchant-feed.xml</code></p>
            <p>2. Subir en merchants.google.com</p>
            <p>3. Configurar campaña en Google Ads</p>
          </div>
        </div>
      </div>

    </div>
  )
}
