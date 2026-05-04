'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Target, Flame, CheckCircle, AlertCircle, XCircle,
  RefreshCw, Send, Eye, UserPlus, Copy, ExternalLink,
  Zap, TrendingUp, MapPin, ShoppingBag, Search,
} from 'lucide-react'
import { cn } from '@/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type LeadTemp   = 'hot' | 'warm' | 'cold'
type LeadStatus = 'new' | 'contacted' | 'responded' | 'converted' | 'discarded'
type LeadSource = 'ml' | 'maps' | 'manual'
type Channel    = 'whatsapp' | 'email' | 'ml'

interface Lead {
  id:                string
  source:            LeadSource
  seller_id:         string
  seller_name:       string
  seller_nickname:   string
  product_name:      string
  product_url?:      string | null
  product_thumbnail?:string | null
  product_price:     number   // centavos
  estimated_sales:   number
  ml_level?:         string | null
  city?:             string | null
  lead_score:        number
  lead_temperature:  LeadTemp
  status:            LeadStatus
  contact_channel?:  Channel | null
  trend_keyword?:    string | null
  proposal_text?:    string | null
  proposal_sent_at?: string | null
  response_text?:    string | null
  created_at:        string
}

interface Stats {
  total:     number
  hot:       number
  warm:      number
  contacted: number
  responded: number
  today:     number
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

const tempConfig: Record<LeadTemp, { label: string; icon: React.ElementType; color: string; bg: string; bar: string }> = {
  hot:  { label: '🔥 Caliente', icon: Flame,        color: 'text-[#FF6B35]', bg: 'bg-[#FF6B35]/10 border-[#FF6B35]/30', bar: 'bg-gradient-to-r from-[#FF6B35] to-[#FF3B30]' },
  warm: { label: '✅ Bueno',    icon: CheckCircle,   color: 'text-brand-green', bg: 'bg-brand-green/10 border-brand-green/30', bar: 'bg-brand-green' },
  cold: { label: '⚠️ Tibio',   icon: AlertCircle,   color: 'text-brand-yellow', bg: 'bg-brand-yellow/10 border-brand-yellow/30', bar: 'bg-brand-yellow' },
}

const statusConfig: Record<LeadStatus, { label: string; color: string }> = {
  new:       { label: 'Nuevo',      color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/30' },
  contacted: { label: 'Contactado', color: 'text-brand-yellow bg-brand-yellow/10 border-brand-yellow/30' },
  responded: { label: 'Respondió',  color: 'text-brand-green bg-brand-green/10 border-brand-green/30' },
  converted: { label: 'Convertido', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  discarded: { label: 'Descartado', color: 'text-brand-muted bg-brand-hover border-brand-border' },
}

const sourceConfig: Record<LeadSource, { label: string; icon: string }> = {
  ml:     { label: 'MercadoLibre', icon: '🛒' },
  maps:   { label: 'Google Maps',  icon: '📍' },
  manual: { label: 'Manual',       icon: '✏️' },
}

function fmtPrice(cents: number) {
  if (!cents) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(cents / 100)
}

function fmtSales(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function LeadFinderPage() {
  const [leads,      setLeads]      = useState<Lead[]>([])
  const [stats,      setStats]      = useState<Stats>({ total: 0, hot: 0, warm: 0, contacted: 0, responded: 0, today: 0 })
  const [loading,    setLoading]    = useState(true)
  const [searching,  setSearching]  = useState(false)
  const [filterTemp, setFilterTemp] = useState<LeadTemp | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all')
  const [filterSource, setFilterSource] = useState<LeadSource | 'all'>('all')

  // Modal de propuesta
  const [proposalModal, setProposalModal] = useState<Lead | null>(null)
  const [channel,       setChannel]       = useState<Channel>('whatsapp')
  const [proposal,      setProposal]      = useState('')
  const [generating,    setGenerating]    = useState(false)
  const [sending,       setSending]       = useState(false)

  // Modal de detalle
  const [detailModal,   setDetailModal]  = useState<Lead | null>(null)

  // ── Fetch leads ──────────────────────────────────────────────────────────

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (filterTemp   !== 'all') params.set('temperature', filterTemp)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterSource !== 'all') params.set('source', filterSource)

      const res = await fetch(`/api/lead-finder?${params}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      setLeads(json.data ?? [])
      if (json.stats) setStats(json.stats)
    } catch {
      // si no hay datos, usar mock vacío
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [filterTemp, filterStatus, filterSource])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // ── Buscar prospectos ────────────────────────────────────────────────────

  async function runSearch(useMock = false) {
    setSearching(true)
    try {
      const res = await fetch('/api/lead-finder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ use_trends: true, use_mock: useMock }),
      })
      const json = await res.json()
      if (json.ok) await fetchLeads()
    } finally {
      setSearching(false)
    }
  }

  // ── Generar propuesta ────────────────────────────────────────────────────

  async function generateProposalForLead(lead: Lead, ch: Channel) {
    setGenerating(true)
    try {
      const res = await fetch(`/api/lead-finder/${lead.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ generate_proposal: true, contact_channel: ch }),
      })
      const json = await res.json()
      setProposal(json.data?.proposal_text ?? '')
    } finally {
      setGenerating(false)
    }
  }

  async function sendProposal(lead: Lead) {
    setSending(true)
    try {
      await fetch(`/api/lead-finder/${lead.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ send_proposal: true, proposal_text: proposal, contact_channel: channel }),
      })
      setProposalModal(null)
      await fetchLeads()
    } finally {
      setSending(false)
    }
  }

  async function discardLead(id: string) {
    await fetch(`/api/lead-finder/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'discarded' }),
    })
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status: 'discarded' } : l))
  }

  // ── Filtros activos ──────────────────────────────────────────────────────
  const visible = leads.filter((l) => {
    if (filterTemp   !== 'all' && l.lead_temperature !== filterTemp)   return false
    if (filterStatus !== 'all' && l.status           !== filterStatus) return false
    if (filterSource !== 'all' && l.source           !== filterSource) return false
    return true
  })

  return (
    <div className="space-y-6 max-w-[1100px]">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
              <Target size={15} className="text-brand-primary" />
            </div>
            LeadFinder™
          </h1>
          <p className="text-sm text-brand-muted mt-1">Encuentra y contacta vendedores automáticamente</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => runSearch(true)}
            disabled={searching}
            className="flex items-center gap-2 px-3 py-2 bg-brand-hover border border-brand-border text-brand-muted rounded-xl text-xs hover:text-brand-text transition-colors disabled:opacity-50"
          >
            {searching ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
            Mock
          </button>
          <button
            onClick={() => runSearch(false)}
            disabled={searching}
            className="btn-gradient flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {searching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            {searching ? 'Buscando…' : 'Buscar prospectos'}
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
        <div className="bg-brand-card border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1">Hoy encontrados</p>
          <p className="text-2xl font-bold font-mono text-brand-text">{stats.today}</p>
        </div>
        <div className="bg-[#FF6B35]/5 border border-[#FF6B35]/20 rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1">🔥 Calientes</p>
          <p className="text-2xl font-bold font-mono text-[#FF6B35]">{stats.hot}</p>
        </div>
        <div className="bg-brand-green/5 border border-brand-green/20 rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1">✅ Buenos</p>
          <p className="text-2xl font-bold font-mono text-brand-green">{stats.warm}</p>
        </div>
        <div className="bg-brand-card border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1">Propuestas enviadas</p>
          <p className="text-2xl font-bold font-mono text-brand-text">{stats.contacted}</p>
        </div>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 animate-fade-in" style={{ animationDelay: '60ms' }}>
        {/* Temperatura */}
        {(['all', 'hot', 'warm', 'cold'] as const).map((t) => (
          <button key={t} onClick={() => setFilterTemp(t)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              filterTemp === t ? 'bg-brand-primary/15 border-brand-primary text-brand-primary' : 'bg-brand-card border-brand-border text-brand-muted hover:text-brand-text'
            )}>
            {t === 'all' ? 'Todos' : tempConfig[t].label}
          </button>
        ))}
        <div className="w-px bg-brand-border mx-1" />
        {(['all', 'new', 'contacted', 'responded', 'converted'] as const).map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              filterStatus === s ? 'bg-brand-primary/15 border-brand-primary text-brand-primary' : 'bg-brand-card border-brand-border text-brand-muted hover:text-brand-text'
            )}>
            {s === 'all' ? 'Estado' : statusConfig[s].label}
          </button>
        ))}
        <div className="w-px bg-brand-border mx-1" />
        {(['all', 'ml', 'maps', 'manual'] as const).map((src) => (
          <button key={src} onClick={() => setFilterSource(src)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              filterSource === src ? 'bg-brand-primary/15 border-brand-primary text-brand-primary' : 'bg-brand-card border-brand-border text-brand-muted hover:text-brand-text'
            )}>
            {src === 'all' ? 'Fuente' : `${sourceConfig[src].icon} ${sourceConfig[src].label}`}
          </button>
        ))}
      </div>

      {/* ── Lista de leads ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-brand-card border border-brand-border rounded-2xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-brand-muted">
          <Target size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-brand-text mb-1">Sin prospectos aún</p>
          <p className="text-xs">Haz clic en "Buscar prospectos" para encontrar vendedores potenciales en MercadoLibre.</p>
          <button onClick={() => runSearch(true)}
            className="mt-4 px-4 py-2 bg-brand-primary/15 border border-brand-primary/30 text-brand-primary rounded-xl text-sm font-medium hover:bg-brand-primary/25 transition-colors">
            Cargar datos de ejemplo
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 animate-fade-in" style={{ animationDelay: '80ms' }}>
          {visible.map((lead) => {
            const tc = tempConfig[lead.lead_temperature]
            const sc = statusConfig[lead.status]
            const src = sourceConfig[lead.source]
            return (
              <div key={lead.id} className={cn(
                'bg-brand-card border rounded-2xl p-4 transition-all',
                lead.lead_temperature === 'hot'  ? 'border-[#FF6B35]/25' :
                lead.lead_temperature === 'warm' ? 'border-brand-green/20' :
                'border-brand-border',
                lead.status === 'discarded' ? 'opacity-40' : '',
              )}>
                <div className="flex items-start gap-4">
                  {/* Score visual */}
                  <div className="shrink-0 flex flex-col items-center gap-1 w-12">
                    <div className={cn('text-xl font-black font-mono tabular-nums', tc.color)}>
                      {lead.lead_score}
                    </div>
                    <div className="w-full h-1.5 bg-brand-hover rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', tc.bar)} style={{ width: `${lead.lead_score}%` }} />
                    </div>
                    <span className="text-[9px] text-brand-faint">score</span>
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-brand-text truncate">{lead.seller_name}</p>
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0', tc.bg, tc.color)}>
                            {tc.label}
                          </span>
                        </div>
                        <p className="text-xs text-brand-muted truncate mt-0.5">{lead.product_name}</p>
                      </div>
                      <span className={cn('text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0', sc.color)}>
                        {sc.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-brand-faint flex-wrap">
                      <span className="flex items-center gap-1">
                        <ShoppingBag size={10} /> {fmtSales(lead.estimated_sales)} ventas
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={10} /> {fmtPrice(lead.product_price)}
                      </span>
                      {lead.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} /> {lead.city}
                        </span>
                      )}
                      <span>{src.icon} {src.label}</span>
                      {lead.trend_keyword && (
                        <span className="text-brand-primary/70">#{lead.trend_keyword}</span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  {lead.status !== 'discarded' && (
                    <div className="shrink-0 flex items-center gap-1.5">
                      <button
                        onClick={() => setDetailModal(lead)}
                        className="p-2 rounded-xl bg-brand-hover border border-brand-border text-brand-muted hover:text-brand-text transition-colors"
                        title="Ver detalle"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setProposalModal(lead)
                          setProposal(lead.proposal_text ?? '')
                          setChannel('whatsapp')
                        }}
                        className="p-2 rounded-xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/25 transition-colors"
                        title="Enviar propuesta"
                      >
                        <Send size={13} />
                      </button>
                      <button
                        onClick={() => discardLead(lead.id)}
                        className="p-2 rounded-xl bg-brand-hover border border-brand-border text-brand-muted hover:text-[#FF3B30] transition-colors"
                        title="Descartar"
                      >
                        <XCircle size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal propuesta ──────────────────────────────────────────────── */}
      {proposalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b border-brand-border">
              <h2 className="text-base font-bold text-brand-text">Propuesta para {proposalModal.seller_name}</h2>
              <p className="text-xs text-brand-muted mt-0.5">{proposalModal.product_name}</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Tabs de canal */}
              <div className="flex gap-2">
                {(['whatsapp', 'email', 'ml'] as Channel[]).map((ch) => (
                  <button key={ch} onClick={() => { setChannel(ch); setProposal('') }}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize',
                      channel === ch ? 'bg-brand-primary/15 border-brand-primary text-brand-primary' : 'bg-brand-hover border-brand-border text-brand-muted hover:text-brand-text'
                    )}>
                    {ch === 'ml' ? '🛒 ML' : ch === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}
                  </button>
                ))}
                <button
                  onClick={() => generateProposalForLead(proposalModal, channel)}
                  disabled={generating}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary/15 border border-brand-primary/30 text-brand-primary rounded-lg text-xs font-semibold hover:bg-brand-primary/25 transition-colors disabled:opacity-50"
                >
                  {generating ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
                  {generating ? 'Generando…' : 'Generar con IA'}
                </button>
              </div>

              {/* Textarea editable */}
              <textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="Haz clic en 'Generar con IA' para crear una propuesta personalizada…"
                rows={7}
                className="w-full bg-brand-hover border border-brand-border rounded-xl p-3 text-sm text-brand-text placeholder:text-brand-faint resize-none focus:outline-none focus:border-brand-primary transition-colors font-mono"
              />

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(proposal) }}
                  disabled={!proposal}
                  className="flex items-center gap-1.5 px-3 py-2 bg-brand-hover border border-brand-border text-brand-muted rounded-xl text-xs font-semibold hover:text-brand-text transition-colors disabled:opacity-40"
                >
                  <Copy size={11} /> Copiar
                </button>
                {proposalModal.product_url && (
                  <a href={proposalModal.product_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-brand-hover border border-brand-border text-brand-muted rounded-xl text-xs font-semibold hover:text-brand-text transition-colors">
                    <ExternalLink size={11} /> Ver en ML
                  </a>
                )}
                <div className="flex-1" />
                <button onClick={() => setProposalModal(null)}
                  className="px-4 py-2 bg-brand-hover border border-brand-border text-brand-muted rounded-xl text-xs font-semibold hover:text-brand-text transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => sendProposal(proposalModal)}
                  disabled={!proposal || sending}
                  className="btn-gradient flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {sending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                  {sending ? 'Enviando…' : 'Enviar ahora'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal detalle ────────────────────────────────────────────────── */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-brand-border flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-brand-text">{detailModal.seller_name}</h2>
                <p className="text-xs text-brand-muted mt-0.5">{detailModal.product_name}</p>
              </div>
              <span className={cn('text-[9px] font-bold px-2 py-1 rounded-full border', tempConfig[detailModal.lead_temperature].bg, tempConfig[detailModal.lead_temperature].color)}>
                {tempConfig[detailModal.lead_temperature].label}
              </span>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-brand-hover rounded-xl p-3">
                  <p className="text-[10px] text-brand-faint mb-1">LeadScore</p>
                  <p className={cn('text-2xl font-black font-mono', tempConfig[detailModal.lead_temperature].color)}>{detailModal.lead_score}</p>
                </div>
                <div className="bg-brand-hover rounded-xl p-3">
                  <p className="text-[10px] text-brand-faint mb-1">Ventas estimadas</p>
                  <p className="text-xl font-bold text-brand-text">{fmtSales(detailModal.estimated_sales)}</p>
                </div>
                <div className="bg-brand-hover rounded-xl p-3">
                  <p className="text-[10px] text-brand-faint mb-1">Precio producto</p>
                  <p className="text-sm font-bold text-brand-text">{fmtPrice(detailModal.product_price)}</p>
                </div>
                <div className="bg-brand-hover rounded-xl p-3">
                  <p className="text-[10px] text-brand-faint mb-1">Ciudad</p>
                  <p className="text-sm font-bold text-brand-text">{detailModal.city ?? '—'}</p>
                </div>
              </div>
              <div className="bg-brand-hover rounded-xl p-3">
                <p className="text-[10px] text-brand-faint mb-1">Nivel ML</p>
                <p className="text-sm text-brand-text font-mono">{detailModal.ml_level || '—'}</p>
              </div>
              {detailModal.proposal_text && (
                <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-3">
                  <p className="text-[10px] text-brand-primary mb-1 font-semibold">Última propuesta</p>
                  <p className="text-xs text-brand-muted whitespace-pre-wrap">{detailModal.proposal_text}</p>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                {detailModal.product_url && (
                  <a href={detailModal.product_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-brand-hover border border-brand-border text-brand-muted rounded-xl text-xs font-semibold hover:text-brand-text transition-colors">
                    <ExternalLink size={11} /> Ver en ML
                  </a>
                )}
                <a href={`/dashboard/vendors/new?name=${encodeURIComponent(detailModal.seller_name)}&source=leadfinder&lead_id=${detailModal.id}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-brand-green/15 border border-brand-green/30 text-brand-green rounded-xl text-xs font-semibold hover:bg-brand-green/25 transition-colors">
                  <UserPlus size={11} /> Convertir a vendor
                </a>
                <div className="flex-1" />
                <button onClick={() => setDetailModal(null)}
                  className="px-4 py-2 bg-brand-hover border border-brand-border text-brand-muted rounded-xl text-xs font-semibold hover:text-brand-text transition-colors">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
