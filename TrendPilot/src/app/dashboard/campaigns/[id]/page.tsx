'use client'

import { use, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, Radio, TrendingUp, TrendingDown, AlertTriangle,
  Pause, Play, Zap, Users, DollarSign, ShoppingCart, BarChart3,
} from 'lucide-react'
import { cn } from '@/utils'

// recharts — carga solo en cliente
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line      = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })
const XAxis     = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis     = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const Tooltip   = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })

// Mock de datos de rendimiento por día
function generateMockDailyData(days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (days - 1 - i))
    const sales = Math.round(5000 + Math.random() * 15000)
    const spend = Math.round(1000 + Math.random() * 3000)
    return {
      date:  date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      ventas: sales,
      gasto:  spend,
      roi:    Math.round(((sales - spend) / spend) * 100),
    }
  })
}

const semConfig = {
  green:  { label: 'Activa',     color: 'text-[#00FF88]', bg: 'bg-[#00FF88]/10 border-[#00FF88]/30', icon: TrendingUp },
  yellow: { label: 'En revisión',color: 'text-[#FFB800]', bg: 'bg-[#FFB800]/10 border-[#FFB800]/30', icon: AlertTriangle },
  red:    { label: 'Pausada',    color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10 border-[#FF3B30]/30', icon: TrendingDown },
  paused: { label: 'Pausada',    color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10 border-[#FF3B30]/30', icon: Pause },
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n / 100)
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [campaign, setCampaign]     = useState<Record<string, unknown> | null>(null)
  const [creatives, setCreatives]   = useState<Record<string, unknown>[]>([])
  const [loading, setLoading]       = useState(true)
  const [dailyData]                 = useState(generateMockDailyData(14))
  const [isPending, startTrans]     = useTransition()
  const [actionMsg, setActionMsg]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [cRes, adRes] = await Promise.all([
          fetch(`/api/campaigns/${id}`),
          fetch(`/api/ad-creatives?campaign_id=${id}`),
        ])
        if (cRes.ok) {
          const { data } = await cRes.json()
          setCampaign(data)
        }
        if (adRes.ok) {
          const { data } = await adRes.json()
          setCreatives(data ?? [])
        }
      } catch { /* mostrar mock */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handlePause() {
    startTrans(async () => {
      const res = await fetch(`/api/campaigns/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'paused', pause_reason: 'Pausa manual desde el panel' }),
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
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'yellow', semaphore_color: 'yellow' }),
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
        <div className="h-48 bg-brand-surface border border-brand-border rounded-2xl" />
        <div className="h-64 bg-brand-surface border border-brand-border rounded-2xl" />
      </div>
    )
  }

  // Usar datos reales o mock
  const sem = (campaign?.semaphore_color as keyof typeof semConfig) ?? 'yellow'
  const cfg = semConfig[sem] ?? semConfig.yellow
  const Icon = cfg.icon

  const budgetTotal    = Number(campaign?.budget_total  ?? 500000)
  const budgetSpent    = Number(campaign?.budget_spent  ?? 210000)
  const salesGenerated = Number(campaign?.sales_generated ?? 1800000)
  const commissions    = Number(campaign?.commissions_earned ?? 360000)
  const roi            = budgetSpent > 0 ? Math.round(((salesGenerated - budgetSpent) / budgetSpent) * 100) : 0
  const growthFund     = Math.round(commissions * 0.4)
  const platformEarning = commissions - growthFund
  const spendPct       = Math.min(100, Math.round((budgetSpent / budgetTotal) * 100))

  const productName = (campaign?.products as { name?: string })?.name ?? 'Audífonos Bluetooth Pro'
  const vendorName  = (campaign?.vendors  as { name?: string })?.name ?? 'TechStore MX'
  const platform    = String(campaign?.platform ?? 'meta')

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
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-brand-muted">{vendorName} · {platform.toUpperCase()}</p>
        </div>
      </div>

      {actionMsg && (
        <div className="bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl px-4 py-2.5 text-sm text-[#00FF88]">
          {actionMsg}
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'ROI', value: `${roi > 0 ? '+' : ''}${roi}%`, icon: TrendingUp, color: roi >= 150 ? 'text-[#00FF88]' : roi >= 80 ? 'text-[#FFB800]' : 'text-[#FF3B30]' },
          { label: 'Ventas',     value: fmt(salesGenerated), icon: ShoppingCart, color: 'text-white' },
          { label: 'Gastado',    value: fmt(budgetSpent),    icon: DollarSign,   color: 'text-white' },
          { label: 'Comisiones', value: fmt(commissions),    icon: BarChart3,    color: 'text-brand-primary' },
        ].map((m) => (
          <div key={m.label} className="bg-brand-surface border border-brand-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon size={12} className="text-brand-muted" />
              <p className="text-[10px] text-brand-muted">{m.label}</p>
            </div>
            <p className={cn('text-lg font-bold', m.color)}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Progreso + GrowthFund */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-4">
        <div>
          <div className="flex justify-between text-xs text-brand-muted mb-1.5">
            <span>Presupuesto usado ({spendPct}%)</span>
            <span>{fmt(budgetSpent)} / {fmt(budgetTotal)}</span>
          </div>
          <div className="h-2 bg-brand-border rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', sem === 'green' ? 'bg-[#00FF88]' : sem === 'yellow' ? 'bg-[#FFB800]' : 'bg-[#FF3B30]')}
              style={{ width: `${spendPct}%` }}
            />
          </div>
        </div>

        <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-3 text-sm">
          <p className="text-brand-primary font-semibold text-xs mb-2">💰 GrowthFund — Distribución de comisiones</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="text-center">
              <p className="text-brand-muted">Comisión total</p>
              <p className="text-white font-bold">{fmt(commissions)}</p>
            </div>
            <div className="text-center">
              <p className="text-brand-muted">Tu ganancia (60%)</p>
              <p className="text-[#00FF88] font-bold">{fmt(platformEarning)}</p>
            </div>
            <div className="text-center">
              <p className="text-brand-muted">GrowthFund (40%)</p>
              <p className="text-brand-primary font-bold">{fmt(growthFund)}</p>
            </div>
          </div>
          <p className="text-[10px] text-brand-muted mt-2">
            El GrowthFund se asigna automáticamente a las próximas campañas del vendor.
          </p>
        </div>
      </div>

      {/* Gráfica de rendimiento */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-brand-primary" />
          Rendimiento últimos 14 días
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
                  name === 'roi' ? `${v}%` : `$${(Number(v) / 100).toLocaleString('es-MX')} MXN`,
                  name === 'ventas' ? 'Ventas' : name === 'gasto' ? 'Gasto' : 'ROI'
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

      {/* Creativos del AdBuilder */}
      {(creatives.length > 0 || true) && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={16} className="text-brand-primary" />
            Creativos del anuncio (AdBuilder)
          </h2>
          {creatives.length > 0 ? (
            <div className="space-y-3">
              {creatives.map((c) => (
                <div key={String(c.id)} className="bg-brand-bg/60 border border-brand-border rounded-xl p-4">
                  <p className="text-sm font-medium text-white">{String(c.headline)}</p>
                  <p className="text-xs text-brand-muted mt-1">{String(c.body_copy)}</p>
                  <span className="text-[10px] bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded-full mt-2 inline-block">{String(c.cta)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-brand-bg/60 border border-brand-border rounded-xl p-4">
              <p className="text-sm font-medium text-white">{productName} — Oferta especial</p>
              <p className="text-xs text-brand-muted mt-1">Disponible con envío a todo México. ¡Compra hoy y recíbelo en 3 días!</p>
              <span className="text-[10px] bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded-full mt-2 inline-block">Comprar ahora</span>
            </div>
          )}

          {/* Imagen placeholder */}
          <div className="mt-4 relative bg-gradient-to-br from-brand-primary/20 to-[#00FF88]/10 border border-brand-primary/30 rounded-xl h-28 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-semibold text-white">{productName}</p>
              <p className="text-[10px] text-brand-primary mt-1">DALL-E 3 se conecta en sesión 5</p>
            </div>
          </div>
        </div>
      )}

      {/* Audiencia */}
      {!!creatives[0]?.audience_data && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Users size={16} className="text-brand-primary" />
            Audiencia objetivo
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {Object.entries(creatives[0].audience_data as Record<string, unknown>).map(([k, v]) => (
              <div key={k} className="bg-brand-bg/60 rounded-lg p-2">
                <p className="text-brand-muted capitalize">{k.replace(/_/g, ' ')}</p>
                <p className="text-white font-medium">{Array.isArray(v) ? v.join(', ') : String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3">
        {sem !== 'paused' && sem !== 'red' ? (
          <button
            onClick={handlePause}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30 rounded-xl text-sm font-medium hover:bg-[#FF3B30]/20 transition-colors disabled:opacity-50"
          >
            <Pause size={14} /> Pausar campaña
          </button>
        ) : (
          <button
            onClick={handleResume}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 rounded-xl text-sm font-medium hover:bg-[#00FF88]/20 transition-colors disabled:opacity-50"
          >
            <Play size={14} /> Reactivar campaña
          </button>
        )}
        <button
          onClick={() => router.back()}
          className="px-4 py-2.5 bg-brand-border text-white rounded-xl text-sm hover:bg-brand-border/80 transition-colors"
        >
          Volver
        </button>
      </div>
    </div>
  )
}
