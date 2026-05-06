'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic                          from 'next/dynamic'
import {
  Coins, Download, Filter, TrendingUp, Zap,
  BarChart2, Sliders, ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils'

// Recharts: importar sin SSR — dos componentes separados
const GrowthFundLineChart = dynamic(
  () => import('@/components/dashboard/GrowthFundCharts').then((m) => m.GrowthFundLineChart),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-brand-hover rounded-xl" /> },
)
const ProjectionsBarChart = dynamic(
  () => import('@/components/dashboard/GrowthFundCharts').then((m) => m.ProjectionsBarChart),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-brand-hover rounded-xl" /> },
)

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Commission {
  id:                  string
  campaign_id:         string
  vendor_id:           string
  sale_amount:         number
  commission_rate:     number
  commission_amount:   number
  growth_fund_amount:  number
  status:              'pending' | 'paid'
  created_at:          string
  paid_at?:            string
  product_name?:       string
  vendor_name?:        string
}

type Tab = 'commissions' | 'growthfund' | 'projections'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n / 100)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
}

function exportCSV(data: Commission[]) {
  const headers = ['Fecha', 'Producto', 'Vendor', 'Venta', 'Tasa %', 'Comisión', 'GrowthFund', 'Neta', 'Estado']
  const rows = data.map((c) => [
    fmtDate(c.created_at), c.product_name ?? '', c.vendor_name ?? '',
    fmt(c.sale_amount), `${(c.commission_rate * 100).toFixed(0)}%`,
    fmt(c.commission_amount), fmt(c.growth_fund_amount),
    fmt(c.commission_amount - c.growth_fund_amount),
    c.status === 'paid' ? 'Pagado' : 'Pendiente',
  ])
  const csv  = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'comisiones-trendpilot.csv'; a.click()
  URL.revokeObjectURL(url)
}

// Genera datos de GrowthFund por mes (últimos 6 meses)
function buildMonthlyGF(commissions: Commission[]) {
  const months: Record<string, number> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months[d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })] = 0
  }
  for (const c of commissions) {
    const d   = new Date(c.created_at)
    const key = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
    if (key in months) months[key] += c.growth_fund_amount
  }
  return Object.entries(months).map(([month, amount]) => ({ month, amount }))
}

// Genera proyecciones a 12 meses
function buildProjections(monthlySalesCents: number, rate = 0.20) {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return months.map((month, i) => {
    // Simular crecimiento gradual (3% mensual)
    const growth    = Math.pow(1.03, i)
    const sales     = Math.round(monthlySalesCents * growth)
    const comm      = Math.round(sales * rate)
    const gf        = Math.round(comm * 0.3)
    const net       = comm - gf
    return { month, commissions: comm, growthfund: gf, net }
  })
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState<Tab>('commissions')
  const [statusFilter, setStatus]     = useState<'all' | 'paid' | 'pending'>('all')
  const [page, setPage]               = useState(1)
  const [monthlySales, setMonthlySales] = useState(500_000)   // $5,000 MXN por defecto
  const [commRate, setCommRate]         = useState(20)         // 20% comisión
  const limit = 20

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/commissions?limit=100')
        if (res.ok) {
          const json = await res.json()
          setCommissions(json.data ?? [])
        }
      } catch {
        setCommissions([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Métricas del mes actual
  const thisMonth = useMemo(() => {
    const now = new Date()
    return commissions.filter((c) => {
      const d = new Date(c.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
  }, [commissions])

  const totalComm   = thisMonth.reduce((s, c) => s + c.commission_amount,  0)
  const totalGF     = thisMonth.reduce((s, c) => s + c.growth_fund_amount, 0)
  const netEarning  = totalComm - totalGF
  const pendingComm = commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commission_amount, 0)
  const gfPct       = Math.min(100, Math.round((totalGF / 20_000_000) * 100))

  const filtered    = statusFilter === 'all' ? commissions : commissions.filter((c) => c.status === statusFilter)
  const paginated   = filtered.slice((page - 1) * limit, page * limit)
  const totalPages  = Math.ceil(filtered.length / limit)

  const monthlyGF   = useMemo(() => buildMonthlyGF(commissions), [commissions])
  const projections = useMemo(() => buildProjections(monthlySales * 100, commRate / 100), [monthlySales, commRate])

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'commissions', label: 'Comisiones',   icon: Coins    },
    { id: 'growthfund',  label: 'GrowthFund',   icon: Zap      },
    { id: 'projections', label: 'Proyecciones', icon: BarChart2 },
  ]

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Encabezado */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
              <Coins size={15} className="text-brand-primary" />
            </div>
            Comisiones y GrowthFund
          </h1>
          <p className="text-sm text-brand-muted mt-1">{commissions.length} transacciones · GrowthFund 30% incluido</p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-card border border-brand-border text-brand-muted hover:text-brand-text rounded-xl text-sm transition-colors"
        >
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '60ms' }}>
        {[
          { label: '💰 Comisiones del mes', value: fmt(totalComm),   color: '' },
          { label: '📈 Tu ganancia neta',   value: fmt(netEarning),  color: 'gradient-text-green' },
          { label: '⚡ GrowthFund (30%)',   value: fmt(totalGF),     color: 'gradient-text' },
          { label: '📊 Pendientes',         value: fmt(pendingComm), color: 'text-brand-yellow' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-brand-card border border-brand-border rounded-2xl p-4">
            <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest mb-2">{label}</p>
            <p className={`text-xl font-bold font-mono ${color || 'text-brand-text'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-brand-card border border-brand-border rounded-2xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === id
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-brand-muted hover:text-brand-text',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Comisiones ─────────────────────────────────────────────────── */}
      {activeTab === 'commissions' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-brand-muted" />
            {(['all', 'paid', 'pending'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border',
                  statusFilter === s
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-brand-card text-brand-muted border-brand-border hover:text-brand-text',
                )}
              >
                {s === 'all' ? 'Todos' : s === 'paid' ? 'Pagado' : 'Pendiente'}
              </button>
            ))}
            <span className="ml-auto text-xs text-brand-muted">{filtered.length} registros</span>
          </div>

          {/* Tabla */}
          <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[80px_1fr_1fr_90px_55px_90px_90px_80px_72px] gap-2 px-4 py-3 border-b border-brand-border text-[10px] font-semibold text-brand-faint uppercase tracking-wider">
              <span>Fecha</span><span>Producto</span><span>Vendor</span>
              <span>Venta</span><span>%</span><span>Comisión</span>
              <span>GrowthFund</span><span>Neta</span><span>Estado</span>
            </div>

            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 border-b border-brand-border animate-pulse px-4 flex items-center">
                    <div className="h-3 bg-brand-hover rounded w-full" />
                  </div>
                ))
              : paginated.length === 0
                ? (
                  <div className="text-center py-12 text-brand-muted">
                    <Coins size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Sin comisiones con este filtro.</p>
                  </div>
                )
                : paginated.map((c) => {
                    const net = c.commission_amount - c.growth_fund_amount
                    return (
                      <div
                        key={c.id}
                        className="grid grid-cols-[80px_1fr_1fr_90px_55px_90px_90px_80px_72px] gap-2 px-4 py-3 border-b border-brand-border hover:bg-brand-hover/30 transition-colors items-center text-xs"
                      >
                        <span className="text-brand-muted tabular-nums">{fmtDate(c.created_at)}</span>
                        <span className="text-brand-text truncate font-medium">{c.product_name ?? 'Producto'}</span>
                        <span className="text-brand-muted truncate">{c.vendor_name ?? 'Vendor'}</span>
                        <span className="text-brand-text tabular-nums font-mono">{fmt(c.sale_amount)}</span>
                        <span className="text-brand-muted">{(c.commission_rate * 100).toFixed(0)}%</span>
                        <span className="text-brand-text font-medium tabular-nums font-mono">{fmt(c.commission_amount)}</span>
                        <span className="text-brand-primary tabular-nums font-mono">{fmt(c.growth_fund_amount)}</span>
                        <span className="text-brand-green tabular-nums font-mono">{fmt(net)}</span>
                        <span className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-full text-center',
                          c.status === 'paid'
                            ? 'bg-brand-green/10 text-brand-green'
                            : 'bg-brand-yellow/10 text-brand-yellow',
                        )}>
                          {c.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </div>
                    )
                  })
            }
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-brand-muted">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs bg-brand-card border border-brand-border rounded-lg text-brand-muted hover:text-brand-text disabled:opacity-40">
                  Anterior
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs bg-brand-card border border-brand-border rounded-lg text-brand-muted hover:text-brand-text disabled:opacity-40">
                  Siguiente
                </button>
              </div>
            </div>
          )}

          <div className="bg-brand-primary/8 border border-brand-primary/20 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={13} className="text-brand-primary" />
              <p className="text-xs font-semibold text-brand-primary">Sobre las comisiones</p>
            </div>
            <p className="text-xs text-brand-muted leading-relaxed">
              TrendPilot cobra entre <strong className="text-brand-text">15-30%</strong> por cada venta generada.
              El <strong className="text-brand-text">30%</strong> de esa comisión va al GrowthFund.
              El <strong className="text-brand-text">70%</strong> restante es la ganancia neta de la plataforma.
            </p>
          </div>
        </div>
      )}

      {/* ── TAB 2: GrowthFund ─────────────────────────────────────────────────── */}
      {activeTab === 'growthfund' && (
        <div className="space-y-5 animate-fade-in">

          {/* Hero GrowthFund */}
          <div className="bg-brand-card border border-brand-primary/25 rounded-2xl p-6">
            <div className="flex items-start gap-8">
              {/* Círculo */}
              <div className="relative w-32 h-32 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#1a2744" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke="url(#gfGradFund)" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - gfPct / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient id="gfGradFund" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="#0066FF" />
                      <stop offset="100%" stopColor="#00FF88" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold font-mono gradient-text leading-none">{fmt(totalGF)}</span>
                  <span className="text-[10px] text-brand-faint mt-0.5">GrowthFund</span>
                  <span className="text-[10px] text-brand-faint font-mono">{gfPct}%</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={16} className="text-brand-primary" />
                  <h3 className="text-lg font-bold text-brand-text">GrowthFund activo</h3>
                  <span className="text-[10px] font-bold bg-brand-primary/15 text-brand-primary px-2 py-0.5 rounded-full">
                    30% de comisiones
                  </span>
                </div>
                <p className="text-sm text-brand-muted leading-relaxed mb-4">
                  Cada venta genera una comisión. El 30% de esa comisión se reinvierte
                  <strong className="text-brand-text"> automáticamente</strong> en las campañas con mayor ROI,
                  acelerando el crecimiento sin costo adicional para los vendors.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total generado', value: fmt(totalGF) },
                    { label: 'Distribuido hoy', value: fmt(Math.round(totalGF * 0.8)) },
                    { label: 'Campañas activas', value: '5' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-brand-hover/50 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-brand-faint mb-1">{label}</p>
                      <p className="text-sm font-bold font-mono gradient-text">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Gráfica acumulación mensual */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-brand-text mb-4">Acumulación mensual — últimos 6 meses</h3>
            <GrowthFundLineChart data={monthlyGF} />
          </div>

          {/* Últimas distribuciones */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-brand-text mb-4">Distribuciones recientes</h3>
            {commissions.length === 0 ? (
              <div className="text-center py-10">
                <Zap size={28} className="mx-auto mb-2 text-brand-faint opacity-30" />
                <p className="text-sm text-brand-faint">Las distribuciones aparecerán cuando haya comisiones</p>
              </div>
            ) : (
              <div className="space-y-2">
                {commissions.slice(0, 5).filter(c => c.growth_fund_amount > 0).map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-brand-hover/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-brand-primary/15 flex items-center justify-center shrink-0">
                        <Zap size={11} className="text-brand-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-brand-text">{c.product_name ?? 'Producto'}</p>
                        <p className="text-xs text-brand-faint">{fmtDate(c.created_at)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold font-mono gradient-text">+{fmt(c.growth_fund_amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Proyecciones ───────────────────────────────────────────────── */}
      {activeTab === 'projections' && (
        <div className="space-y-5 animate-fade-in">

          {/* Simulador */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Sliders size={15} className="text-brand-primary" />
              <h3 className="text-sm font-bold text-brand-text">Simulador de proyecciones</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              {/* Slider ventas mensuales */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-medium text-brand-muted">Ventas mensuales estimadas</label>
                  <span className="text-xs font-bold font-mono text-brand-text">
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(monthlySales)}
                  </span>
                </div>
                <input
                  type="range" min={10000} max={2000000} step={10000}
                  value={monthlySales}
                  onChange={(e) => setMonthlySales(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#0066FF' }}
                />
                <div className="flex justify-between mt-1 text-[10px] text-brand-faint">
                  <span>$10K</span><span>$2M</span>
                </div>
              </div>

              {/* Tasa comisión */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-medium text-brand-muted">Tasa de comisión promedio</label>
                  <span className="text-xs font-bold font-mono text-brand-text">{commRate}%</span>
                </div>
                <input
                  type="range" min={15} max={30} step={1}
                  value={commRate}
                  onChange={(e) => setCommRate(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#00FF88' }}
                />
                <div className="flex justify-between mt-1 text-[10px] text-brand-faint">
                  <span>15%</span><span>30%</span>
                </div>
              </div>
            </div>

            {/* Métricas de proyección (mes 1) */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Comisión mensual',
                  value: fmt(projections[0].commissions),
                  sub:   `${commRate}% de ventas`,
                  color: 'text-brand-text',
                },
                {
                  label: 'GrowthFund mensual',
                  value: fmt(projections[0].growthfund),
                  sub:   '30% de comisión',
                  color: 'gradient-text',
                },
                {
                  label: 'Ganancia neta mensual',
                  value: fmt(projections[0].net),
                  sub:   '70% de comisión',
                  color: 'gradient-text-green',
                },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="bg-brand-hover/40 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-brand-faint uppercase tracking-wider mb-2">{label}</p>
                  <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
                  <p className="text-[10px] text-brand-faint mt-1">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfica proyecciones 12 meses */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-brand-text">Proyección 12 meses</h3>
              <div className="flex items-center gap-3 text-xs text-brand-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-green" />Ganancia neta
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-primary" />GrowthFund
                </span>
              </div>
            </div>
            <ProjectionsBarChart data={projections} />
          </div>

          {/* Resumen anual */}
          <div className="bg-gradient-to-r from-brand-primary/10 to-brand-green/10 border border-brand-primary/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ChevronRight size={14} className="text-brand-primary" />
              <h3 className="text-sm font-bold text-brand-text">Resumen proyección anual</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Total comisiones',
                  value: fmt(projections.reduce((s, p) => s + p.commissions, 0)),
                },
                {
                  label: 'GrowthFund acumulado',
                  value: fmt(projections.reduce((s, p) => s + p.growthfund, 0)),
                },
                {
                  label: 'Ganancia neta anual',
                  value: fmt(projections.reduce((s, p) => s + p.net, 0)),
                },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-[10px] text-brand-faint uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-base font-bold font-mono gradient-text">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-brand-faint mt-3 text-center">
              Crecimiento compuesto 3% mensual · Tasa {commRate}% · Basado en ${(monthlySales / 1000).toFixed(0)}K MXN/mes
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
