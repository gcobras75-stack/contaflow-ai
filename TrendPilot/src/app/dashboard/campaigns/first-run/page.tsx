'use client'

// Panel de lanzamiento — 5 primeras campañas afiliadas
// Solo superadmin | Sesión 18-19

import { useState } from 'react'

const CAMPAIGNS = [
  { slug: 'airfryer-sin-aceite',    name: 'Airfryer Sin Aceite',    emoji: '🥘', category: 'Hogar y Cocina',          scoreP: 91, scoreA: 88, minPrice: 799,  image: 'https://placehold.co/400x400/0A1628/00FF88?text=🥘', comparator: 'https://trendpilot.marketing/p/airfryer-sin-aceite' },
  { slug: 'smartwatch-deportivo',   name: 'Smartwatch Deportivo',   emoji: '⌚', category: 'Electrónicos',             scoreP: 87, scoreA: 82, minPrice: 499,  image: 'https://placehold.co/400x400/0A1628/0066FF?text=⌚', comparator: 'https://trendpilot.marketing/p/smartwatch-deportivo' },
  { slug: 'teclado-mecanico-gamer', name: 'Teclado Mecánico Gamer', emoji: '🎮', category: 'Gaming y Tecnología',      scoreP: 83, scoreA: 79, minPrice: 549,  image: 'https://placehold.co/400x400/0A1628/FFB800?text=🎮', comparator: 'https://trendpilot.marketing/p/teclado-mecanico-gamer' },
  { slug: 'suero-vitamina-c',       name: 'Suero Vitamina C',       emoji: '✨', category: 'Belleza y Cuidado',        scoreP: 78, scoreA: 74, minPrice: 279,  image: 'https://placehold.co/400x400/0A1628/FF69B4?text=✨', comparator: 'https://trendpilot.marketing/p/suero-vitamina-c' },
  { slug: 'gps-mascotas',           name: 'GPS para Mascotas',      emoji: '🐾', category: 'Mascotas y Tecnología',   scoreP: 72, scoreA: 68, minPrice: 399,  image: 'https://placehold.co/400x400/0A1628/00CED1?text=🐾', comparator: 'https://trendpilot.marketing/p/gps-mascotas' },
]

const WA_COMMANDS = [
  { cmd: 'campañas',        desc: 'Estado de todas las campañas' },
  { cmd: 'ver 1',           desc: 'Detalle de campaña número 1' },
  { cmd: 'activar 3',       desc: 'Activa la campaña 3 en Meta' },
  { cmd: 'pausar 2',        desc: 'Pausa la campaña 2' },
  { cmd: 'activar todas',   desc: 'Activa todas las pausadas' },
  { cmd: 'pausar todas',    desc: 'Pausa todas las activas' },
  { cmd: 'presupuesto 1 200', desc: 'Cambia presupuesto de campaña 1 a $200/día' },
  { cmd: 'comisiones',      desc: 'Finanzas del día' },
  { cmd: 'tendencias',      desc: 'Top productos en tendencia' },
  { cmd: 'campaña aretes',  desc: 'Crea nueva campaña para ese producto' },
  { cmd: 'ayuda',           desc: 'Lista completa de comandos' },
]

type Status = 'paused' | 'launching' | 'active' | 'error'

export default function FirstRunPage() {
  const [statuses,    setStatuses]    = useState<Record<string, Status>>(
    Object.fromEntries(CAMPAIGNS.map((c) => [c.slug, 'paused']))
  )
  const [globalBusy,  setGlobalBusy]  = useState(false)
  const [globalDone,  setGlobalDone]  = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [waSending,   setWaSending]   = useState(false)
  const [waSent,      setWaSent]      = useState(false)

  async function activateOne(slug: string) {
    setStatuses((p) => ({ ...p, [slug]: 'launching' }))
    try {
      const res = await fetch('/api/affiliate/launch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'meta', slug }),
      })
      setStatuses((p) => ({ ...p, [slug]: res.ok ? 'active' : 'error' }))
    } catch {
      setStatuses((p) => ({ ...p, [slug]: 'error' }))
    }
  }

  async function activateAll() {
    setGlobalBusy(true)
    setGlobalError(null)
    setStatuses(Object.fromEntries(CAMPAIGNS.map((c) => [c.slug, 'launching'])))
    try {
      const res = await fetch('/api/affiliate/launch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'all' }),
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

  async function sendHelpToWhatsApp() {
    setWaSending(true)
    try {
      await fetch('/api/whatsapp/send-help', { method: 'POST' })
      setWaSent(true)
    } finally {
      setWaSending(false)
    }
  }

  const allActive = CAMPAIGNS.every((c) => statuses[c.slug] === 'active')

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-start justify-between gap-4 max-w-5xl mx-auto">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono bg-[#0066FF]/20 text-[#0066FF] px-2 py-0.5 rounded uppercase tracking-wider">Superadmin</span>
              <span className="text-[10px] text-white/30">Sesión 18 · Super Afiliado</span>
            </div>
            <h1 className="text-xl font-bold">🚀 Primera Corrida — 5 Campañas Afiliadas</h1>
            <p className="text-sm text-white/40 mt-0.5">TrendRadar detectó estos productos trending en México. Páginas comparadoras en vivo.</p>
          </div>

          {/* Botón global ACTIVAR TODAS */}
          <button
            onClick={activateAll}
            disabled={globalBusy || allActive}
            className={`shrink-0 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              allActive  ? 'bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 cursor-default'
              : globalBusy ? 'bg-[#0066FF]/40 text-white/50 cursor-not-allowed'
              : 'bg-[#0066FF] hover:bg-[#0055DD] text-white active:scale-95 shadow-lg shadow-[#0066FF]/30'
            }`}
          >
            {allActive ? '✓ Todas activas' : globalBusy ? 'Activando…' : '🚀 ACTIVAR TODAS LAS CAMPAÑAS'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 space-y-6 pt-5 pb-12">

        {/* Alertas */}
        {globalError && (
          <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl px-4 py-3 text-[#FF3B30] text-sm">⚠️ Error: {globalError}</div>
        )}
        {globalDone && (
          <div className="bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl px-4 py-3 text-[#00FF88] text-sm flex items-center gap-2">
            ✅ <span>Campañas activadas. WhatsApp enviado a Antonio (+526675039081).</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Campañas',       value: '5',      color: 'text-[#0066FF]' },
            { label: 'Score promedio', value: '82',     color: 'text-[#00FF88]' },
            { label: 'Plataformas',    value: '3',      color: 'text-[#FFB800]' },
            { label: 'Presupuesto',    value: '$8,400', color: 'text-white'     },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Cards de campañas ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          {CAMPAIGNS.map((c, i) => {
            const status = statuses[c.slug]
            return (
              <div key={c.slug} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col sm:flex-row">
                {/* Imagen */}
                <div className="sm:w-32 h-28 sm:h-auto shrink-0 relative overflow-hidden bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                  <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    status === 'active'    ? 'bg-[#00FF88] text-[#0A1628]'
                    : status === 'launching' ? 'bg-[#FFB800] text-[#0A1628] animate-pulse'
                    : status === 'error'   ? 'bg-[#FF3B30] text-white'
                    : 'bg-white/20 text-white'
                  }`}>
                    {status === 'active' ? '● ACTIVA' : status === 'launching' ? '● ACTIVANDO' : status === 'error' ? '● ERROR' : '● PAUSADA'}
                  </div>
                  <div className="absolute bottom-2 left-2 text-[10px] text-white/50 bg-black/40 px-1.5 py-0.5 rounded font-mono">
                    #{i + 1}
                  </div>
                </div>

                {/* Contenido */}
                <div className="flex-1 p-4 flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-white">{c.emoji} {c.name}</h2>
                      <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{c.category}</span>
                    </div>
                    <p className="text-xs text-white/40">Desde <span className="text-white/60 font-semibold">${c.minPrice} MXN</span></p>
                    <div className="flex gap-2 pt-0.5">
                      <span className="text-[10px] bg-[#0066FF]/15 text-[#0066FF] px-2 py-0.5 rounded-full">Producto {c.scoreP}/100</span>
                      <span className="text-[10px] bg-[#00FF88]/10 text-[#00FF88] px-2 py-0.5 rounded-full">Afiliado {c.scoreA}/100</span>
                    </div>
                    <p className="text-[10px] text-white/30 font-mono">WA: activar {i + 1} · pausar {i + 1} · ver {i + 1}</p>
                  </div>

                  <div className="flex sm:flex-col gap-2 sm:items-end shrink-0">
                    <button
                      onClick={() => activateOne(c.slug)}
                      disabled={status !== 'paused' && status !== 'error'}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                        status === 'active'    ? 'bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 cursor-default'
                        : status === 'launching' ? 'bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/30 cursor-not-allowed'
                        : 'bg-[#1877F2]/20 hover:bg-[#1877F2]/30 text-[#1877F2] border border-[#1877F2]/30 active:scale-95'
                      }`}
                    >
                      {status === 'active' ? '✓ Meta activa' : status === 'launching' ? '⏳ Activando…' : '📘 ACTIVAR EN META'}
                    </button>
                    <a href={c.comparator} target="_blank" rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all whitespace-nowrap text-center">
                      Ver página →
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Control por WhatsApp ───────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span>📱</span> Control por WhatsApp
              </h3>
              <p className="text-xs text-white/40 mt-0.5">
                Envía comandos al número de TrendPilot desde tu celular
              </p>
            </div>

            {/* Botón enviar comandos */}
            <button
              onClick={sendHelpToWhatsApp}
              disabled={waSending || waSent}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                waSent    ? 'bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 cursor-default'
                : waSending ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 active:scale-95'
              }`}
            >
              {waSent ? '✓ Enviado' : waSending ? 'Enviando…' : '📩 Enviarme los comandos'}
            </button>
          </div>

          <div className="p-5 grid sm:grid-cols-2 gap-2">
            {WA_COMMANDS.map((item) => (
              <div key={item.cmd} className="flex items-start gap-3 py-1.5">
                <code className="text-xs bg-[#0066FF]/10 text-[#0066FF] px-2 py-1 rounded font-mono whitespace-nowrap shrink-0">
                  {item.cmd}
                </code>
                <span className="text-xs text-white/50 pt-0.5">{item.desc}</span>
              </div>
            ))}
          </div>

          <div className="px-5 pb-4 pt-0">
            <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl p-4">
              <p className="text-xs text-[#25D366] font-semibold mb-1">Webhook configurado en:</p>
              <code className="text-xs text-white/60 font-mono">trendpilot.marketing/api/whatsapp/webhook</code>
              <p className="text-[10px] text-white/30 mt-2">Solo acepta mensajes de +526675039081 · Validado con firma Twilio</p>
            </div>
          </div>
        </div>

        {/* ── Instrucciones ──────────────────────────────────────────────────── */}
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
