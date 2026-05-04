'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Radio, TrendingUp, AlertTriangle, TrendingDown, Coins } from 'lucide-react'
import { CampaignCard, type CampaignCardData } from '@/components/campaigns/CampaignCard'

// Mock data para demostración visual
const MOCK_CAMPAIGNS: CampaignCardData[] = [
  { id: 'c1', product_name: 'Audífonos Bluetooth Pro',      vendor_name: 'TechStore MX', platform: 'meta',   semaphore_color: 'green',  budget_total: 500000,  budget_spent: 210000,  sales_generated: 1800000, commissions_earned: 360000, created_at: new Date().toISOString() },
  { id: 'c2', product_name: 'Bolsas de tela ecológica',     vendor_name: 'EcoModa',      platform: 'tiktok', semaphore_color: 'green',  budget_total: 300000,  budget_spent: 180000,  sales_generated: 1200000, commissions_earned: 240000, created_at: new Date().toISOString() },
  { id: 'c3', product_name: 'Suplementos colágeno',         vendor_name: 'VidaSana',     platform: 'both',   semaphore_color: 'green',  budget_total: 400000,  budget_spent: 250000,  sales_generated: 1700000, commissions_earned: 340000, created_at: new Date().toISOString() },
  { id: 'c4', product_name: 'Ropa deportiva mujer',         vendor_name: 'FitStyle',     platform: 'meta',   semaphore_color: 'yellow', budget_total: 350000,  budget_spent: 150000,  sales_generated: 420000,  commissions_earned: 84000,  created_at: new Date().toISOString() },
  { id: 'c5', product_name: 'Cargador solar portátil',      vendor_name: 'GadgetsMX',    platform: 'tiktok', semaphore_color: 'yellow', budget_total: 250000,  budget_spent: 90000,   sales_generated: 250000,  commissions_earned: 50000,  created_at: new Date().toISOString() },
  { id: 'c6', product_name: 'Mini aspiradora inalámbrica',  vendor_name: 'HomePlus',     platform: 'meta',   semaphore_color: 'red',    budget_total: 300000,  budget_spent: 280000,  sales_generated: 320000,  commissions_earned: 64000,  pause_reason: 'ROI 14% — por debajo del umbral mínimo', created_at: new Date().toISOString() },
  { id: 'c7', product_name: 'Soporte celular auto',         vendor_name: 'AutoParts',    platform: 'both',   semaphore_color: 'red',    budget_total: 200000,  budget_spent: 200000,  sales_generated: 180000,  commissions_earned: 36000,  pause_reason: '0 ventas en las últimas 48 horas', created_at: new Date().toISOString() },
]

type SemColor = 'green' | 'yellow' | 'red' | 'paused'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignCardData[]>(MOCK_CAMPAIGNS)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/campaigns?limit=100')
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (json.data && json.data.length > 0) {
          setCampaigns(json.data.map((c: Record<string, unknown>) => ({
            id:                 c.id,
            product_name:       (c.products as { name?: string })?.name ?? 'Producto',
            vendor_name:        (c.vendors  as { name?: string })?.name ?? 'Vendor',
            platform:           c.platform,
            semaphore_color:    (c.semaphore_color as SemColor) ?? 'yellow',
            budget_total:       c.budget_total       ?? 0,
            budget_spent:       c.budget_spent        ?? 0,
            sales_generated:    c.sales_generated     ?? 0,
            commissions_earned: c.commissions_earned  ?? 0,
            pause_reason:       c.pause_reason as string | undefined,
            created_at:         c.created_at,
          })))
        }
      } catch { /* mantener mocks */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const green  = campaigns.filter((c) => c.semaphore_color === 'green')
  const yellow = campaigns.filter((c) => c.semaphore_color === 'yellow')
  const red    = campaigns.filter((c) => c.semaphore_color === 'red' || c.semaphore_color === 'paused')

  const totalBudget     = campaigns.reduce((s, c) => s + c.budget_spent,        0)
  const totalSales      = campaigns.reduce((s, c) => s + c.sales_generated,      0)
  const totalComm       = campaigns.reduce((s, c) => s + c.commissions_earned,   0)
  const growthFundTotal = Math.round(totalComm * 0.4)

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n / 100)

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Encabezado */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
              <Radio size={15} className="text-brand-primary" />
            </div>
            CampaignPilot
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Semáforo en tiempo real — {campaigns.length} campañas
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="btn-gradient flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold"
        >
          <Plus size={14} />
          Nueva campaña
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '60ms' }}>
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest mb-2">Presupuesto gastado</p>
          <p className="text-xl font-bold font-mono text-brand-text">{fmt(totalBudget)}</p>
        </div>
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest mb-2">Ventas generadas</p>
          <p className="text-xl font-bold font-mono gradient-text-green">{fmt(totalSales)}</p>
        </div>
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest mb-2">Comisiones totales</p>
          <p className="text-xl font-bold font-mono text-brand-text">{fmt(totalComm)}</p>
        </div>
        <div className="bg-brand-card border border-brand-primary/20 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Coins size={11} className="text-brand-primary" />
            <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">GrowthFund</p>
          </div>
          <p className="text-xl font-bold font-mono gradient-text">{fmt(growthFundTotal)}</p>
        </div>
      </div>

      {/* Semáforo — 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* VERDE */}
        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-6 h-6 rounded-lg bg-brand-green/15 flex items-center justify-center">
              <TrendingUp size={12} className="text-brand-green" />
            </div>
            <h2 className="text-xs font-bold text-brand-green uppercase tracking-widest">Verde — Funcionando</h2>
            <span className="ml-auto text-[10px] font-bold bg-brand-green/15 text-brand-green px-2 py-0.5 rounded-full">
              {green.length}
            </span>
          </div>
          <div className="space-y-3">
            {green.length === 0 && (
              <div className="bg-brand-card border border-brand-border rounded-2xl py-10 text-center text-brand-faint text-sm">
                Sin campañas activas
              </div>
            )}
            {green.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        </div>

        {/* AMARILLO */}
        <div className="animate-fade-in" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-6 h-6 rounded-lg bg-brand-yellow/15 flex items-center justify-center">
              <AlertTriangle size={12} className="text-brand-yellow" />
            </div>
            <h2 className="text-xs font-bold text-brand-yellow uppercase tracking-widest">Amarillo — En revisión</h2>
            <span className="ml-auto text-[10px] font-bold bg-brand-yellow/15 text-brand-yellow px-2 py-0.5 rounded-full">
              {yellow.length}
            </span>
          </div>
          <div className="space-y-3">
            {yellow.length === 0 && (
              <div className="bg-brand-card border border-brand-border rounded-2xl py-10 text-center text-brand-faint text-sm">
                Sin campañas en revisión
              </div>
            )}
            {yellow.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        </div>

        {/* ROJO */}
        <div className="animate-fade-in" style={{ animationDelay: '220ms' }}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-6 h-6 rounded-lg bg-brand-red/15 flex items-center justify-center">
              <TrendingDown size={12} className="text-brand-red" />
            </div>
            <h2 className="text-xs font-bold text-brand-red uppercase tracking-widest">Rojo — Pausadas</h2>
            <span className="ml-auto text-[10px] font-bold bg-brand-red/15 text-brand-red px-2 py-0.5 rounded-full">
              {red.length}
            </span>
          </div>
          <div className="space-y-3">
            {red.length === 0 && (
              <div className="bg-brand-card border border-brand-border rounded-2xl py-10 text-center text-brand-faint text-sm">
                Sin campañas pausadas
              </div>
            )}
            {red.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onApplySuggestions={(id) => console.log('Aplicar sugerencias IA para campaña', id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
