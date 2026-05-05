'use client'

// Componente cliente del comparador — maneja toda la interactividad
// Secciones: header · hero · perfil · cards · tabla · reviews · FAQ · urgencia · footer

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Check, X, ChevronDown, ChevronUp, Share2, ShieldCheck, BarChart3, MessageCircle, Zap } from 'lucide-react'
import type { ComparatorProduct, ProductOption } from '@/lib/comparator-data'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function platformColor(p: string) {
  if (p === 'mercadolibre') return { bg: 'bg-yellow-400/15', text: 'text-yellow-400', border: 'border-yellow-400/30' }
  if (p === 'amazon')       return { bg: 'bg-orange-400/15', text: 'text-orange-400', border: 'border-orange-400/30' }
  return                           { bg: 'bg-purple-400/15', text: 'text-purple-400', border: 'border-purple-400/30' }
}

function Stars({ stars, size = 12 }: { stars: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= Math.round(stars) ? '#FFB800' : '#2D3748' }}>★</span>
      ))}
    </span>
  )
}

function TrustBar({ score }: { score: number }) {
  const color = score >= 88 ? '#00FF88' : score >= 75 ? '#FFB800' : '#FF3B30'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-brand-hover rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  product: ComparatorProduct
}

type Profile = 'ahorrador' | 'rapido' | 'premium'

// ─── Componente principal ──────────────────────────────────────────────────────

export function ComparatorClient({ product }: Props) {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [openFaq,         setOpenFaq]         = useState<number | null>(null)
  const [shared,          setShared]          = useState(false)
  const sessionId  = useRef(Math.random().toString(36).slice(2))
  const pageStart  = useRef(Date.now())
  const hoveredRef = useRef(0)

  // Determinar índice recomendado según perfil
  const recommendedIdx = useCallback((): number => {
    if (!selectedProfile) return -1
    const { options } = product
    if (selectedProfile === 'ahorrador') {
      return options.reduce((best, o, i) => o.price < options[best].price ? i : best, 0)
    }
    if (selectedProfile === 'rapido') {
      return options.reduce((best, o, i) => o.delivery_days < options[best].delivery_days ? i : best, 0)
    }
    // premium → mayor trust_score
    return options.reduce((best, o, i) => o.trust_score > options[best].trust_score ? i : best, 0)
  }, [selectedProfile, product])

  // Track click afiliado
  const trackClick = useCallback(async (option: ProductOption) => {
    try {
      await fetch('/api/affiliate-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug:          product.slug,
          platform_chosen:       option.platform,
          affiliate_url_clicked: option.affiliate_url,
          profile_selected:      selectedProfile,
          time_on_page_seconds:  Math.round((Date.now() - pageStart.current) / 1000),
          cards_hovered:         hoveredRef.current,
          faq_opened:            openFaq !== null,
          session_id:            sessionId.current,
          device_type:           window.innerWidth < 768 ? 'mobile' : 'desktop',
        }),
      })
    } catch { /* fire and forget — nunca bloquear la navegación */ }
  }, [product.slug, selectedProfile, openFaq])

  // WhatsApp share
  const handleShare = useCallback(() => {
    const url  = `https://trendpilot.marketing/p/${product.slug}`
    const text = `${product.emoji} ${product.name} — comparé 3 opciones y aquí está lo que encontré: ${url}`
    const wa   = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(wa, '_blank', 'noopener')
    setShared(true)
    setTimeout(() => setShared(false), 2500)
  }, [product])

  const recIdx      = recommendedIdx()
  const minPrice    = Math.min(...product.options.map((o) => o.price))
  const urgentOpt   = product.options.find((o) => o.stock_remaining < 25 && o.price === minPrice)

  // Badges automáticos
  const cheapestIdx  = product.options.reduce((b, o, i) => o.price < product.options[b].price ? i : b, 0)
  const fastestIdx   = product.options.reduce((b, o, i) => o.delivery_days < product.options[b].delivery_days ? i : b, 0)
  const trustedIdx   = product.options.reduce((b, o, i) => o.trust_score > product.options[b].trust_score ? i : b, 0)

  function getBadge(idx: number) {
    if (idx === cheapestIdx)  return { label: 'Mejor precio',     color: '#00FF88' }
    if (idx === fastestIdx)   return { label: 'Entrega más rápida', color: '#0066FF' }
    if (idx === trustedIdx)   return { label: 'Más confiable',    color: '#7C3AED' }
    return null
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-brand-bg/90 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-brand-muted hover:text-brand-text transition-colors shrink-0">
            <ArrowLeft size={16} />
            <span className="text-sm hidden sm:block">Inicio</span>
          </Link>

          <div className="h-5 w-px bg-brand-border mx-1 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp size={15} className="text-brand-primary shrink-0" />
            <span className="text-sm font-semibold truncate">TrendPilot</span>
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {/* Badge neutralidad */}
            <div className="hidden sm:flex items-center gap-1.5 bg-brand-green/10 border border-brand-green/20 rounded-full px-3 py-1">
              <ShieldCheck size={11} className="text-brand-green" />
              <span className="text-[11px] font-semibold text-brand-green">Comparamos sin favoritismos</span>
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-brand-hover hover:bg-brand-border transition-colors border border-brand-border rounded-xl px-3 py-1.5 text-xs font-medium text-brand-muted hover:text-brand-text"
            >
              <Share2 size={12} />
              {shared ? '¡Link copiado!' : 'WhatsApp'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-20">

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <section className="pt-10 pb-8 text-center">
          <div className="text-6xl mb-4">{product.emoji}</div>

          {/* Trend badge */}
          <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/25 rounded-full px-4 py-1.5 mb-4">
            <span className="text-xs font-bold text-brand-primary uppercase tracking-wider">
              🔥 Tendencia #{Math.ceil(100 - product.trend_score)} más buscado hoy
            </span>
            <span className="text-[11px] text-brand-muted">·</span>
            <span className="text-[11px] text-brand-muted">{product.searches_today.toLocaleString('es-MX')} búsquedas</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">{product.name}</h1>
          <p className="text-brand-muted text-base mb-3 max-w-lg mx-auto">{product.description}</p>

          {/* Rango de precio */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-brand-faint text-sm">Desde</span>
            <span className="text-2xl font-black text-brand-green">${minPrice.toLocaleString('es-MX')}</span>
            <span className="text-brand-faint text-sm">hasta</span>
            <span className="text-xl font-bold text-brand-text">${Math.max(...product.options.map((o) => o.price)).toLocaleString('es-MX')}</span>
            <span className="text-brand-faint text-sm">MXN</span>
          </div>

          {/* Disclosure transparente */}
          <div className="inline-flex items-center gap-2 bg-brand-hover border border-brand-border rounded-xl px-4 py-2 text-xs text-brand-muted">
            <span className="text-[13px]">💡</span>
            <span>Ganamos el 25% de comisión cuando compras — <strong className="text-brand-text">comparamos igual aunque no compres</strong></span>
          </div>

          <p className="text-[11px] text-brand-faint mt-2">
            Actualizado: {new Date(product.last_updated).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </section>

        {/* ── SELECTOR DE PERFIL ───────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="text-center mb-5">
            <h2 className="text-lg font-bold text-brand-text">¿Qué tipo de comprador eres?</h2>
            <p className="text-sm text-brand-muted mt-1">Te señalamos cuál es tu mejor opción</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {([
              { id: 'ahorrador' as Profile, emoji: '💰', label: 'Ahorrador', desc: 'Quiero lo más barato que funcione',     color: 'border-brand-green  text-brand-green  bg-brand-green/10' },
              { id: 'rapido'    as Profile, emoji: '⚡', label: 'Urgente',   desc: 'Necesito que llegue lo antes posible', color: 'border-brand-primary text-brand-primary bg-brand-primary/10' },
              { id: 'premium'   as Profile, emoji: '👑', label: 'Premium',   desc: 'Quiero lo más confiable del mercado',  color: 'border-brand-purple text-brand-purple bg-brand-purple/10' },
            ] as const).map(({ id, emoji, label, desc, color }) => (
              <button
                key={id}
                onClick={() => setSelectedProfile(selectedProfile === id ? null : id)}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all duration-200 text-center
                  ${selectedProfile === id
                    ? color
                    : 'border-brand-border text-brand-muted bg-brand-card hover:border-brand-faint hover:text-brand-text'
                  }`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-sm font-bold leading-tight">{label}</span>
                <span className="text-[11px] leading-tight hidden sm:block opacity-80">{desc}</span>
              </button>
            ))}
          </div>
          {selectedProfile && (
            <p className="text-center text-sm text-brand-muted mt-3 animate-fade-in">
              {selectedProfile === 'ahorrador' && '👇 Resaltamos la opción de menor precio'}
              {selectedProfile === 'rapido'    && '👇 Resaltamos la que llega más rápido'}
              {selectedProfile === 'premium'   && '👇 Resaltamos la de mayor reputación y confianza'}
            </p>
          )}
        </section>

        {/* ── TARJETAS DE COMPARACIÓN ──────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-extrabold mb-5 tracking-tight">
            {product.options.length} opciones disponibles hoy
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {product.options.map((option, idx) => {
              const badge      = getBadge(idx)
              const isRec      = recIdx === idx
              const platform   = platformColor(option.platform)
              const savings    = option.original_price ? option.original_price - option.price : 0

              return (
                <div
                  key={option.id}
                  onMouseEnter={() => { hoveredRef.current++ }}
                  className={`relative rounded-2xl border-2 p-5 flex flex-col transition-all duration-300 cursor-default
                    ${isRec
                      ? 'border-brand-green shadow-glow-green bg-brand-green/5 scale-[1.02]'
                      : 'border-brand-border bg-brand-card hover:border-brand-faint'
                    }`}
                >
                  {/* Recommended banner */}
                  {isRec && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-green text-brand-bg text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                      ★ Recomendado para ti
                    </div>
                  )}

                  {/* Badge auto */}
                  {badge && !isRec && (
                    <div className="absolute -top-2.5 right-3 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border"
                      style={{ background: `${badge.color}18`, color: badge.color, borderColor: `${badge.color}40` }}>
                      {badge.label}
                    </div>
                  )}

                  {/* Platform badge */}
                  <div className={`self-start mb-3 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${platform.bg} ${platform.text} ${platform.border}`}>
                    {option.platform_label}
                  </div>

                  {/* Nombre */}
                  <h3 className="font-bold text-base text-brand-text mb-1 leading-tight">{option.name}</h3>
                  <p className="text-[11px] text-brand-faint mb-3">{option.seller_name} · {option.seller_level}</p>

                  {/* Precio */}
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-black text-brand-text">${option.price.toLocaleString('es-MX')}</span>
                    {option.original_price && (
                      <span className="text-sm text-brand-faint line-through">${option.original_price.toLocaleString('es-MX')}</span>
                    )}
                  </div>
                  {savings > 0 && (
                    <div className="text-[11px] text-brand-green font-bold mb-3">
                      Ahorras ${savings.toLocaleString('es-MX')} MXN hoy
                    </div>
                  )}

                  {/* Estrellas */}
                  <div className="flex items-center gap-2 mb-4">
                    <Stars stars={option.stars} size={13} />
                    <span className="text-xs text-brand-muted">{option.stars.toFixed(1)} ({option.reviews_count.toLocaleString('es-MX')})</span>
                  </div>

                  {/* Métricas clave */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-muted">Entrega</span>
                      <span className={`font-semibold ${option.delivery_days === 1 ? 'text-brand-green' : option.delivery_days <= 2 ? 'text-brand-text' : 'text-brand-muted'}`}>
                        {option.delivery_days === 1 ? '⚡ Mañana' : `${option.delivery_days} días`}
                        {option.free_shipping ? ' · Gratis' : ' · Con cargo'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-muted">Stock</span>
                      <span className={`font-semibold ${option.stock_remaining < 20 ? 'text-brand-red' : option.stock_remaining < 50 ? 'text-brand-yellow' : 'text-brand-muted'}`}>
                        {option.stock_remaining} unidades
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-muted">Garantía</span>
                      <span className="text-brand-text font-medium">
                        {option.warranty_months >= 360 ? 'De por vida' : `${option.warranty_months} meses`}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-brand-muted">Confianza</span>
                      </div>
                      <TrustBar score={option.trust_score} />
                    </div>
                  </div>

                  {/* Pros y cons preview */}
                  <div className="space-y-1 mb-5 flex-1">
                    {option.pros.slice(0, 2).map((pro) => (
                      <div key={pro} className="flex items-start gap-1.5 text-[11px] text-brand-muted">
                        <Check size={10} className="text-brand-green mt-0.5 shrink-0" />
                        <span>{pro}</span>
                      </div>
                    ))}
                    {option.cons.slice(0, 1).map((con) => (
                      <div key={con} className="flex items-start gap-1.5 text-[11px] text-brand-red/80">
                        <X size={10} className="mt-0.5 shrink-0 text-brand-red" />
                        <span>{con}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <a
                    href={option.affiliate_url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    onClick={() => trackClick(option)}
                    className={`block w-full text-center py-2.5 rounded-xl text-sm font-bold transition-all duration-150
                      ${isRec
                        ? 'bg-brand-green text-brand-bg hover:brightness-110'
                        : 'bg-brand-hover text-brand-text hover:bg-brand-border border border-brand-border'
                      }`}
                  >
                    Ver en {option.platform_label} →
                  </a>

                  <p className="text-[10px] text-brand-faint text-center mt-2">Link de afiliado · 25% comisión</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── TABLA COMPARATIVA ────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-extrabold mb-5 tracking-tight">Comparación completa</h2>
          <div className="overflow-x-auto rounded-2xl border border-brand-border">
            <table className="w-full min-w-[540px]">
              <thead>
                <tr className="bg-brand-hover">
                  <th className="text-left p-4 text-xs font-bold text-brand-faint uppercase tracking-wider w-36">Característica</th>
                  {product.options.map((o) => (
                    <th key={o.id} className="p-4 text-center text-xs font-bold text-brand-text">{o.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {/* Precio */}
                <tr className="hover:bg-brand-hover/40 transition-colors">
                  <td className="p-4 text-xs text-brand-muted font-medium">Precio</td>
                  {product.options.map((o, i) => (
                    <td key={o.id} className="p-4 text-center">
                      <span className={`text-sm font-bold ${i === cheapestIdx ? 'text-brand-green' : 'text-brand-text'}`}>
                        ${o.price.toLocaleString('es-MX')}
                      </span>
                      {i === cheapestIdx && <div className="text-[10px] text-brand-green">Más barato</div>}
                    </td>
                  ))}
                </tr>
                {/* Envío */}
                <tr className="hover:bg-brand-hover/40 transition-colors">
                  <td className="p-4 text-xs text-brand-muted font-medium">Envío</td>
                  {product.options.map((o, i) => (
                    <td key={o.id} className="p-4 text-center text-xs">
                      <span className={`font-semibold ${i === fastestIdx ? 'text-brand-primary' : 'text-brand-text'}`}>
                        {o.delivery_days === 1 ? 'Mañana' : `${o.delivery_days} días`}
                      </span>
                      <div className={`text-[10px] mt-0.5 ${o.free_shipping ? 'text-brand-green' : 'text-brand-muted'}`}>
                        {o.free_shipping ? 'Envío gratis' : 'Con cargo'}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Reputación */}
                <tr className="hover:bg-brand-hover/40 transition-colors">
                  <td className="p-4 text-xs text-brand-muted font-medium">Reputación</td>
                  {product.options.map((o, i) => (
                    <td key={o.id} className="p-4 text-center">
                      <div className={`text-sm font-bold ${i === trustedIdx ? 'text-brand-purple' : 'text-brand-text'}`}>{o.trust_score}/100</div>
                      <div className="text-[10px] text-brand-faint">{o.seller_level}</div>
                    </td>
                  ))}
                </tr>
                {/* Stars */}
                <tr className="hover:bg-brand-hover/40 transition-colors">
                  <td className="p-4 text-xs text-brand-muted font-medium">Valoración</td>
                  {product.options.map((o) => (
                    <td key={o.id} className="p-4 text-center">
                      <div className="flex justify-center mb-0.5"><Stars stars={o.stars} size={12} /></div>
                      <div className="text-[10px] text-brand-muted">{o.reviews_count.toLocaleString('es-MX')} opiniones</div>
                    </td>
                  ))}
                </tr>
                {/* Garantía */}
                <tr className="hover:bg-brand-hover/40 transition-colors">
                  <td className="p-4 text-xs text-brand-muted font-medium">Garantía</td>
                  {product.options.map((o) => (
                    <td key={o.id} className="p-4 text-center text-xs text-brand-text font-medium">
                      {o.warranty_months >= 360 ? 'De por vida' : `${o.warranty_months} meses`}
                    </td>
                  ))}
                </tr>
                {/* Devoluciones */}
                <tr className="hover:bg-brand-hover/40 transition-colors">
                  <td className="p-4 text-xs text-brand-muted font-medium">Devoluciones</td>
                  {product.options.map((o) => (
                    <td key={o.id} className="p-4 text-center text-xs text-brand-text font-medium">
                      {o.returns_days} días
                    </td>
                  ))}
                </tr>
                {/* Puntos fuertes */}
                <tr className="hover:bg-brand-hover/40 transition-colors">
                  <td className="p-4 text-xs text-brand-muted font-medium align-top">Puntos fuertes</td>
                  {product.options.map((o) => (
                    <td key={o.id} className="p-4 align-top">
                      <ul className="space-y-1.5">
                        {o.pros.slice(0, 3).map((pro) => (
                          <li key={pro} className="flex items-start gap-1.5 text-[11px] text-brand-muted">
                            <Check size={9} className="text-brand-green mt-0.5 shrink-0" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
                {/* Desventajas — sección más importante para la confianza */}
                <tr className="bg-red-950/10 hover:bg-red-950/20 transition-colors">
                  <td className="p-4 text-xs text-brand-red font-bold align-top">Desventajas reales</td>
                  {product.options.map((o) => (
                    <td key={o.id} className="p-4 align-top">
                      <ul className="space-y-1.5">
                        {o.cons.map((con) => (
                          <li key={con} className="flex items-start gap-1.5 text-[11px] text-brand-red/80">
                            <X size={9} className="mt-0.5 shrink-0 text-brand-red" />
                            {con}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-brand-faint text-center mt-3">
            Las desventajas son reales — extraídas de opiniones de compradores verificados
          </p>
        </section>

        {/* ── URGENCIA ÉTICA ───────────────────────────────────────────────── */}
        {urgentOpt && (
          <section className="mb-10">
            <div className="bg-brand-yellow/8 border border-brand-yellow/25 rounded-2xl p-5 flex items-center gap-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <p className="text-sm font-bold text-brand-yellow">
                  Solo quedan {urgentOpt.stock_remaining} unidades al precio más bajo
                </p>
                <p className="text-xs text-brand-muted mt-0.5">
                  El {urgentOpt.name} a ${urgentOpt.price.toLocaleString('es-MX')} MXN tiene stock limitado.
                  Dato basado en inventario real de {urgentOpt.platform_label} — no es presión artificial.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── OPINIONES ────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-extrabold tracking-tight">Opiniones sin filtrar</h2>
            <div className="flex items-center gap-1.5 text-[11px] text-brand-muted bg-brand-hover border border-brand-border rounded-full px-3 py-1">
              <ShieldCheck size={10} className="text-brand-green" />
              <span>Solo compradores verificados</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {product.reviews.map((review, idx) => (
              <div key={idx} className="bg-brand-card border border-brand-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {review.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-brand-text">{review.user}</p>
                      <p className="text-[10px] text-brand-faint">{review.option_name}</p>
                    </div>
                  </div>
                  <Stars stars={review.stars} size={12} />
                </div>
                <p className="text-sm text-brand-muted leading-relaxed mb-3 italic">&ldquo;{review.text}&rdquo;</p>
                <div className="flex items-center justify-between text-[10px] text-brand-faint">
                  <span className="flex items-center gap-1">
                    {review.verified && <span className="text-brand-green">✓ Compra verificada</span>}
                    {' · '}{review.platform}
                  </span>
                  <span>{new Date(review.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                </div>
                {review.helpful > 0 && (
                  <p className="text-[10px] text-brand-faint mt-1">{review.helpful} personas encontraron esto útil</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-brand-faint text-center mt-4">
            Incluimos opiniones críticas y negativas — son las más útiles para decidir
          </p>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-extrabold mb-5 tracking-tight">Preguntas frecuentes</h2>
          <div className="space-y-2">
            {product.faq.map((item, idx) => (
              <div key={idx} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => {
                    setOpenFaq(openFaq === idx ? null : idx)
                    void fetch('/api/affiliate-click', {
                      method:  'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body:    JSON.stringify({ product_slug: product.slug, faq_opened: true, session_id: sessionId.current }),
                    }).catch(() => {})
                  }}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-brand-hover transition-colors"
                >
                  <span className="text-sm font-semibold text-brand-text pr-4">{item.q}</span>
                  {openFaq === idx
                    ? <ChevronUp size={16} className="text-brand-primary shrink-0" />
                    : <ChevronDown size={16} className="text-brand-muted shrink-0" />
                  }
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-brand-muted leading-relaxed border-t border-brand-border pt-4 animate-fade-in">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER DE CONFIANZA ──────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: ShieldCheck,    color: 'text-brand-green',   label: 'Sin favoritismos',       desc: 'Comparamos igual, ganes o no' },
              { icon: MessageCircle,  color: 'text-brand-yellow',  label: 'Opiniones sin filtrar',   desc: 'Incluimos las malas también' },
              { icon: BarChart3,      color: 'text-brand-primary', label: 'Datos en tiempo real',    desc: 'Precios actualizados diario' },
              { icon: Zap,            color: 'text-brand-purple',  label: 'Comisión transparente',   desc: '25% solo si compras — lo decimos' },
            ].map(({ icon: Icon, color, label, desc }) => (
              <div key={label} className="bg-brand-card border border-brand-border rounded-2xl p-4 text-center">
                <Icon size={20} className={`${color} mx-auto mb-2`} />
                <p className="text-xs font-bold text-brand-text mb-1">{label}</p>
                <p className="text-[10px] text-brand-faint leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
        <section className="text-center mb-10">
          <p className="text-brand-muted text-sm mb-4">¿Encontraste lo que buscabas?</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 bg-[#25D366] hover:brightness-110 transition-all text-white px-5 py-2.5 rounded-xl text-sm font-bold"
            >
              <Share2 size={14} />
              Compartir por WhatsApp
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-brand-hover border border-brand-border text-brand-text px-5 py-2.5 rounded-xl text-sm font-medium hover:border-brand-primary transition-colors"
            >
              Ver más productos →
            </Link>
          </div>
        </section>

      </main>

      {/* ── FOOTER MINI ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-brand-border py-6 text-center">
        <p className="text-[11px] text-brand-faint">
          TrendPilot — Automatia Negocios Inteligentes · México · Comisiones declaradas siempre
        </p>
        <p className="text-[10px] text-brand-faint mt-1">
          Este sitio puede recibir compensación por los links. Lo declaramos porque creemos en la transparencia.
        </p>
      </footer>
    </div>
  )
}
