'use client'

import { useEffect, useState } from 'react'
import { Coins, TrendingUp, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { formatMXN } from '@/utils'

interface GrowthFundStats {
  available_cents:    number
  invested_this_month: number
  total_generated:    number
  roi_multiplier:     number   // promedio: cada peso genera X en ventas
  distributions:      Distribution[]
}

interface Distribution {
  campaign_name: string
  amount_cents:  number
  date:          string
  roi_after:     number
}

// Mock estático hasta que la API lo devuelva
const MOCK_STATS: GrowthFundStats = {
  available_cents:     124_500_00,
  invested_this_month: 38_200_00,
  total_generated:     412_000_00,
  roi_multiplier:      3.2,
  distributions: [
    { campaign_name: 'Aretes Plata — Meta',    amount_cents: 15_000_00, date: new Date(Date.now()-2*86400000).toISOString(), roi_after: 210 },
    { campaign_name: 'Bolsas Eco — TikTok',   amount_cents: 12_000_00, date: new Date(Date.now()-4*86400000).toISOString(), roi_after: 175 },
    { campaign_name: 'Suplementos — Meta',    amount_cents: 11_200_00, date: new Date(Date.now()-6*86400000).toISOString(), roi_after: 142 },
  ],
}

export function GrowthFundWidget() {
  const [stats, setStats] = useState<GrowthFundStats>(MOCK_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Intentar obtener datos reales de comisiones
    fetch('/api/commissions?limit=500')
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (!json?.data?.length) return
        const comms = json.data as Array<{ commission_amount: number; growth_fund_amount: number; sale_amount: number; created_at: string }>

        const totalGF   = comms.reduce((s, c) => s + (c.growth_fund_amount ?? 0), 0)
        const totalSales = comms.reduce((s, c) => s + (c.sale_amount ?? 0), 0)

        // Mes actual
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
        const monthComms = comms.filter((c) => new Date(c.created_at) >= monthStart)
        const investedMonth = monthComms.reduce((s, c) => s + (c.growth_fund_amount ?? 0), 0)

        setStats((prev) => ({
          ...prev,
          available_cents:     totalGF,
          invested_this_month: investedMonth,
          total_generated:     totalSales,
          roi_multiplier:      totalGF > 0 ? Number((totalSales / totalGF).toFixed(1)) : 0,
        }))
      })
      .catch(() => { /* usa mock */ })
      .finally(() => setLoading(false))
  }, [])

  const usedPct = stats.invested_this_month > 0 && stats.available_cents > 0
    ? Math.min(100, Math.round((stats.invested_this_month / (stats.available_cents + stats.invested_this_month)) * 100))
    : 24

  return (
    <div className="bg-brand-card border border-brand-primary/25 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-primary/15 flex items-center justify-center">
            <Coins size={13} className="text-brand-primary" />
          </div>
          <h2 className="text-sm font-bold text-brand-text">GrowthFund™</h2>
          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-brand-green/15 text-brand-green rounded-full">AUTO</span>
        </div>
        <Link href="/dashboard/commissions" className="text-xs text-brand-primary hover:underline flex items-center gap-1">
          Historial <ChevronRight size={11} />
        </Link>
      </div>

      {/* Monto disponible */}
      <div className="text-center py-2">
        <p className="text-[10px] text-brand-faint uppercase tracking-widest mb-1">Disponible ahora</p>
        <p className="text-3xl font-bold font-mono gradient-text">
          {loading ? '—' : formatMXN(stats.available_cents)}
        </p>
        <p className="text-xs text-brand-muted mt-1">
          Cada peso genera <span className="text-brand-green font-semibold">${stats.roi_multiplier}</span> en ventas
        </p>
      </div>

      {/* Barra mes */}
      <div>
        <div className="flex justify-between text-[10px] text-brand-faint mb-1.5">
          <span>Invertido este mes</span>
          <span>{formatMXN(stats.invested_this_month)}</span>
        </div>
        <div className="h-1.5 bg-brand-hover rounded-full overflow-hidden">
          <div className="h-full bg-brand-primary rounded-full" style={{ width: `${usedPct}%` }} />
        </div>
        <p className="text-[9px] text-brand-faint mt-1">{usedPct}% del fondo asignado este mes</p>
      </div>

      {/* Últimas distribuciones */}
      <div>
        <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest mb-2">
          Últimas distribuciones automáticas
        </p>
        <div className="space-y-1.5">
          {stats.distributions.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <TrendingUp size={10} className="text-brand-green shrink-0" />
                <span className="text-brand-text truncate">{d.campaign_name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-brand-green font-mono">+{formatMXN(d.amount_cents)}</span>
                <span className="text-[9px] text-brand-green">ROI {d.roi_after}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total generado */}
      <div className="pt-2 border-t border-brand-border flex items-center justify-between text-xs">
        <span className="text-brand-muted">Total generado con GrowthFund</span>
        <span className="font-bold font-mono text-brand-text">{formatMXN(stats.total_generated)}</span>
      </div>
    </div>
  )
}
