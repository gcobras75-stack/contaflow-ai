'use client'

import { useEffect, useState } from 'react'
import { Coins, Download, Filter, TrendingUp, Zap } from 'lucide-react'
import { cn } from '@/utils'

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

// ─── Mock: 25 comisiones realistas del último mes ─────────────────────────────

function buildMock(): Commission[] {
  const vendors   = ['TechStore MX', 'EcoModa', 'VidaSana', 'FitStyle MX', 'JoyasOaxaca', 'NutriPro', 'HomePlus', 'GadgetsMX']
  const products  = ['Audífonos BT Pro', 'Bolsas ecológicas', 'Colágeno Premium', 'Leggings Deportivos', 'Aretes Plata', 'Proteína Chocolate', 'Aspiradora Mini', 'Cargador Solar']
  const rates     = [0.15, 0.18, 0.20, 0.22, 0.25, 0.28, 0.30]
  const statuses: Array<'paid' | 'pending'> = ['paid', 'paid', 'paid', 'paid', 'pending']

  return Array.from({ length: 25 }, (_, i) => {
    const saleBase = [12000, 25000, 8000, 45000, 18000, 32000, 6000, 22000, 55000, 9500]
    const sale     = Math.round((saleBase[i % saleBase.length] + Math.random() * 5000) * 100)
    const rate     = rates[i % rates.length]
    const comm     = Math.round(sale * rate)
    const gf       = Math.round(comm * 0.4)
    const date     = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 30))
    return {
      id:                  `comm-${String(i + 1).padStart(3, '0')}`,
      campaign_id:         `camp-${i % 8}`,
      vendor_id:           `vendor-${i % 8}`,
      sale_amount:         sale,
      commission_rate:     rate,
      commission_amount:   comm,
      growth_fund_amount:  gf,
      status:              statuses[i % 5],
      created_at:          date.toISOString(),
      product_name:        products[i % products.length],
      vendor_name:         vendors[i % vendors.length],
    }
  })
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n / 100)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
}

function exportCSV(data: Commission[]) {
  const headers = ['Fecha', 'Producto', 'Vendor', 'Venta', 'Tasa %', 'Comisión', 'GrowthFund', 'Ganancia neta', 'Estado']
  const rows = data.map((c) => [
    fmtDate(c.created_at),
    c.product_name ?? '',
    c.vendor_name ?? '',
    fmt(c.sale_amount),
    `${(c.commission_rate * 100).toFixed(0)}%`,
    fmt(c.commission_amount),
    fmt(c.growth_fund_amount),
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

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading]         = useState(true)
  const [statusFilter, setStatus]     = useState<'all' | 'paid' | 'pending'>('all')
  const [page, setPage]               = useState(1)
  const limit = 20

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/commissions?limit=100')
        if (res.ok) {
          const json = await res.json()
          setCommissions(json.data && json.data.length > 0 ? json.data : buildMock())
        } else {
          setCommissions(buildMock())
        }
      } catch {
        setCommissions(buildMock())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered   = statusFilter === 'all' ? commissions : commissions.filter((c) => c.status === statusFilter)
  const paginated  = filtered.slice((page - 1) * limit, page * limit)
  const totalPages = Math.ceil(filtered.length / limit)

  // Métricas del mes actual
  const thisMonth = commissions.filter((c) => {
    const d = new Date(c.created_at), now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const totalComm   = thisMonth.reduce((s, c) => s + c.commission_amount,  0)
  const totalGF     = thisMonth.reduce((s, c) => s + c.growth_fund_amount, 0)
  const netEarning  = totalComm - totalGF
  const pendingComm = commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commission_amount, 0)

  // % del GrowthFund usado este mes (máx ficticio para barra)
  const gfMonthlyTarget = 200000_00 // $200,000 MXN objetivo mensual en centavos
  const gfPct = Math.min(100, Math.round((totalGF / gfMonthlyTarget) * 100))

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
              <Coins size={15} className="text-brand-primary" />
            </div>
            Comisiones
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {commissions.length} transacciones · GrowthFund 40% incluido
          </p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-card border border-brand-border text-brand-muted hover:text-brand-text rounded-xl text-sm transition-colors"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      {/* KPIs del mes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '60ms' }}>
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest mb-2">💰 Comisiones del mes</p>
          <p className="text-xl font-bold font-mono text-brand-text">{fmt(totalComm)}</p>
        </div>
        <div className="bg-brand-card border border-brand-green/25 rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest mb-2">📈 Tu ganancia neta (60%)</p>
          <p className="text-xl font-bold font-mono gradient-text-green">{fmt(netEarning)}</p>
        </div>
        <div className="bg-brand-card border border-brand-primary/20 rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest mb-2">
            <span className="flex items-center gap-1"><Zap size={9} className="inline text-brand-primary" /> GrowthFund (40%)</span>
          </p>
          <p className="text-xl font-bold font-mono gradient-text">{fmt(totalGF)}</p>
        </div>
        <div className="bg-brand-card border border-brand-yellow/25 rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest mb-2">📊 Pendientes de pago</p>
          <p className="text-xl font-bold font-mono text-brand-yellow">{fmt(pendingComm)}</p>
        </div>
      </div>

      {/* GrowthFund Widget prominente */}
      <div className="bg-brand-card border border-brand-primary/25 rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex items-start gap-6">
          {/* Círculo grande */}
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--brand-hover, #1a2744)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="url(#gf-gradient)" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - gfPct / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
              <defs>
                <linearGradient id="gf-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#0066FF" />
                  <stop offset="100%" stopColor="#00FF88" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold font-mono gradient-text leading-none">{fmt(totalGF)}</span>
              <span className="text-[10px] text-brand-faint mt-0.5">GrowthFund</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Coins size={16} className="text-brand-primary" />
              <h3 className="text-base font-bold text-brand-text">GrowthFund</h3>
              <span className="text-[10px] font-bold bg-brand-primary/15 text-brand-primary px-2 py-0.5 rounded-full">40% de comisiones</span>
            </div>
            <p className="text-sm text-brand-muted leading-relaxed mb-3">
              Este fondo se <strong className="text-brand-text">reinvierte automáticamente</strong> en tus mejores campañas,
              acelerando el crecimiento sin costo adicional para los vendors.
            </p>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-brand-faint">Uso del mes</span>
                <span className="text-[10px] font-mono text-brand-primary">{gfPct}% del objetivo</span>
              </div>
              <div className="h-2 bg-brand-hover rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${gfPct}%`, background: 'linear-gradient(90deg, #0066FF, #00FF88)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

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
                : 'bg-brand-card text-brand-muted border-brand-border hover:text-brand-text'
            )}
          >
            {s === 'all' ? 'Todos' : s === 'paid' ? 'Pagado' : 'Pendiente'}
          </button>
        ))}
        <span className="ml-auto text-xs text-brand-muted">{filtered.length} registros</span>
      </div>

      {/* Tabla */}
      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[80px_1fr_1fr_90px_60px_90px_90px_80px_72px] gap-3 px-4 py-3 border-b border-brand-border text-[10px] font-semibold text-brand-faint uppercase tracking-wider">
          <span>Fecha</span>
          <span>Producto</span>
          <span>Vendor</span>
          <span>Venta</span>
          <span>%</span>
          <span>Comisión</span>
          <span>GrowthFund</span>
          <span>Neta</span>
          <span>Estado</span>
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 border-b border-brand-border animate-pulse px-4 flex items-center">
              <div className="h-3 bg-brand-hover rounded w-full" />
            </div>
          ))
        ) : paginated.length === 0 ? (
          <div className="text-center py-12 text-brand-muted">
            <Coins size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Sin comisiones con este filtro.</p>
          </div>
        ) : (
          paginated.map((c) => {
            const net = c.commission_amount - c.growth_fund_amount
            return (
              <div
                key={c.id}
                className="grid grid-cols-[80px_1fr_1fr_90px_60px_90px_90px_80px_72px] gap-3 px-4 py-3 border-b border-brand-border hover:bg-brand-hover/30 transition-colors items-center text-xs"
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
                    : 'bg-brand-yellow/10 text-brand-yellow'
                )}>
                  {c.status === 'paid' ? 'Pagado' : 'Pendiente'}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-brand-muted">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs bg-brand-card border border-brand-border rounded-lg text-brand-muted hover:text-brand-text disabled:opacity-40 transition-colors">
              Anterior
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs bg-brand-card border border-brand-border rounded-lg text-brand-muted hover:text-brand-text disabled:opacity-40 transition-colors">
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Info adicional */}
      <div className="bg-brand-primary/8 border border-brand-primary/20 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={13} className="text-brand-primary" />
          <p className="text-xs font-semibold text-brand-primary">Sobre las comisiones</p>
        </div>
        <p className="text-xs text-brand-muted leading-relaxed">
          TrendPilot cobra entre <strong className="text-brand-text">15-30%</strong> por cada venta generada.
          El <strong className="text-brand-text">40%</strong> de esa comisión va al GrowthFund para reinvertirse en las campañas de mejor desempeño.
          El <strong className="text-brand-text">60%</strong> restante es la ganancia neta de la plataforma.
        </p>
      </div>
    </div>
  )
}
