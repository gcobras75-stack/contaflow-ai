'use client'

import { useEffect, useState, useCallback } from 'react'
import { Eye, Plus, Trash2, ExternalLink, TrendingUp, AlertCircle, Play, Image, Layers, Smartphone } from 'lucide-react'
import { cn } from '@/utils'

interface Competitor {
  id:               string
  name:             string
  description:      string | null
  platform_url:     string | null
  estimated_vendors: number | null
  active_campaigns:  number | null
  top_products:     Record<string, unknown> | null
  weekly_changes:   Record<string, unknown> | null
  last_analyzed_at: string | null
  created_at:       string
}

// Mock competidores con análisis
const MOCK_COMPETITORS: Competitor[] = [
  {
    id:               '1',
    name:             'Flipomart',
    description:      'Plataforma de afiliados con modelo similar — comisión 30%',
    platform_url:     'https://flipomart.mx',
    estimated_vendors: 120,
    active_campaigns:  45,
    top_products:     { products: ['Bolsas ecológicas', 'Suplementos', 'Accesorios tech'], changes: 'Lanzaron campaña de verano en Meta' },
    weekly_changes:   { new: ['Accesorios deportivos', 'Cremas naturales'], removed: [], price_changes: 3 },
    last_analyzed_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    created_at:       new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
  },
  {
    id:               '2',
    name:             'VentaRocket MX',
    description:      'Dropshipping automatizado — sin comisión, modelo de suscripción',
    platform_url:     'https://ventarocket.com.mx',
    estimated_vendors: 340,
    active_campaigns:  98,
    top_products:     { products: ['Gadgets electrónicos', 'Ropa deportiva', 'Juguetes'], changes: 'Lanzaron integración con TikTok Shop' },
    weekly_changes:   { new: ['Drones mini', 'Pulseras fitness'], removed: ['Candados inteligentes'], price_changes: 7 },
    last_analyzed_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    created_at:       new Date(Date.now() - 45 * 24 * 3600000).toISOString(),
  },
  {
    id:               '3',
    name:             'MercaAfilia',
    description:      'Afiliados de MercadoLibre con dashboard básico',
    platform_url:     'https://mercaafilia.com',
    estimated_vendors: 85,
    active_campaigns:  22,
    top_products:     { products: ['Moda femenina', 'Cosméticos', 'Hogar'], changes: 'Sin movimientos relevantes esta semana' },
    weekly_changes:   { new: [], removed: [], price_changes: 1 },
    last_analyzed_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    created_at:       new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
  },
]

function timeAgo(iso: string | null) {
  if (!iso) return 'nunca'
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} hr`
  return `hace ${Math.floor(diff / 86400)} días`
}

export default function MarketSpyPage() {
  const [competitors,   setCompetitors]   = useState<Competitor[]>([])
  const [loading,       setLoading]       = useState(true)
  const [addForm,       setAddForm]       = useState(false)
  const [newName,       setNewName]       = useState('')
  const [newUrl,        setNewUrl]        = useState('')
  const [newDesc,       setNewDesc]       = useState('')
  const [adding,        setAdding]        = useState(false)
  const [msg,           setMsg]           = useState<string | null>(null)
  const [adsModal,      setAdsModal]      = useState<Competitor | null>(null)
  const [competitorAds, setCompetitorAds] = useState<MotionAd[]>([])
  const [loadingAds,    setLoadingAds]    = useState(false)

  interface MotionAd {
    id: string; brand: string; headline: string; description: string
    cta: string; format: string; days_running: number; ctr_estimate: number; mock?: boolean
  }

  const fetchCompetitors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/competitors')
      if (res.ok) {
        const json = await res.json()
        const list = json.data ?? []
        setCompetitors(list.length > 0 ? list : MOCK_COMPETITORS)
      } else {
        setCompetitors(MOCK_COMPETITORS)
      }
    } catch {
      setCompetitors(MOCK_COMPETITORS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCompetitors() }, [fetchCompetitors])

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/competitors', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: newName, platform_url: newUrl, description: newDesc }),
      })
      if (res.ok) {
        setMsg('Competidor agregado.')
        setAddForm(false); setNewName(''); setNewUrl(''); setNewDesc('')
        fetchCompetitors()
      }
    } catch { /* noop */ }
    finally { setAdding(false); setTimeout(() => setMsg(null), 3000) }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/competitors?id=${id}`, { method: 'DELETE' })
    setCompetitors((prev) => prev.filter((c) => c.id !== id))
  }

  async function handleViewAds(comp: Competitor) {
    setAdsModal(comp)
    setLoadingAds(true)
    setCompetitorAds([])
    try {
      const domain = comp.platform_url
        ? new URL(comp.platform_url.startsWith('http') ? comp.platform_url : `https://${comp.platform_url}`).hostname
        : comp.name.toLowerCase().replace(/\s/g, '') + '.com'
      const res = await fetch(`/api/analytics/competitor-ads?domain=${encodeURIComponent(domain)}`)
      if (res.ok) {
        const json = await res.json()
        setCompetitorAds(json.ads ?? [])
      }
    } catch { /* silencioso */ }
    finally { setLoadingAds(false) }
  }

  const formatIcon = (f: string) => {
    if (f === 'video')    return <Play    size={14} className="text-brand-primary" />
    if (f === 'carousel') return <Layers  size={14} className="text-brand-yellow" />
    if (f === 'stories')  return <Smartphone size={14} className="text-brand-green" />
    return <Image size={14} className="text-brand-muted" />
  }

  // Calcular total de movimientos esta semana
  const totalMovements = competitors.reduce((s, c) => {
    const wc = c.weekly_changes as { new?: string[]; removed?: string[]; price_changes?: number } | null
    if (!wc) return s
    return s + (wc.new?.length ?? 0) + (wc.removed?.length ?? 0) + (wc.price_changes ?? 0)
  }, 0)

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Encabezado */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
              <Eye size={15} className="text-brand-primary" />
            </div>
            MarketSpy
          </h1>
          <p className="text-sm text-brand-muted mt-1">Inteligencia competitiva — monitoreo 24/7</p>
        </div>
        <button
          onClick={() => setAddForm((v) => !v)}
          className="btn-gradient flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold"
        >
          <Plus size={14} /> Agregar competidor
        </button>
      </div>

      {/* Resumen semanal */}
      {totalMovements > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-brand-yellow/8 border border-brand-yellow/25 rounded-xl animate-fade-in">
          <AlertCircle size={14} className="text-brand-yellow shrink-0" />
          <p className="text-sm text-brand-yellow">
            🕵️ <strong>MarketSpy</strong> detectó <strong>{totalMovements} movimientos</strong> de competencia esta semana
          </p>
        </div>
      )}

      {/* Form agregar */}
      {addForm && (
        <div className="bg-brand-card border border-brand-primary/25 rounded-2xl p-5 space-y-3 animate-scale-in">
          <p className="text-sm font-semibold text-brand-text">Agregar competidor</p>
          {msg && <p className="text-xs text-brand-green">{msg}</p>}
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del competidor *"
            className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary transition-colors" />
          <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
            placeholder="URL de la plataforma (opcional)"
            className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary transition-colors" />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Descripción breve (opcional)"
            className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary transition-colors" />
          <div className="flex gap-3">
            <button onClick={() => setAddForm(false)} className="px-4 py-2 bg-brand-hover text-brand-text rounded-xl text-sm hover:bg-brand-border transition-colors">Cancelar</button>
            <button onClick={handleAdd} disabled={adding || !newName.trim()}
              className="px-4 py-2 btn-gradient text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {adding ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de competidores */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 skeleton rounded-2xl" />)
        ) : competitors.length === 0 ? (
          <div className="text-center py-16 text-brand-faint bg-brand-card border border-brand-border rounded-2xl">
            <Eye size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm mb-2">Sin competidores monitoreados.</p>
            <button onClick={() => setAddForm(true)} className="text-xs text-brand-primary hover:underline">+ Agregar el primero</button>
          </div>
        ) : (
          competitors.map((comp) => {
            const tp = comp.top_products as { products?: string[]; changes?: string } | null
            const wc = comp.weekly_changes as { new?: string[]; removed?: string[]; price_changes?: number } | null
            const moves = (wc?.new?.length ?? 0) + (wc?.removed?.length ?? 0) + (wc?.price_changes ?? 0)

            return (
              <div key={comp.id} className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-brand-text">{comp.name}</h3>
                      {moves > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-yellow/15 text-brand-yellow animate-pulse">
                          {moves} movs.
                        </span>
                      )}
                    </div>
                    {comp.description && <p className="text-xs text-brand-muted">{comp.description}</p>}
                    {comp.platform_url && (
                      <a href={comp.platform_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-brand-primary hover:underline mt-1">
                        <ExternalLink size={9} /> {comp.platform_url}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-brand-faint">Análisis: {timeAgo(comp.last_analyzed_at)}</span>
                    <button onClick={() => handleDelete(comp.id)}
                      className="p-1.5 rounded-lg hover:bg-brand-red/10 text-brand-faint hover:text-brand-red transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Vendors est.', value: comp.estimated_vendors ?? '?', icon: '👥' },
                    { label: 'Campañas activas', value: comp.active_campaigns ?? '?', icon: '📣' },
                    { label: 'Nuevos productos', value: wc?.new?.length ?? 0, icon: '🆕', highlight: (wc?.new?.length ?? 0) > 0 },
                    { label: 'Cambios de precio', value: wc?.price_changes ?? 0, icon: '💰', highlight: (wc?.price_changes ?? 0) > 3 },
                  ].map((stat) => (
                    <div key={stat.label} className={cn('rounded-xl p-3', stat.highlight ? 'bg-brand-yellow/8 border border-brand-yellow/20' : 'bg-brand-hover')}>
                      <p className="text-sm">{stat.icon}</p>
                      <p className={cn('text-lg font-bold font-mono mt-1', stat.highlight ? 'text-brand-yellow' : 'text-brand-text')}>{stat.value}</p>
                      <p className="text-[10px] text-brand-faint">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Productos detectados */}
                {tp?.products && tp.products.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest flex items-center gap-1">
                      <TrendingUp size={10} /> Productos promoviendo esta semana
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tp.products.map((p) => (
                        <span key={p} className="text-[10px] px-2 py-0.5 bg-brand-hover rounded-full text-brand-muted">{p}</span>
                      ))}
                      {wc?.new && wc.new.map((p) => (
                        <span key={p} className="text-[10px] px-2 py-0.5 bg-brand-yellow/10 rounded-full text-brand-yellow border border-brand-yellow/20">
                          🆕 {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Última novedad */}
                {tp?.changes && (
                  <p className="text-[10px] text-brand-muted bg-brand-hover rounded-lg px-3 py-2">
                    📋 {tp.changes}
                  </p>
                )}

                {/* Botón Motion — Ver anuncios activos */}
                <button
                  onClick={() => handleViewAds(comp)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-xs font-semibold text-brand-primary hover:bg-brand-primary/20 transition-colors"
                >
                  <Eye size={12} /> Ver sus anuncios activos — Motion
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* ─── Modal: anuncios de competidor ──────────────────────────────── */}
      {adsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setAdsModal(null) }}
        >
          <div className="bg-brand-card border border-brand-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-brand-border shrink-0">
              <div>
                <h3 className="text-sm font-bold text-brand-text">
                  Anuncios activos — {adsModal.name}
                </h3>
                <p className="text-[10px] text-brand-faint mt-0.5">
                  Más días activo = más efectivo. Datos vía Motion.
                </p>
              </div>
              <button
                onClick={() => setAdsModal(null)}
                className="p-2 rounded-lg hover:bg-brand-hover text-brand-faint hover:text-brand-text transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div className="overflow-y-auto p-5 space-y-3">
              {loadingAds
                ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)
                : competitorAds.length === 0
                  ? (
                    <div className="text-center py-12 text-brand-faint">
                      <Eye size={28} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Sin anuncios detectados</p>
                    </div>
                  )
                  : competitorAds.map((ad) => (
                    <div key={ad.id} className="bg-brand-hover border border-brand-border rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-card border border-brand-border flex items-center justify-center shrink-0">
                          {formatIcon(ad.format)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-brand-text leading-tight">{ad.headline}</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-brand-primary/15 text-brand-primary rounded-full shrink-0 font-mono">
                              {ad.days_running}d activo
                            </span>
                          </div>
                          <p className="text-[10px] text-brand-muted mt-1 leading-relaxed line-clamp-2">{ad.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[9px] px-2 py-0.5 bg-brand-hover border border-brand-border rounded-full text-brand-faint font-bold">
                              {ad.cta}
                            </span>
                            <span className="text-[9px] text-brand-faint">{ad.ctr_estimate}% CTR est.</span>
                            {ad.mock && <span className="text-[9px] text-brand-yellow">DEMO</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
