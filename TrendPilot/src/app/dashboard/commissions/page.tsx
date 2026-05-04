'use client'

import { useEffect, useState, useCallback } from 'react'
import { Coins, Download, Filter, TrendingUp } from 'lucide-react'
import { cn } from '@/utils'

interface Commission {
  id:               string
  campaign_id:      string
  vendor_id:        string
  sale_amount:      number
  commission_rate:  number
  commission_amount: number
  growth_fund_amount: number
  status:           'pending' | 'paid'
  created_at:       string
  paid_at?:         string
  // datos de join
  product_name?:    string
  vendor_name?:     string
}

// Mock de 20 comisiones para demostración
function buildMock(): Commission[] {
  const vendors   = ['TechStore MX', 'EcoModa', 'VidaSana', 'FitStyle', 'HomePlus']
  const products  = ['Audífonos BT Pro', 'Bolsas ecológicas', 'Colágeno Premium', 'Leggings Deportivos', 'Aspiradora Mini']
  const statuses: Array<'paid' | 'pending'> = ['paid', 'paid', 'paid', 'pending', 'paid']

  return Array.from({ length: 20 }, (_, i) => {
    const sale = Math.round((3000 + Math.random() * 12000) * 100)
    const rate = 0.20
    const comm = Math.round(sale * rate)
    const gf   = Math.round(comm * 0.4)
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 30))
    return {
      id:               `comm-${i + 1}`,
      campaign_id:      `camp-${i % 5}`,
      vendor_id:        `vendor-${i % 5}`,
      sale_amount:      sale,
      commission_rate:  rate,
      commission_amount: comm,
      growth_fund_amount: gf,
      status:           statuses[i % 5],
      created_at:       date.toISOString(),
      product_name:     products[i % 5],
      vendor_name:      vendors[i % 5],
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
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
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

  // Intentar cargar desde API; si está vacío usar mock
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/commissions?limit=100')
        if (res.ok) {
          const json = await res.json()
          if (json.data && json.data.length > 0) {
            setCommissions(json.data)
          } else {
            setCommissions(buildMock())
          }
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

  const filtered = statusFilter === 'all'
    ? commissions
    : commissions.filter((c) => c.status === statusFilter)

  const paginated = filtered.slice((page - 1) * limit, page * limit)
  const totalPages = Math.ceil(filtered.length / limit)

  // Estadísticas del mes actual
  const thisMonth = commissions.filter((c) => {
    const d = new Date(c.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const totalComm    = thisMonth.reduce((s, c) => s + c.commission_amount, 0)
  const totalGF      = thisMonth.reduce((s, c) => s + c.growth_fund_amount, 0)
  const netEarning   = totalComm - totalGF
  const allTimeComm  = commissions.reduce((s, c) => s + c.commission_amount, 0)

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Coins size={24} className="text-brand-primary" />
            Comisiones
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {commissions.length} transacciones · GrowthFund incluido
          </p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-surface border border-brand-border text-brand-muted hover:text-white rounded-xl text-sm transition-colors"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      {/* KPIs del mes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1">Comisiones del mes</p>
          <p className="text-xl font-bold text-white">{fmt(totalComm)}</p>
        </div>
        <div className="bg-brand-surface border border-[#00FF88]/30 rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1">Tu ganancia neta (60%)</p>
          <p className="text-xl font-bold text-[#00FF88]">{fmt(netEarning)}</p>
        </div>
        <div className="bg-brand-surface border border-brand-primary/30 rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1 flex items-center gap-1">
            💰 GrowthFund acumulado
          </p>
          <p className="text-xl font-bold text-brand-primary">{fmt(totalGF)}</p>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1 flex items-center gap-1">
            <TrendingUp size={10} /> Total histórico
          </p>
          <p className="text-xl font-bold text-white">{fmt(allTimeComm)}</p>
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
                : 'bg-brand-surface text-brand-muted border-brand-border hover:text-white'
            )}
          >
            {s === 'all' ? 'Todos' : s === 'paid' ? 'Pagado' : 'Pendiente'}
          </button>
        ))}
        <span className="ml-auto text-xs text-brand-muted">{filtered.length} registros</span>
      </div>

      {/* Tabla */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
        {/* Cabeceras */}
        <div className="grid grid-cols-[80px_1fr_1fr_90px_70px_90px_90px_80px_70px] gap-3 px-4 py-3 border-b border-brand-border text-[10px] font-semibold text-brand-muted uppercase tracking-wider">
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
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 border-b border-brand-border animate-pulse px-4 flex items-center gap-3">
              <div className="h-3 bg-brand-border rounded w-full" />
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
                className="grid grid-cols-[80px_1fr_1fr_90px_70px_90px_90px_80px_70px] gap-3 px-4 py-3 border-b border-brand-border hover:bg-brand-border/10 transition-colors items-center text-xs"
              >
                <span className="text-brand-muted tabular-nums">{fmtDate(c.created_at)}</span>
                <span className="text-white truncate">{c.product_name ?? 'Producto'}</span>
                <span className="text-brand-muted truncate">{c.vendor_name ?? 'Vendor'}</span>
                <span className="text-white tabular-nums">{fmt(c.sale_amount)}</span>
                <span className="text-brand-muted">{(c.commission_rate * 100).toFixed(0)}%</span>
                <span className="text-white font-medium tabular-nums">{fmt(c.commission_amount)}</span>
                <span className="text-brand-primary tabular-nums">{fmt(c.growth_fund_amount)}</span>
                <span className="text-[#00FF88] tabular-nums">{fmt(net)}</span>
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full text-center',
                  c.status === 'paid'
                    ? 'bg-[#00FF88]/10 text-[#00FF88]'
                    : 'bg-[#FFB800]/10 text-[#FFB800]'
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
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs bg-brand-surface border border-brand-border rounded-lg text-brand-muted hover:text-white disabled:opacity-40">Anterior</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs bg-brand-surface border border-brand-border rounded-lg text-brand-muted hover:text-white disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  )
}
