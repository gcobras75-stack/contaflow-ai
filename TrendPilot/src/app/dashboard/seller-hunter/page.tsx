'use client'

import { useState } from 'react'
import { Search, Users, Star, Loader2, Send, ExternalLink, TrendingUp } from 'lucide-react'
import { cn } from '@/utils'
import type { SellerOpportunity, SellerCandidate } from '@/app/api/seller-hunter/route'

// Mock oportunidades para el panel inicial
const MOCK_OPPORTUNITIES: SellerOpportunity[] = [
  {
    keyword:     'Bolsas ecológicas tela',
    trend_score: 84,
    found_at:    new Date(Date.now() - 3600000 * 2).toISOString(),
    candidates: [
      { rank: 1, name: 'EcoModa_MX',     permalink: 'https://www.mercadolibre.com.mx', score: 88, sales_count: 1240, avg_price: 180, level: '5_green', proposal: 'Hola EcoModa_MX! Tus bolsas tienen alta demanda esta semana. Queremos promoverlas sin costo fijo — solo 25% sobre ventas. ¿Te interesa? → trendpilot.marketing' },
      { rank: 2, name: 'TiendaVerde_GDL', permalink: 'https://www.mercadolibre.com.mx', score: 74, sales_count: 580,  avg_price: 165, level: '4_green', proposal: undefined },
      { rank: 3, name: 'Sustentable123',  permalink: 'https://www.mercadolibre.com.mx', score: 61, sales_count: 230,  avg_price: 195, level: '3_green', proposal: undefined },
    ],
  },
  {
    keyword:     'Aretes plata artesanal',
    trend_score: 77,
    found_at:    new Date(Date.now() - 3600000 * 6).toISOString(),
    candidates: [
      { rank: 1, name: 'JoyeriaOaxaca',  permalink: 'https://www.mercadolibre.com.mx', score: 92, sales_count: 2100, avg_price: 320, level: '5_green', proposal: 'Hola JoyeriaOaxaca! Detectamos que tus aretes de plata están en tendencia. Promociónate sin riesgo — solo pagas si hay ventas (25%). → trendpilot.marketing' },
      { rank: 2, name: 'PlataMexicana',  permalink: 'https://www.mercadolibre.com.mx', score: 79, sales_count: 890,  avg_price: 290, level: '4_green', proposal: undefined },
      { rank: 3, name: 'ArteNativo_MX',  permalink: 'https://www.mercadolibre.com.mx', score: 65, sales_count: 410,  avg_price: 350, level: '3_green', proposal: undefined },
    ],
  },
  {
    keyword:     'Suplementos proteína',
    trend_score: 81,
    found_at:    new Date(Date.now() - 3600000 * 10).toISOString(),
    candidates: [
      { rank: 1, name: 'NutriMax_MX',    permalink: 'https://www.mercadolibre.com.mx', score: 85, sales_count: 3200, avg_price: 450, level: '5_green', proposal: 'Hola NutriMax_MX! Tus suplementos están en tendencia ahora mismo. Queremos impulsar tus ventas sin costo fijo. ¿Hablamos? → trendpilot.marketing' },
      { rank: 2, name: 'SaludPro',       permalink: 'https://www.mercadolibre.com.mx', score: 70, sales_count: 1100, avg_price: 480, level: '4_green', proposal: undefined },
      { rank: 3, name: 'VitaminasMX',    permalink: 'https://www.mercadolibre.com.mx', score: 58, sales_count: 540,  avg_price: 420, level: '3_green', proposal: undefined },
    ],
  },
  {
    keyword:     'Tapete yoga antideslizante',
    trend_score: 71,
    found_at:    new Date(Date.now() - 3600000 * 18).toISOString(),
    candidates: [
      { rank: 1, name: 'YogaMex_Store',  permalink: 'https://www.mercadolibre.com.mx', score: 78, sales_count: 670,  avg_price: 350, level: '4_green', proposal: 'Hola YogaMex_Store! Tus tapetes de yoga están ganando tracción. Únete a TrendPilot — sin costo fijo, solo 25% por venta. → trendpilot.marketing' },
      { rank: 2, name: 'FitnessMX',      permalink: 'https://www.mercadolibre.com.mx', score: 65, sales_count: 380,  avg_price: 380, level: '3_green', proposal: undefined },
      { rank: 3, name: 'DeportesTotal',  permalink: 'https://www.mercadolibre.com.mx', score: 55, sales_count: 190,  avg_price: 320, level: '3_green', proposal: undefined },
    ],
  },
  {
    keyword:     'Cargador solar portátil',
    trend_score: 74,
    found_at:    new Date(Date.now() - 3600000 * 24).toISOString(),
    candidates: [
      { rank: 1, name: 'TechSolar_MX',   permalink: 'https://www.mercadolibre.com.mx', score: 81, sales_count: 920,  avg_price: 890, level: '5_green', proposal: 'Hola TechSolar_MX! Los cargadores solares están en auge. Queremos promocionarte sin inversión inicial — solo 25% sobre lo que vendas. ¿Te interesa? → trendpilot.marketing' },
      { rank: 2, name: 'EnergiaVerde',   permalink: 'https://www.mercadolibre.com.mx', score: 68, sales_count: 450,  avg_price: 950, level: '4_green', proposal: undefined },
      { rank: 3, name: 'GadgetsEco_MX', permalink: 'https://www.mercadolibre.com.mx', score: 54, sales_count: 210,  avg_price: 820, level: '3_green', proposal: undefined },
    ],
  },
]

function levelColor(level: string) {
  if (level.includes('5_green')) return 'text-brand-green'
  if (level.includes('4_green')) return 'text-brand-primary'
  if (level.includes('3_green')) return 'text-brand-yellow'
  return 'text-brand-faint'
}

function levelLabel(level: string) {
  if (level.includes('5_green')) return '⭐⭐⭐⭐⭐'
  if (level.includes('4_green')) return '⭐⭐⭐⭐'
  if (level.includes('3_green')) return '⭐⭐⭐'
  return '—'
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} hr`
  return `hace ${Math.floor(diff / 86400)} días`
}

function CandidateCard({ c, keyword }: { c: SellerCandidate; keyword: string }) {
  const [copied, setCopied]     = useState(false)
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState(false)

  const proposal = c.proposal ?? `Hola ${c.name}! Tu ${keyword} tiene alta demanda. Queremos promocionarlo sin costo fijo — solo 25% sobre ventas. ¿Te interesa? → trendpilot.marketing`

  function copyProposal() {
    navigator.clipboard.writeText(proposal).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  async function sendProposal() {
    setSending(true)
    try {
      // En producción: llamar API para enviar WhatsApp con la propuesta
      await new Promise((r) => setTimeout(r, 1200))
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cn(
      'rounded-xl border p-3 space-y-2',
      c.rank === 1 ? 'bg-brand-green/5 border-brand-green/25' : 'bg-brand-card border-brand-border',
    )}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
          c.rank === 1 ? 'bg-brand-green text-white' : 'bg-brand-hover text-brand-faint'
        )}>#{c.rank}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-text truncate">{c.name}</p>
          <p className={cn('text-[10px]', levelColor(c.level))}>{levelLabel(c.level)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold font-mono text-brand-text">{c.score}</p>
          <p className="text-[9px] text-brand-faint">score</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-[10px] text-brand-muted">
        <span>💰 ${c.avg_price.toLocaleString('es-MX')}</span>
        <span>📦 {c.sales_count.toLocaleString('es-MX')} ventas</span>
      </div>

      {/* Propuesta */}
      {c.rank === 1 && (
        <div className="bg-brand-hover rounded-lg p-2">
          <p className="text-[10px] font-semibold text-brand-primary mb-1">Propuesta generada por IA:</p>
          <p className="text-[10px] text-brand-muted leading-relaxed">{proposal}</p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-1.5">
        <a
          href={c.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 bg-brand-hover hover:bg-brand-border rounded-lg text-[10px] text-brand-muted transition-colors"
        >
          <ExternalLink size={9} /> Ver en ML
        </a>
        <button
          onClick={copyProposal}
          className="flex items-center gap-1 px-2 py-1 bg-brand-hover hover:bg-brand-border rounded-lg text-[10px] text-brand-muted transition-colors"
        >
          {copied ? '✅ Copiado' : '📋 Copiar propuesta'}
        </button>
        {!sent ? (
          <button
            onClick={sendProposal}
            disabled={sending}
            className="flex items-center gap-1 px-2 py-1 bg-brand-primary/10 text-brand-primary border border-brand-primary/25 rounded-lg text-[10px] font-medium hover:bg-brand-primary/20 transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 size={9} className="animate-spin" /> : <Send size={9} />}
            {sending ? 'Enviando…' : 'Enviar propuesta'}
          </button>
        ) : (
          <span className="flex items-center gap-1 px-2 py-1 text-[10px] text-brand-green">✅ Enviada</span>
        )}
      </div>
    </div>
  )
}

export default function SellerHunterPage() {
  const [opportunities]         = useState<SellerOpportunity[]>(MOCK_OPPORTUNITIES)
  const [searchKeyword, setKw]  = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setResult] = useState<SellerOpportunity | null>(null)
  const [searchError, setError]   = useState<string | null>(null)

  async function handleSearch() {
    if (!searchKeyword.trim()) return
    setSearching(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/seller-hunter?keyword=${encodeURIComponent(searchKeyword.trim())}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      setResult(json.data)
    } catch {
      setError('No se pudo buscar en MercadoLibre. Intenta de nuevo.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Encabezado */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
            <Users size={15} className="text-brand-primary" />
          </div>
          SellerHunter
        </h1>
        <p className="text-sm text-brand-muted mt-1">Busca automáticamente los mejores vendedores para cada tendencia</p>
      </div>

      {/* Búsqueda manual */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '60ms' }}>
        <p className="text-xs font-semibold text-brand-faint uppercase tracking-widest mb-3">Buscar sellers por producto</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-faint" />
            <input
              type="text"
              placeholder="Ej: bolsas ecológicas, aretes plata…"
              value={searchKeyword}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-brand-hover border border-brand-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchKeyword.trim()}
            className="flex items-center gap-2 px-5 py-2.5 btn-gradient text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {searching ? 'Buscando…' : 'Buscar en ML'}
          </button>
        </div>

        {searchError && (
          <p className="text-xs text-brand-red mt-3">{searchError}</p>
        )}

        {/* Resultado de búsqueda */}
        {searchResult && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={13} className="text-brand-primary" />
              <p className="text-sm font-semibold text-brand-text">
                Top 3 sellers — <span className="text-brand-primary">{searchResult.keyword}</span>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {searchResult.candidates.map((c) => (
                <CandidateCard key={c.rank} c={c} keyword={searchResult.keyword} />
              ))}
              {searchResult.candidates.length === 0 && (
                <p className="text-sm text-brand-faint col-span-3 text-center py-4">Sin sellers encontrados para este producto.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Oportunidades detectadas automáticamente */}
      <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-brand-text flex items-center gap-2">
            <Star size={13} className="text-brand-yellow" />
            Oportunidades detectadas hoy
          </h2>
          <span className="text-[10px] text-brand-faint">{opportunities.length} productos en tendencia</span>
        </div>

        <div className="space-y-4">
          {opportunities.map((opp) => (
            <div key={opp.keyword} className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
              {/* Header oportunidad */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-brand-text">{opp.keyword}</h3>
                  <p className="text-xs text-brand-faint">{timeAgo(opp.found_at)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-brand-green" />
                  <span className="text-sm font-bold font-mono text-brand-green">Trend {opp.trend_score}</span>
                </div>
              </div>

              {/* Sellers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {opp.candidates.map((c) => (
                  <CandidateCard key={c.rank} c={c} keyword={opp.keyword} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
