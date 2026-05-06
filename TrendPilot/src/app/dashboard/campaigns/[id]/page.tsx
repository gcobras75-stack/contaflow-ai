'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, Radio, TrendingUp, TrendingDown, AlertTriangle,
  Pause, Play, Zap, Users, DollarSign, ShoppingCart, BarChart3,
  FlaskConical, RotateCcw,
} from 'lucide-react'
import { cn } from '@/utils'
import { buildReachBackConfig, reachBackTotals } from '@/lib/reachback'
import { ProductImage } from '@/components/ui/ProductImage'

// recharts — solo cliente
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line      = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })
const XAxis     = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis     = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const Tooltip   = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })

function generateMockDailyData(days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (days - 1 - i))
    const sales = Math.round(5000 + Math.random() * 15000)
    const spend = Math.round(1000 + Math.random() * 3000)
    return {
      date:   date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      ventas: sales, gasto: spend,
      roi:    Math.round(((sales - spend) / spend) * 100),
    }
  })
}

const semConfig = {
  green:  { label: 'Activa',      color: 'text-[#00FF88]', bg: 'bg-[#00FF88]/10 border-[#00FF88]/30', icon: TrendingUp    },
  yellow: { label: 'En revisión', color: 'text-[#FFB800]', bg: 'bg-[#FFB800]/10 border-[#FFB800]/30', icon: AlertTriangle },
  red:    { label: 'Pausada',     color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10 border-[#FF3B30]/30', icon: TrendingDown  },
  paused: { label: 'Pausada',     color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10 border-[#FF3B30]/30', icon: Pause         },
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n / 100)
}

// ─── SplitTest variantes mock ─────────────────────────────────────────────────

interface ABVariant {
  id:     'A' | 'B' | 'C' | 'D'
  name:   string
  desc:   string
  ctr:    number
  sales:  number
  spend:  number
  status: 'winner' | 'running' | 'eliminated'
}

function buildMockVariants(productName: string): ABVariant[] {
  const ctrs = [
    2.1 + Math.random() * 3,
    1.2 + Math.random() * 2.5,
    3.8 + Math.random() * 2,
    1.5 + Math.random() * 2,
  ].map((c) => Number(c.toFixed(1)))
  const maxIdx = ctrs.indexOf(Math.max(...ctrs))

  return [
    { id:'A', name:'Imagen + precio visible',   desc:`Foto de ${productName} con badge de precio en esquina`,             ctr: ctrs[0], sales: Math.round(ctrs[0] * 120), spend: 25, status: maxIdx===0 ? 'winner' : maxIdx>=0 && ctrs[0] < Math.max(...ctrs)-1.5 ? 'eliminated' : 'running' },
    { id:'B', name:'Producto en uso (lifestyle)',desc:`${productName} siendo usado en contexto cotidiano mexicano`,        ctr: ctrs[1], sales: Math.round(ctrs[1] * 120), spend: 25, status: maxIdx===1 ? 'winner' : ctrs[1] < Math.max(...ctrs)-1.5 ? 'eliminated' : 'running' },
    { id:'C', name:'Testimonio de cliente',      desc:`"Compré mi ${productName} y quedé encantada" — @cliente_mx`,       ctr: ctrs[2], sales: Math.round(ctrs[2] * 120), spend: 25, status: maxIdx===2 ? 'winner' : ctrs[2] < Math.max(...ctrs)-1.5 ? 'eliminated' : 'running' },
    { id:'D', name:'Antes vs después',           desc:`Comparación de calidad vs alternativas para ${productName}`,       ctr: ctrs[3], sales: Math.round(ctrs[3] * 120), spend: 25, status: maxIdx===3 ? 'winner' : ctrs[3] < Math.max(...ctrs)-1.5 ? 'eliminated' : 'running' },
  ]
}

const VARIANT_STATUS = {
  winner:    { label: 'GANADORA',   color: 'text-brand-green  bg-brand-green/15  border-brand-green/30'   },
  running:   { label: 'EN CURSO',   color: 'text-brand-yellow bg-brand-yellow/15 border-brand-yellow/30'  },
  eliminated:{ label: 'ELIMINADA',  color: 'text-brand-faint  bg-brand-hover     border-brand-border'     },
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()

  const [campaign, setCampaign]   = useState<Record<string, unknown> | null>(null)
  const [creatives, setCreatives] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [dailyData]               = useState(generateMockDailyData(14))
  const [isPending, startTrans]   = useTransition()
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [reachExpanded, setReachExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [affRes, adRes] = await Promise.all([
          fetch(`/api/affiliate/campaigns/${id}`),
          fetch(`/api/ad-creatives?campaign_id=${id}`),
        ])
        if (affRes.ok) {
          const { data } = await affRes.json()
          setCampaign(data)
        } else {
          // Fallback: tabla campaigns estándar
          const cRes = await fetch(`/api/campaigns/${id}`)
          if (cRes.status === 404) { setNotFound(true) }
          else if (cRes.ok) { const { data } = await cRes.json(); setCampaign(data) }
          else { setNotFound(true) }
        }
        if (adRes.ok) { const { data } = await adRes.json(); setCreatives(data ?? []) }
      } catch { /* silencioso */ } finally { setLoading(false) }
    }
    load()
  }, [id])

  async function handlePause() {
    startTrans(async () => {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused', pause_reason: 'Pausa manual desde el panel' }),
      })
      if (res.ok) {
        setActionMsg('Campaña pausada correctamente.')
        setCampaign((c) => c ? { ...c, semaphore_color: 'paused', status: 'paused' } : c)
      }
    })
  }

  async function handleResume() {
    startTrans(async () => {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'yellow', semaphore_color: 'yellow' }),
      })
      if (res.ok) {
        setActionMsg('Campaña reactivada. Estado: Amarillo (revisión).')
        setCampaign((c) => c ? { ...c, semaphore_color: 'yellow', status: 'yellow' } : c)
      }
    })
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl">
        <div className="h-8 bg-brand-border rounded w-1/3" />
        <div className="h-48 bg-brand-card border border-brand-border rounded-2xl" />
        <div className="h-64 bg-brand-card border border-brand-border rounded-2xl" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-card border border-brand-border flex items-center justify-center mx-auto">
          <Radio size={24} className="text-brand-faint" />
        </div>
        <h1 className="text-lg font-bold text-brand-text">Esta campaña no existe o fue eliminada</h1>
        <p className="text-sm text-brand-muted">
          Es posible que la campaña haya sido eliminada o que el enlace sea incorrecto.
        </p>
        <button
          onClick={() => router.push('/dashboard/campaigns')}
          className="inline-flex items-center gap-2 px-5 py-2.5 btn-gradient text-white rounded-xl text-sm font-semibold"
        >
          <ArrowLeft size={14} /> Volver a campañas
        </button>
      </div>
    )
  }

  const sem  = (campaign?.semaphore_color as keyof typeof semConfig) ?? 'yellow'
  const cfg  = semConfig[sem] ?? semConfig.yellow
  const Icon = cfg.icon

  const budgetTotal    = Number(campaign?.budget_total       ?? 0)
  const budgetSpent    = Number(campaign?.budget_spent        ?? 0)
  const salesGenerated = Number(campaign?.sales_generated     ?? 0)
  const commissions    = Number(campaign?.commissions_earned  ?? 0)
  const roi            = budgetSpent > 0 ? Math.round(((salesGenerated - budgetSpent) / budgetSpent) * 100) : 0
  const growthFund     = Math.round(commissions * 0.4)
  const platformEarning = commissions - growthFund
  const spendPct       = budgetTotal > 0 ? Math.min(100, Math.round((budgetSpent / budgetTotal) * 100)) : 0

  const productName = (campaign?.name as string | undefined)
                   ?? (campaign?.product_name as string | undefined)
                   ?? (campaign?.products as { name?: string })?.name
                   ?? 'Producto'
  const vendorName  = (campaign?.vendor_name as string | undefined)
                   ?? (campaign?.vendors as { name?: string })?.name
                   ?? '—'
  const platform       = String(campaign?.platform ?? 'meta')
  const productImageUrl = (campaign?.image_url as string | null) ?? null

  // SplitTest & ReachBack — mock basado en datos de campaña
  const abVariants = buildMockVariants(productName)
  const winner     = abVariants.find((v) => v.status === 'winner')
  const reachConfig = buildReachBackConfig(id, productName, platform as 'meta' | 'tiktok' | 'both', budgetTotal)
  const reachTotals = reachBackTotals(reachConfig)

  // Imagen del creativo
  const imageUrl = creatives[0] ? String(creatives[0].image_url ?? '') : ''
  const hasOpenAI = Boolean(imageUrl && !imageUrl.includes('placeholder'))

  return (
    <div className="max-w-3xl space-y-5">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-brand-border transition-colors text-brand-muted hover:text-white">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white truncate">{productName}</h1>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', cfg.bg, cfg.color)}>{cfg.label}</span>
          </div>
          <p className="text-sm text-brand-muted">{vendorName} · {platform.toUpperCase()}</p>
        </div>
      </div>

      {actionMsg && (
        <div className="bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl px-4 py-2.5 text-sm text-[#00FF88]">{actionMsg}</div>
      )}

      {/* Hero imagen del producto */}
      <div className="relative h-[200px] rounded-2xl overflow-hidden">
        <ProductImage keyword={productName} src={productImageUrl} size="hero" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-bold text-lg leading-tight drop-shadow">{productName}</p>
          <p className="text-white/60 text-sm">{vendorName} · {platform.toUpperCase()}</p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'ROI',        value:`${roi>0?'+':''}${roi}%`, icon:TrendingUp,  color:roi>=150?'text-[#00FF88]':roi>=80?'text-[#FFB800]':'text-[#FF3B30]' },
          { label:'Ventas',     value:fmt(salesGenerated),       icon:ShoppingCart,color:'text-white'          },
          { label:'Gastado',    value:fmt(budgetSpent),          icon:DollarSign,  color:'text-white'          },
          { label:'Comisiones', value:fmt(commissions),          icon:BarChart3,   color:'text-brand-primary'  },
        ].map((m) => (
          <div key={m.label} className="bg-brand-card border border-brand-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon size={12} className="text-brand-muted" />
              <p className="text-[10px] text-brand-muted">{m.label}</p>
            </div>
            <p className={cn('text-lg font-bold', m.color)}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Presupuesto + GrowthFund */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
        <div>
          <div className="flex justify-between text-xs text-brand-muted mb-1.5">
            <span>Presupuesto usado ({spendPct}%)</span>
            <span>{fmt(budgetSpent)} / {fmt(budgetTotal)}</span>
          </div>
          <div className="h-2 bg-brand-border rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', sem==='green'?'bg-[#00FF88]':sem==='yellow'?'bg-[#FFB800]':'bg-[#FF3B30]')}
              style={{ width:`${spendPct}%` }} />
          </div>
        </div>
        <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-3 text-sm">
          <p className="text-brand-primary font-semibold text-xs mb-2">💰 GrowthFund — Distribución de comisiones</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="text-center"><p className="text-brand-muted">Comisión total</p><p className="text-white font-bold">{fmt(commissions)}</p></div>
            <div className="text-center"><p className="text-brand-muted">Tu ganancia (60%)</p><p className="text-[#00FF88] font-bold">{fmt(platformEarning)}</p></div>
            <div className="text-center"><p className="text-brand-muted">GrowthFund (40%)</p><p className="text-brand-primary font-bold">{fmt(growthFund)}</p></div>
          </div>
        </div>
      </div>

      {/* ── SplitTest™ ──────────────────────────────────────────────────────── */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical size={15} className="text-brand-primary" />
          <h2 className="text-sm font-semibold text-white">SplitTest™ — A/B Testing automático</h2>
          {winner && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-brand-green/15 text-brand-green rounded-full border border-brand-green/30 ml-auto">
              ✓ RESULTADO FINAL
            </span>
          )}
        </div>

        {winner && (
          <div className="mb-3 px-3 py-2 bg-brand-green/8 border border-brand-green/25 rounded-xl text-xs text-brand-green">
            🏆 <strong>Variante {winner.id} ganó</strong> con {winner.ctr}% CTR — presupuesto 100% redirigido
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {abVariants.map((v) => {
            const stCfg = VARIANT_STATUS[v.status]
            return (
              <div key={v.id} className={cn('rounded-xl border p-3 space-y-2', v.status === 'eliminated' ? 'opacity-50' : '')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Variante {v.id}</span>
                  <span className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded-full border', stCfg.color)}>{stCfg.label}</span>
                </div>
                <p className="text-[10px] text-brand-muted leading-relaxed">{v.desc}</p>
                <div className="flex gap-3 text-xs">
                  <div>
                    <p className="text-[9px] text-brand-faint">CTR</p>
                    <p className={cn('font-bold font-mono', v.status==='winner'?'text-brand-green':'text-white')}>{v.ctr}%</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-brand-faint">Ventas</p>
                    <p className="font-bold font-mono text-white">{v.sales}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-brand-faint">Presup.</p>
                    <p className="font-bold font-mono text-white">{v.spend}%</p>
                  </div>
                </div>
                {/* Barra CTR */}
                <div className="h-1 bg-brand-border rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', v.status==='winner'?'bg-brand-green':v.status==='running'?'bg-brand-yellow':'bg-brand-border')}
                    style={{ width:`${Math.min(100, v.ctr * 15)}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-brand-faint mt-3">
          El sistema evalúa las 4 variantes automáticamente después de 48hrs. La ganadora recibe 100% del presupuesto.
        </p>
      </div>

      {/* ── ReachBack™ ──────────────────────────────────────────────────────── */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
        <button
          className="flex items-center gap-2 w-full text-left"
          onClick={() => setReachExpanded((v) => !v)}
        >
          <RotateCcw size={15} className="text-brand-primary shrink-0" />
          <h2 className="text-sm font-semibold text-white flex-1">ReachBack™ — Retargeting activo</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-brand-green">+{reachTotals.total_conversions} ventas extra</span>
            <span className="text-brand-faint text-xs">{reachExpanded ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-brand-hover rounded-xl p-2.5">
            <p className="text-[9px] text-brand-faint">Personas recuperadas</p>
            <p className="text-sm font-bold font-mono text-brand-text">{reachTotals.total_reach.toLocaleString('es-MX')}</p>
          </div>
          <div className="bg-brand-hover rounded-xl p-2.5">
            <p className="text-[9px] text-brand-faint">Ventas adicionales</p>
            <p className="text-sm font-bold font-mono text-brand-green">{reachTotals.total_conversions}</p>
          </div>
          <div className="bg-brand-hover rounded-xl p-2.5">
            <p className="text-[9px] text-brand-faint">Ingresos extra</p>
            <p className="text-sm font-bold font-mono text-brand-primary">${reachTotals.total_revenue_mxn.toLocaleString('es-MX')}</p>
          </div>
        </div>

        {reachExpanded && (
          <div className="mt-4 space-y-3">
            {reachConfig.audiences.map((a) => (
              <div key={a.id} className="border border-brand-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-white">{a.name}</p>
                  <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                    a.status === 'active' ? 'bg-brand-green/15 text-brand-green border border-brand-green/30' : 'bg-brand-hover text-brand-faint border border-brand-border')}>
                    {a.status === 'active' ? '● ACTIVA' : '○ PAUSADA'}
                  </span>
                </div>
                <p className="text-[10px] text-brand-muted mb-2 italic">"{a.message}"</p>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div><span className="text-brand-faint">Alcance:</span> <span className="text-white">{a.reach.toLocaleString()}</span></div>
                  <div><span className="text-brand-faint">Ventas:</span> <span className="text-brand-green">{a.conversions}</span></div>
                  <div><span className="text-brand-faint">Ventana:</span> <span className="text-white">{a.window_days}d</span></div>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-brand-faint">
              Presupuesto ReachBack: 20% del presupuesto principal ({fmt(Math.round(budgetTotal * 0.2))})
            </p>
          </div>
        )}
      </div>

      {/* Creativos + imagen */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={16} className="text-brand-primary" /> Creativos del anuncio (AdBuilder)
        </h2>

        {/* Vista previa del anuncio */}
        <div className="mb-4 rounded-xl overflow-hidden border border-brand-border">
          {/* Imagen */}
          <div className="aspect-square max-h-48 bg-gradient-to-br from-brand-primary/20 via-brand-card to-brand-green/10 relative flex items-center justify-center">
            {imageUrl && hasOpenAI ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={productName} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center px-4">
                <p className="text-base font-bold text-white">{productName}</p>
                <p className="text-xs text-brand-primary mt-1">📸 Imagen generada por DALL-E 3</p>
                <p className="text-[9px] text-brand-faint mt-0.5">Agrega OPENAI_API_KEY para activar</p>
              </div>
            )}
          </div>
          {/* Texto del anuncio */}
          <div className="p-3 bg-brand-hover">
            <p className="text-sm font-semibold text-white">
              {creatives[0] ? String(creatives[0].headline) : `${productName} — Oferta especial`}
            </p>
            <p className="text-xs text-brand-muted mt-1">
              {creatives[0] ? String(creatives[0].body_copy) : `Disponible ahora. Envío a todo México.`}
            </p>
            <div className="mt-2">
              <span className="text-[10px] bg-brand-primary text-white px-3 py-1 rounded-full font-semibold">
                {creatives[0] ? String(creatives[0].cta) : 'Comprar ahora'}
              </span>
            </div>
          </div>
        </div>

        {/* Formatos */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-brand-hover rounded-lg p-2 text-center">
            <p className="text-[9px] text-brand-faint mb-1">📘 Meta Feed (1:1)</p>
            <div className="w-full aspect-square rounded border border-brand-border overflow-hidden relative">
              <ProductImage keyword={productName} size="hero" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-1.5">
                <span className="text-[8px] text-white/80 font-medium truncate">{productName}</span>
              </div>
            </div>
          </div>
          <div className="bg-brand-hover rounded-lg p-2 text-center">
            <p className="text-[9px] text-brand-faint mb-1">🎵 TikTok (9:16)</p>
            <div className="w-full" style={{ aspectRatio: '9/16' }}>
              <div className="w-full h-full rounded border border-brand-border overflow-hidden relative">
                <ProductImage keyword={productName} size="hero" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                  <span className="text-[8px] text-white/80 font-medium line-clamp-2">{productName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 px-3 py-2 bg-brand-hover border border-brand-border text-brand-muted rounded-xl text-xs hover:text-brand-text transition-colors">
            ⬇ Descargar creativos
          </button>
          <button className="flex-1 px-3 py-2 btn-gradient text-white rounded-xl text-xs font-semibold">
            Listo para campaña →
          </button>
        </div>
      </div>

      {/* Audiencia */}
      {!!creatives[0]?.audience_data && (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Users size={16} className="text-brand-primary" /> Audiencia objetivo
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {Object.entries(creatives[0].audience_data as Record<string, unknown>).map(([k, v]) => (
              <div key={k} className="bg-brand-hover/60 rounded-lg p-2">
                <p className="text-brand-muted capitalize">{k.replace(/_/g, ' ')}</p>
                <p className="text-white font-medium">{Array.isArray(v) ? v.join(', ') : String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfica */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-brand-primary" /> Rendimiento últimos 14 días
        </h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={40}
                tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
              <Tooltip
                contentStyle={{ background: '#0D1F3C', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v, name) => [
                  name === 'roi' ? `${v}%` : `$${(Number(v)/100).toLocaleString('es-MX')} MXN`,
                  name === 'ventas' ? 'Ventas' : name === 'gasto' ? 'Gasto' : 'ROI',
                ]}
              />
              <Line type="monotone" dataKey="ventas" stroke="#00FF88" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="gasto"  stroke="#FF3B30" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5 text-xs text-brand-muted"><span className="w-3 h-0.5 bg-[#00FF88] inline-block" /> Ventas</div>
          <div className="flex items-center gap-1.5 text-xs text-brand-muted"><span className="w-3 h-0.5 bg-[#FF3B30] inline-block" /> Gasto</div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        {sem !== 'paused' && sem !== 'red' ? (
          <button onClick={handlePause} disabled={isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30 rounded-xl text-sm font-medium hover:bg-[#FF3B30]/20 transition-colors disabled:opacity-50">
            <Pause size={14} /> Pausar campaña
          </button>
        ) : (
          <button onClick={handleResume} disabled={isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 rounded-xl text-sm font-medium hover:bg-[#00FF88]/20 transition-colors disabled:opacity-50">
            <Play size={14} /> Reactivar campaña
          </button>
        )}
        <button onClick={() => router.back()}
          className="px-4 py-2.5 bg-brand-border text-white rounded-xl text-sm hover:bg-brand-border/80 transition-colors">
          Volver
        </button>
      </div>
    </div>
  )
}
