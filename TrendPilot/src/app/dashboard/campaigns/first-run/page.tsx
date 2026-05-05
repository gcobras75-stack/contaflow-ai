'use client'

// Panel de lanzamiento — 5 primeras campañas afiliadas
// Solo superadmin | Sesión 18

import { useState } from 'react'

// Datos de las 5 campañas afiliadas
const CAMPAIGNS = [
  {
    slug:        'airfryer-sin-aceite',
    name:        'Freidora de Aire Sin Aceite',
    emoji:       '🥘',
    category:    'Hogar y Cocina',
    scoreP:      91,
    scoreA:      88,
    minPrice:    799,
    headline:    'Fríe sin aceite desde $799 MXN',
    audience:    'Mujeres 25-45 · cocina saludable · MX',
    image:       'https://placehold.co/400x400/0A1628/00FF88?text=🥘+Airfryer',
    comparator:  'https://trendpilot.marketing/p/airfryer-sin-aceite',
  },
  {
    slug:        'smartwatch-deportivo',
    name:        'Smartwatch Deportivo',
    emoji:       '⌚',
    category:    'Electrónicos',
    scoreP:      87,
    scoreA:      82,
    minPrice:    499,
    headline:    'Smartwatch desde $499 — Compara',
    audience:    'Hombres y mujeres 18-40 · fitness · MX',
    image:       'https://placehold.co/400x400/0A1628/0066FF?text=⌚+Smartwatch',
    comparator:  'https://trendpilot.marketing/p/smartwatch-deportivo',
  },
  {
    slug:        'teclado-mecanico-gamer',
    name:        'Teclado Mecánico Gamer',
    emoji:       '🎮',
    category:    'Gaming y Tecnología',
    scoreP:      83,
    scoreA:      79,
    minPrice:    549,
    headline:    'Teclado Mecánico desde $549',
    audience:    'Hombres 16-35 · gamers · MX',
    image:       'https://placehold.co/400x400/0A1628/FFB800?text=🎮+Teclado',
    comparator:  'https://trendpilot.marketing/p/teclado-mecanico-gamer',
  },
  {
    slug:        'suero-vitamina-c',
    name:        'Suero Vitamina C Facial',
    emoji:       '✨',
    category:    'Belleza y Cuidado',
    scoreP:      78,
    scoreA:      74,
    minPrice:    279,
    headline:    'Suero Vitamina C desde $279',
    audience:    'Mujeres 22-45 · skincare · MX',
    image:       'https://placehold.co/400x400/0A1628/FF69B4?text=✨+Vitamina+C',
    comparator:  'https://trendpilot.marketing/p/suero-vitamina-c',
  },
  {
    slug:        'gps-mascotas',
    name:        'GPS para Mascotas',
    emoji:       '🐾',
    category:    'Mascotas y Tecnología',
    scoreP:      72,
    scoreA:      68,
    minPrice:    399,
    headline:    'GPS para tu perro desde $399',
    audience:    'Dueños de mascotas 25-50 · MX',
    image:       'https://placehold.co/400x400/0A1628/00CED1?text=🐾+GPS+Mascota',
    comparator:  'https://trendpilot.marketing/p/gps-mascotas',
  },
]

type Status = 'paused' | 'launching' | 'active' | 'error'

export default function FirstRunPage() {
  const [statuses,    setStatuses]    = useState<Record<string, Status>>(
    Object.fromEntries(CAMPAIGNS.map((c) => [c.slug, 'paused']))
  )
  const [globalBusy,  setGlobalBusy]  = useState(false)
  const [globalDone,  setGlobalDone]  = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Activa una sola campaña en Meta
  async function activateOne(slug: string) {
    setStatuses((p) => ({ ...p, [slug]: 'launching' }))
    try {
      const res = await fetch('/api/affiliate/launch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ platform: 'meta', slug }),
      })
      setStatuses((p) => ({ ...p, [slug]: res.ok ? 'active' : 'error' }))
    } catch {
      setStatuses((p) => ({ ...p, [slug]: 'error' }))
    }
  }

  // Activa todas las campañas
  async function activateAll() {
    setGlobalBusy(true)
    setGlobalError(null)
    setStatuses(Object.fromEntries(CAMPAIGNS.map((c) => [c.slug, 'launching'])))
    try {
      const res = await fetch('/api/affiliate/launch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ platform: 'all' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatuses(Object.fromEntries(CAMPAIGNS.map((c) => [c.slug, 'active'])))
      setGlobalDone(true)
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Error desconocido')
      setStatuses(Object.fromEntries(CAMPAIGNS.map((c) => [c.slug, 'error'])))
    } finally {
      setGlobalBusy(false)
    }
  }

  const allActive = CAMPAIGNS.every((c) => statuses[c.slug] === 'active')

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono bg-[#0066FF]/20 text-[#0066FF] px-2 py-0.5 rounded uppercase tracking-wider">
                Superadmin
              </span>
              <span className="text-[10px] text-white/30">Sesión 18 · Super Afiliado</span>
            </div>
            <h1 className="text-xl font-bold">🚀 Primera Corrida — 5 Campañas Afiliadas</h1>
            <p className="text-sm text-white/40 mt-0.5">
              TrendRadar detectó estos productos trending en México. Páginas comparadoras en vivo.
            </p>
          </div>

          {/* Botón global */}
          <button
            onClick={activateAll}
            disabled={globalBusy || allActive}
            className={`shrink-0 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              allActive
                ? 'bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 cursor-default'
                : globalBusy
                ? 'bg-[#0066FF]/40 text-white/50 cursor-not-allowed'
                : 'bg-[#0066FF] hover:bg-[#0055DD] text-white active:scale-95 shadow-lg shadow-[#0066FF]/30'
            }`}
          >
            {allActive ? '✓ Todas activas' : globalBusy ? 'Activando…' : '🚀 ACTIVAR TODAS LAS CAMPAÑAS'}
          </button>
        </div>
      </div>

      {/* Alertas globales */}
      <div className="max-w-5xl mx-auto px-6 pt-4 space-y-2">
        {globalError && (
          <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl px-4 py-3 text-[#FF3B30] text-sm">
            ⚠️ Error al activar: {globalError}
          </div>
        )}
        {globalDone && (
          <div className="bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl px-4 py-3 text-[#00FF88] text-sm flex items-center gap-2">
            ✅ <span>Campañas activadas. WhatsApp enviado a Antonio (+526675039081).</span>
          </div>
        )}
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Campañas',       value: '5',     color: 'text-[#0066FF]' },
          { label: 'Score promedio', value: '82',    color: 'text-[#00FF88]' },
          { label: 'Plataformas',    value: '3',     color: 'text-[#FFB800]' },
          { label: 'Presupuesto',    value: '$8,400', color: 'text-white'    },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Cards de campañas ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pt-6 pb-10 space-y-4">
        {CAMPAIGNS.map((c) => {
          const status = statuses[c.slug]
          return (
            <div
              key={c.slug}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col sm:flex-row"
            >
              {/* Imagen */}
              <div className="sm:w-36 sm:h-auto h-32 shrink-0 relative overflow-hidden bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt={c.name}
                  className="w-full h-full object-cover"
                />
                {/* Badge status sobre imagen */}
                <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  status === 'active'   ? 'bg-[#00FF88] text-[#0A1628]' :
                  status === 'launching'? 'bg-[#FFB800] text-[#0A1628] animate-pulse' :
                  status === 'error'    ? 'bg-[#FF3B30] text-white' :
                                          'bg-white/20 text-white'
                }`}>
                  {status === 'active'    ? '● ACTIVA'    :
                   status === 'launching' ? '● ACTIVANDO' :
                   status === 'error'     ? '● ERROR'     :
                                           '● PAUSADA'}
                </div>
              </div>

              {/* Contenido */}
              <div className="flex-1 p-5 flex flex-col sm:flex-row gap-4 justify-between">
                {/* Info */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-white">{c.emoji} {c.name}</h2>
                    <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{c.category}</span>
                  </div>
                  <p className="text-sm text-[#0066FF] font-medium">{c.headline}</p>
                  <p className="text-xs text-white/40">{c.audience}</p>
                  <p className="text-xs text-white/30">Desde <span className="text-white/60 font-semibold">${c.minPrice} MXN</span></p>

                  {/* Scores */}
                  <div className="flex gap-2 pt-1">
                    <span className="text-[10px] bg-[#0066FF]/15 text-[#0066FF] px-2 py-0.5 rounded-full">
                      Producto {c.scoreP}/100
                    </span>
                    <span className="text-[10px] bg-[#00FF88]/10 text-[#00FF88] px-2 py-0.5 rounded-full">
                      Afiliado {c.scoreA}/100
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex sm:flex-col gap-2 sm:items-end justify-start shrink-0">
                  {/* Activar en Meta */}
                  <button
                    onClick={() => activateOne(c.slug)}
                    disabled={status !== 'paused' && status !== 'error'}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      status === 'active'
                        ? 'bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 cursor-default'
                        : status === 'launching'
                        ? 'bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/30 cursor-not-allowed'
                        : 'bg-[#1877F2]/20 hover:bg-[#1877F2]/30 text-[#1877F2] border border-[#1877F2]/30 active:scale-95'
                    }`}
                  >
                    {status === 'active'    ? '✓ Meta activa'    :
                     status === 'launching' ? '⏳ Activando…'    :
                                             '📘 ACTIVAR EN META'}
                  </button>

                  {/* Ver página */}
                  <a
                    href={c.comparator}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all whitespace-nowrap text-center"
                  >
                    Ver página →
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Instrucciones ─────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pb-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 grid sm:grid-cols-3 gap-5 text-xs text-white/50">
          <div className="space-y-1.5">
            <p className="text-[#1877F2] font-semibold">📘 Meta Ads</p>
            <p>Conecta META_ADS_ACCESS_TOKEN en Vercel para activar campañas reales.</p>
            <p>Sin token → modo mock (sin costo).</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[#FF004F] font-semibold">🎵 TikTok Ads</p>
            <p>Descarga <code className="bg-white/10 px-1 rounded">docs/tiktok-campaigns-ready.json</code></p>
            <p>Sube manualmente en ads.tiktok.com</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[#4285F4] font-semibold">🛒 Google Shopping</p>
            <p>Descarga <code className="bg-white/10 px-1 rounded">docs/google-merchant-feed.xml</code></p>
            <p>Sube en merchants.google.com</p>
          </div>
        </div>
      </div>

    </div>
  )
}
