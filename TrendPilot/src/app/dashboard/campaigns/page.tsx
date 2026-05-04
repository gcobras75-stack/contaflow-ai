'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Radio, TrendingUp, AlertTriangle, TrendingDown } from 'lucide-react'
import { CampaignCard, type CampaignCardData } from '@/components/campaigns/CampaignCard'

// Mock data para demostración visual
const MOCK_CAMPAIGNS: CampaignCardData[] = [
  { id: 'c1', product_name: 'Audífonos Bluetooth Pro', vendor_name: 'TechStore MX', platform: 'meta',   semaphore_color: 'green',  budget_total: 500000,  budget_spent: 210000,  sales_generated: 1800000, commissions_earned: 360000, created_at: new Date().toISOString() },
  { id: 'c2', product_name: 'Bolsas de tela ecológica', vendor_name: 'EcoModa',      platform: 'tiktok', semaphore_color: 'green',  budget_total: 300000,  budget_spent: 180000,  sales_generated: 1200000, commissions_earned: 240000, created_at: new Date().toISOString() },
  { id: 'c3', product_name: 'Suplementos colágeno',    vendor_name: 'VidaSana',      platform: 'both',   semaphore_color: 'green',  budget_total: 400000,  budget_spent: 250000,  sales_generated: 1700000, commissions_earned: 340000, created_at: new Date().toISOString() },
  { id: 'c4', product_name: 'Ropa deportiva mujer',    vendor_name: 'FitStyle',      platform: 'meta',   semaphore_color: 'yellow', budget_total: 350000,  budget_spent: 150000,  sales_generated: 420000,  commissions_earned: 84000,  pause_reason: undefined, created_at: new Date().toISOString() },
  { id: 'c5', product_name: 'Cargador solar portátil', vendor_name: 'GadgetsMX',     platform: 'tiktok', semaphore_color: 'yellow', budget_total: 250000,  budget_spent: 90000,   sales_generated: 250000,  commissions_earned: 50000,  pause_reason: undefined, created_at: new Date().toISOString() },
  { id: 'c6', product_name: 'Mini aspiradora inalámbr',vendor_name: 'HomePlus',      platform: 'meta',   semaphore_color: 'red',    budget_total: 300000,  budget_spent: 280000,  sales_generated: 320000,  commissions_earned: 64000,  pause_reason: 'ROI 14% — por debajo del umbral mínimo', created_at: new Date().toISOString() },
  { id: 'c7', product_name: 'Soporte celular auto',    vendor_name: 'AutoParts',     platform: 'both',   semaphore_color: 'red',    budget_total: 200000,  budget_spent: 200000,  sales_generated: 180000,  commissions_earned: 36000,  pause_reason: '0 ventas en las últimas 48 horas', created_at: new Date().toISOString() },
]

type SemColor = 'green' | 'yellow' | 'red' | 'paused'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignCardData[]>(MOCK_CAMPAIGNS)
  const [loading, setLoading]     = useState(false)

  // Intentar cargar desde API real
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/campaigns?limit=100')
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (json.data && json.data.length > 0) {
          // Combinar datos de API con campos de display
          setCampaigns(json.data.map((c: Record<string, unknown>) => ({
            id:                  c.id,
            product_name:        (c.products as { name?: string })?.name ?? 'Producto',
            vendor_name:         (c.vendors as { name?: string })?.name ?? 'Vendor',
            platform:            c.platform,
            semaphore_color:     (c.semaphore_color as SemColor) ?? 'yellow',
            budget_total:        c.budget_total ?? 0,
            budget_spent:        c.budget_spent ?? 0,
            sales_generated:     c.sales_generated ?? 0,
            commissions_earned:  c.commissions_earned ?? 0,
            pause_reason:        c.pause_reason as string | undefined,
            created_at:          c.created_at,
          })))
        }
        // Si hay 0 campañas reales, mantener mocks para demostración
      } catch {
        // Mantener mocks
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const green  = campaigns.filter((c) => c.semaphore_color === 'green')
  const yellow = campaigns.filter((c) => c.semaphore_color === 'yellow')
  const red    = campaigns.filter((c) => c.semaphore_color === 'red' || c.semaphore_color === 'paused')

  const totalBudget    = campaigns.reduce((s, c) => s + c.budget_spent, 0)
  const totalSales     = campaigns.reduce((s, c) => s + c.sales_generated, 0)
  const totalComm      = campaigns.reduce((s, c) => s + c.commissions_earned, 0)
  const growthFundTotal = Math.round(totalComm * 0.4)

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n / 100)

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio size={24} className="text-brand-primary" />
            CampaignPilot
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Semáforo de campañas en tiempo real — {campaigns.length} activas
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nueva campaña
        </Link>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1">Presupuesto total gastado</p>
          <p className="text-xl font-bold text-white">{fmt(totalBudget)}</p>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1">Ventas generadas</p>
          <p className="text-xl font-bold text-[#00FF88]">{fmt(totalSales)}</p>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1">Comisiones totales</p>
          <p className="text-xl font-bold text-white">{fmt(totalComm)}</p>
        </div>
        <div className="bg-brand-surface border border-brand-primary/30 rounded-xl p-4">
          <p className="text-xs text-brand-muted mb-1 flex items-center gap-1">
            💰 GrowthFund disponible
          </p>
          <p className="text-xl font-bold text-brand-primary">{fmt(growthFundTotal)}</p>
        </div>
      </div>

      {/* Semáforo — 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* VERDE */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-[#00FF88]" />
            <h2 className="text-sm font-bold text-[#00FF88] uppercase tracking-wider">
              Verde — Funcionando
            </h2>
            <span className="ml-auto text-xs bg-[#00FF88]/10 text-[#00FF88] px-2 py-0.5 rounded-full font-bold">
              {green.length}
            </span>
          </div>
          <div className="space-y-3">
            {green.length === 0 && (
              <p className="text-xs text-brand-muted text-center py-8">Sin campañas activas</p>
            )}
            {green.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        </div>

        {/* AMARILLO */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-[#FFB800]" />
            <h2 className="text-sm font-bold text-[#FFB800] uppercase tracking-wider">
              Amarillo — En revisión
            </h2>
            <span className="ml-auto text-xs bg-[#FFB800]/10 text-[#FFB800] px-2 py-0.5 rounded-full font-bold">
              {yellow.length}
            </span>
          </div>
          <div className="space-y-3">
            {yellow.length === 0 && (
              <p className="text-xs text-brand-muted text-center py-8">Sin campañas en revisión</p>
            )}
            {yellow.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        </div>

        {/* ROJO */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-[#FF3B30]" />
            <h2 className="text-sm font-bold text-[#FF3B30] uppercase tracking-wider">
              Rojo — Pausadas
            </h2>
            <span className="ml-auto text-xs bg-[#FF3B30]/10 text-[#FF3B30] px-2 py-0.5 rounded-full font-bold">
              {red.length}
            </span>
          </div>
          <div className="space-y-3">
            {red.length === 0 && (
              <p className="text-xs text-brand-muted text-center py-8">Sin campañas pausadas</p>
            )}
            {red.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onApplySuggestions={(id) => {
                  // TODO: llamar endpoint de sugerencias IA
                  console.log('Aplicar sugerencias IA para campaña', id)
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
