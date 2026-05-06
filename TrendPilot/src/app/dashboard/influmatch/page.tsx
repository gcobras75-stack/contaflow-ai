'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Search, Copy, CheckCircle, Filter, ExternalLink } from 'lucide-react'
import { cn } from '@/utils'

interface Influencer {
  id:               string
  platform:         string
  handle:           string
  followers:        number
  engagement_rate:  string | null
  niche:            string | null
  contact_email:    string | null
  status:           'contacted' | 'active' | 'rejected'
  products_promoted: string[]
  created_at:       string
}

// 20 influencers mexicanos mock
const MOCK_INFLUENCERS: Influencer[] = [
  { id:'1',  platform:'instagram', handle:'@karla.modamx',       followers:42000,  engagement_rate:'5.2', niche:'moda femenina',      contact_email:'karla@modamx.com',     status:'active',    products_promoted:['Bolsas ecológicas tela'], created_at: new Date(Date.now()-30*86400000).toISOString() },
  { id:'2',  platform:'tiktok',    handle:'@fitnessmexoficial',   followers:88000,  engagement_rate:'7.1', niche:'fitness y salud',    contact_email:'fit@mex.com',          status:'active',    products_promoted:['Suplementos colágeno','Tapete yoga'], created_at: new Date(Date.now()-25*86400000).toISOString() },
  { id:'3',  platform:'instagram', handle:'@bellezmx',            followers:31000,  engagement_rate:'4.8', niche:'cosméticos',         contact_email:null,                   status:'contacted', products_promoted:[], created_at: new Date(Date.now()-20*86400000).toISOString() },
  { id:'4',  platform:'tiktok',    handle:'@techgadgetsmx',       followers:65000,  engagement_rate:'6.3', niche:'tecnología',         contact_email:'tech@gadgetsmx.com',   status:'active',    products_promoted:['Audífonos bluetooth'], created_at: new Date(Date.now()-18*86400000).toISOString() },
  { id:'5',  platform:'instagram', handle:'@artesaniasoaxaca',    followers:18000,  engagement_rate:'8.9', niche:'artesanías mexicanas',contact_email:'oaxaca@artex.com',     status:'contacted', products_promoted:[], created_at: new Date(Date.now()-15*86400000).toISOString() },
  { id:'6',  platform:'tiktok',    handle:'@mamasnaturales',      followers:55000,  engagement_rate:'5.7', niche:'maternidad natural',  contact_email:null,                   status:'contacted', products_promoted:[], created_at: new Date(Date.now()-14*86400000).toISOString() },
  { id:'7',  platform:'instagram', handle:'@yogamx_oficial',      followers:27000,  engagement_rate:'6.5', niche:'yoga y bienestar',   contact_email:'yoga@mxoficial.com',   status:'active',    products_promoted:['Aceite esencial lavanda'], created_at: new Date(Date.now()-12*86400000).toISOString() },
  { id:'8',  platform:'tiktok',    handle:'@decohogar.mx',        followers:39000,  engagement_rate:'4.2', niche:'decoración hogar',   contact_email:'deco@hogarmx.com',     status:'rejected',  products_promoted:[], created_at: new Date(Date.now()-10*86400000).toISOString() },
  { id:'9',  platform:'instagram', handle:'@recetasmxfaciles',    followers:72000,  engagement_rate:'5.9', niche:'gastronomía',        contact_email:'recetas@mxfacil.com',  status:'contacted', products_promoted:[], created_at: new Date(Date.now()-9*86400000).toISOString() },
  { id:'10', platform:'tiktok',    handle:'@moda_sustentable_mx', followers:24000,  engagement_rate:'7.8', niche:'moda sustentable',   contact_email:null,                   status:'active',    products_promoted:['Bolsas ecológicas tela'], created_at: new Date(Date.now()-8*86400000).toISOString() },
  { id:'11', platform:'instagram', handle:'@viaje_mexico',        followers:95000,  engagement_rate:'3.9', niche:'viajes',             contact_email:'viaje@mx.com',         status:'contacted', products_promoted:[], created_at: new Date(Date.now()-7*86400000).toISOString() },
  { id:'12', platform:'tiktok',    handle:'@superfinanzasmx',     followers:46000,  engagement_rate:'6.1', niche:'finanzas personales', contact_email:'finanzas@mx.com',      status:'contacted', products_promoted:[], created_at: new Date(Date.now()-6*86400000).toISOString() },
  { id:'13', platform:'instagram', handle:'@playamxlifestyle',    followers:33000,  engagement_rate:'5.4', niche:'estilo de vida playa',contact_email:null,                   status:'contacted', products_promoted:[], created_at: new Date(Date.now()-5*86400000).toISOString() },
  { id:'14', platform:'tiktok',    handle:'@petsmx_oficial',      followers:58000,  engagement_rate:'8.2', niche:'mascotas',           contact_email:'pets@mxoficial.com',   status:'active',    products_promoted:['Accesorios mascotas'], created_at: new Date(Date.now()-4*86400000).toISOString() },
  { id:'15', platform:'instagram', handle:'@emprendedorasmx',     followers:21000,  engagement_rate:'7.3', niche:'emprendimiento femenino',contact_email:'emp@mxmujeres.com', status:'contacted', products_promoted:[], created_at: new Date(Date.now()-3*86400000).toISOString() },
  { id:'16', platform:'tiktok',    handle:'@skincare.mx',         followers:79000,  engagement_rate:'6.8', niche:'skincare',           contact_email:null,                   status:'active',    products_promoted:['Cremas naturales'], created_at: new Date(Date.now()-3*86400000).toISOString() },
  { id:'17', platform:'instagram', handle:'@deporteurbano_mx',    followers:29000,  engagement_rate:'5.1', niche:'deporte urbano',     contact_email:'deporte@urbanomx.com', status:'contacted', products_promoted:[], created_at: new Date(Date.now()-2*86400000).toISOString() },
  { id:'18', platform:'tiktok',    handle:'@foodiesgdl',          followers:43000,  engagement_rate:'7.0', niche:'gastronomía',        contact_email:'foodiesgdl@gmail.com', status:'rejected',  products_promoted:[], created_at: new Date(Date.now()-2*86400000).toISOString() },
  { id:'19', platform:'instagram', handle:'@joyeraartesanal',     followers:14000,  engagement_rate:'9.4', niche:'joyería artesanal',  contact_email:'joyera@artes.com',     status:'active',    products_promoted:['Aretes plata artesanal'], created_at: new Date(Date.now()-86400000).toISOString() },
  { id:'20', platform:'tiktok',    handle:'@digitalnomadmx',      followers:37000,  engagement_rate:'5.6', niche:'trabajo remoto',     contact_email:'nomad@mx.com',         status:'contacted', products_promoted:[], created_at: new Date(Date.now()-86400000).toISOString() },
]

const STATUS_CFG = {
  contacted: { label: 'Contactado', color: 'text-brand-yellow bg-brand-yellow/10'   },
  active:    { label: 'Activo',     color: 'text-brand-green  bg-brand-green/10'    },
  rejected:  { label: 'Rechazó',   color: 'text-brand-red    bg-brand-red/10'      },
}

function fmtFollowers(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)    return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

export default function InfluMatchPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [loading, setLoading]   = useState(true)
  const [query, setQuery]       = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'contacted' | 'active' | 'rejected'>('all')
  const [platformFilter, setPlatformFilter] = useState<'all' | 'instagram' | 'tiktok'>('all')

  // Modal de propuesta
  const [proposalModal, setProposalModal] = useState<Influencer | null>(null)
  const [productName, setProductName]     = useState('')
  const [proposal, setProposal]           = useState('')
  const [generating, setGenerating]       = useState(false)
  const [copied, setCopied]               = useState(false)

  const fetchInfluencers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/influmatch')
      if (res.ok) {
        const json = await res.json()
        const list = json.data ?? []
        setInfluencers(list.length > 0 ? list : MOCK_INFLUENCERS)
      } else {
        setInfluencers(MOCK_INFLUENCERS)
      }
    } catch {
      setInfluencers(MOCK_INFLUENCERS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchInfluencers() }, [fetchInfluencers])

  async function handleGenerateProposal() {
    if (!proposalModal || !productName.trim()) return
    setGenerating(true)
    setProposal('')
    try {
      const res = await fetch('/api/influmatch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:       'generate_proposal',
          handle:       proposalModal.handle,
          niche:        proposalModal.niche,
          product_name: productName.trim(),
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setProposal(json.proposal)
      }
    } catch { /* noop */ }
    finally { setGenerating(false) }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(proposal)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleUpdateStatus(id: string, status: Influencer['status']) {
    setInfluencers((prev) => prev.map((inf) => inf.id === id ? { ...inf, status } : inf))
    await fetch('/api/influmatch', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'update_status', id, status }),
    })
  }

  // Filtros
  const filtered = influencers.filter((inf) => {
    const matchQuery  = !query || inf.handle.toLowerCase().includes(query.toLowerCase()) || (inf.niche ?? '').toLowerCase().includes(query.toLowerCase())
    const matchStatus = statusFilter === 'all' || inf.status === statusFilter
    const matchPlat   = platformFilter === 'all' || inf.platform === platformFilter
    return matchQuery && matchStatus && matchPlat
  })

  const activeCount    = influencers.filter((i) => i.status === 'active').length
  const contactedCount = influencers.filter((i) => i.status === 'contacted').length

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Encabezado */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
              <Users size={15} className="text-brand-primary" />
            </div>
            InfluMatch™
          </h1>
          <p className="text-sm text-brand-muted mt-1">Micro-influencers mexicanos — 5K-100K seguidores</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '60ms' }}>
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
          <p className="text-[10px] text-brand-faint uppercase tracking-widest mb-2">Total en base</p>
          <p className="text-2xl font-bold font-mono text-brand-text">{loading ? '—' : influencers.length}</p>
        </div>
        <div className="bg-brand-card border border-brand-green/25 bg-brand-green/5 rounded-2xl p-4">
          <p className="text-[10px] text-brand-faint uppercase tracking-widest mb-2">Activos</p>
          <p className="text-2xl font-bold font-mono text-brand-green">{loading ? '—' : activeCount}</p>
        </div>
        <div className="bg-brand-card border border-brand-yellow/25 bg-brand-yellow/5 rounded-2xl p-4">
          <p className="text-[10px] text-brand-faint uppercase tracking-widest mb-2">Contactados</p>
          <p className="text-2xl font-bold font-mono text-brand-yellow">{loading ? '—' : contactedCount}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 animate-fade-in" style={{ animationDelay: '80ms' }}>
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por @handle o nicho…"
            className="w-full bg-brand-card border border-brand-border rounded-xl pl-9 pr-3 py-2 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary transition-colors"
          />
        </div>

        {/* Plataforma */}
        <div className="flex items-center gap-1 bg-brand-card border border-brand-border rounded-xl p-1">
          {(['all', 'instagram', 'tiktok'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-all',
                platformFilter === p ? 'btn-gradient text-white' : 'text-brand-muted hover:text-brand-text')}
            >
              {p === 'all' ? 'Todos' : p === 'instagram' ? '📸 IG' : '🎵 TK'}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-1 bg-brand-card border border-brand-border rounded-xl p-1">
          {(['all', 'active', 'contacted', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-all',
                statusFilter === s ? 'btn-gradient text-white' : 'text-brand-muted hover:text-brand-text')}
            >
              {s === 'all' ? 'Todos' : STATUS_CFG[s].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-brand-faint px-2">
          <Filter size={11} /> {filtered.length} resultados
        </div>
      </div>

      {/* Grid de influencers */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '120ms' }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 skeleton rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16 bg-brand-card border border-brand-border rounded-2xl text-brand-faint">
            <Users size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No hay influencers con este filtro.</p>
          </div>
        ) : (
          filtered.map((inf) => {
            const engNum = Number(inf.engagement_rate ?? 0)
            const stCfg  = STATUS_CFG[inf.status]
            const plIcon = inf.platform === 'instagram' ? '📸' : '🎵'

            return (
              <div key={inf.id} className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3 hover:border-brand-primary/40 transition-all">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar placeholder */}
                    <div className="w-10 h-10 rounded-full bg-brand-primary/15 flex items-center justify-center shrink-0">
                      <span className="text-sm">{plIcon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-brand-text">{inf.handle}</p>
                      <p className="text-[10px] text-brand-muted">{inf.niche ?? 'general'}</p>
                    </div>
                  </div>
                  <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', stCfg.color)}>
                    {stCfg.label}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-brand-hover rounded-xl p-2.5">
                    <p className="text-[10px] text-brand-faint">Seguidores</p>
                    <p className="text-base font-bold font-mono text-brand-text">{fmtFollowers(inf.followers)}</p>
                  </div>
                  <div className={cn('rounded-xl p-2.5', engNum >= 5 ? 'bg-brand-green/8 border border-brand-green/20' : 'bg-brand-hover')}>
                    <p className="text-[10px] text-brand-faint">Engagement</p>
                    <p className={cn('text-base font-bold font-mono', engNum >= 5 ? 'text-brand-green' : 'text-brand-text')}>
                      {inf.engagement_rate ?? '?'}%
                    </p>
                  </div>
                </div>

                {/* Engagement bar */}
                <div>
                  <div className="h-1.5 bg-brand-hover rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', engNum >= 7 ? 'bg-brand-green' : engNum >= 4 ? 'bg-brand-yellow' : 'bg-brand-primary')}
                      style={{ width: `${Math.min(100, engNum * 10)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-brand-faint mt-0.5">
                    <span>0%</span><span>10%</span>
                  </div>
                </div>

                {/* Productos */}
                {inf.products_promoted.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {inf.products_promoted.map((p) => (
                      <span key={p} className="text-[9px] px-1.5 py-0.5 bg-brand-primary/10 text-brand-primary rounded-full">{p}</span>
                    ))}
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setProposalModal(inf); setProductName(''); setProposal('') }}
                    className="flex-1 px-3 py-1.5 btn-gradient text-white rounded-xl text-xs font-semibold"
                  >
                    Contactar
                  </button>
                  {inf.status === 'contacted' && (
                    <button
                      onClick={() => handleUpdateStatus(inf.id, 'active')}
                      className="px-3 py-1.5 bg-brand-green/10 text-brand-green border border-brand-green/25 rounded-xl text-xs hover:bg-brand-green/20 transition-colors"
                    >
                      ✓ Activo
                    </button>
                  )}
                  {inf.status !== 'rejected' && inf.status !== 'active' && (
                    <button
                      onClick={() => handleUpdateStatus(inf.id, 'rejected')}
                      className="px-3 py-1.5 bg-brand-hover text-brand-faint rounded-xl text-xs hover:text-brand-red transition-colors"
                    >
                      ✗
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal propuesta */}
      {proposalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-brand-card border border-brand-primary/30 rounded-2xl p-6 w-full max-w-md space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-brand-text">Propuesta para {proposalModal.handle}</p>
              <button onClick={() => setProposalModal(null)} className="text-brand-faint hover:text-brand-text">✕</button>
            </div>

            <div>
              <label className="text-xs text-brand-muted mb-1.5 block">Producto a promover *</label>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ej: Aretes plata artesanal"
                className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>

            <button
              onClick={handleGenerateProposal}
              disabled={generating || !productName.trim()}
              className="w-full py-2 btn-gradient text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {generating ? '⏳ Generando con Claude…' : '✨ Generar mensaje'}
            </button>

            {proposal && (
              <div className="space-y-2">
                <textarea
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                  rows={5}
                  className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary resize-none transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 flex-1 justify-center px-3 py-2 bg-brand-hover border border-brand-border rounded-xl text-xs text-brand-muted hover:text-brand-text transition-colors"
                  >
                    {copied ? <CheckCircle size={12} className="text-brand-green" /> : <Copy size={12} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  {proposalModal.contact_email && (
                    <a
                      href={`mailto:${proposalModal.contact_email}?subject=Colaboración TrendPilot&body=${encodeURIComponent(proposal)}`}
                      className="flex-1 text-center px-3 py-2 btn-gradient text-white rounded-xl text-xs font-semibold"
                    >
                      Enviar email
                    </a>
                  )}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(proposal)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-3 py-2 bg-brand-green/10 text-brand-green border border-brand-green/25 rounded-xl text-xs font-semibold hover:bg-brand-green/20 transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            )}

            {/* Plataforma de contacto */}
            <div className="flex items-center gap-2 text-xs text-brand-faint pt-2 border-t border-brand-border">
              <ExternalLink size={11} />
              <span>Envía DM en {proposalModal.platform} a {proposalModal.handle}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
