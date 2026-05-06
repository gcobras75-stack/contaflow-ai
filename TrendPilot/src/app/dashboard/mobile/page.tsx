'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Radio, Bell, ChevronRight,
  TrendingUp, AlertTriangle, TrendingDown, Coins, LogOut,
} from 'lucide-react'
import { cn } from '@/utils'
import { logoutAction } from '@/app/actions/auth'
import { ProductImage } from '@/components/ui/ProductImage'

interface CampaignItem {
  id:      string
  name:    string
  keyword: string
  roi:     number
  sem:     'green' | 'yellow' | 'red'
}

interface DashboardData {
  month_commissions: number   // MXN decimal
  operator_share:    number   // MXN decimal — 70% del total afiliados
  semaphore: { green: number; yellow: number; red: number }
  paused_campaigns:  number
}

const semColors = {
  green:  { dot: 'bg-brand-green',  text: 'text-brand-green',  icon: TrendingUp   },
  yellow: { dot: 'bg-brand-yellow', text: 'text-brand-yellow', icon: AlertTriangle },
  red:    { dot: 'bg-brand-red',    text: 'text-brand-red',    icon: TrendingDown  },
}

type Screen = 1 | 2 | 3

// Comisiones afiliadas en MXN decimal (no centavos)
function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
  }).format(n)
}

export default function MobileDashboard() {
  const [screen,    setScreen]    = useState<Screen>(1)
  const router                    = useRouter()
  const [loading,   setLoading]   = useState(true)
  const [data,      setData]      = useState<DashboardData>({
    month_commissions: 0,
    operator_share:    0,
    semaphore:         { green: 0, yellow: 0, red: 0 },
    paused_campaigns:  0,
  })
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([])

  useEffect(() => {
    async function load() {
      try {
        const [affRes, campRes] = await Promise.allSettled([
          fetch('/api/affiliates/commissions?period=this_month').then(r => r.ok ? r.json() : null),
          fetch('/api/affiliate/campaigns').then(r => r.ok ? r.json() : null),
        ])

        // Comisiones afiliadas del mes
        let monthComm = 0
        let opShare   = 0
        if (affRes.status === 'fulfilled' && affRes.value) {
          monthComm = parseFloat(affRes.value.total_commissions  ?? '0')
          opShare   = parseFloat(affRes.value.operator_total     ?? '0')
        }

        // Campañas + semáforo calculado desde datos reales
        let green = 0, yellow = 0, red = 0
        const campItems: CampaignItem[] = []

        if (campRes.status === 'fulfilled' && campRes.value) {
          const camps: Record<string, unknown>[] = campRes.value.data ?? []
          for (const c of camps) {
            const sem = (c.semaphore_color as string) ?? 'yellow'
            if (sem === 'green') green++
            else if (sem === 'yellow') yellow++
            else red++

            // ROI desde datos de la campaña
            const spent      = Number(c.budget_spent     ?? 0)
            const sales      = Number(c.sales_generated  ?? 0)
            const roi        = spent > 0 ? Math.round(((sales - spent) / spent) * 100) : 0

            campItems.push({
              id:      String(c.id),
              name:    String(c.product_name ?? c.name ?? 'Campaña'),
              keyword: String(c.product_name ?? c.name ?? ''),
              roi,
              sem:     sem === 'green' ? 'green' : sem === 'yellow' ? 'yellow' : 'red',
            })
          }
        }

        setData({
          month_commissions: monthComm,
          operator_share:    opShare,
          semaphore:         { green, yellow, red },
          paused_campaigns:  red,
        })
        setCampaigns(campItems)
      } catch { /* mantener estado vacío */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const totalCampaigns = data.semaphore.green + data.semaphore.yellow + data.semaphore.red

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">

      {/* Header fijo */}
      <div className="sticky top-0 bg-brand-card/90 backdrop-blur border-b border-brand-border px-4 z-10">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg btn-gradient flex items-center justify-center">
              <TrendingUp size={14} className="text-white" />
            </div>
            <span className="font-bold text-brand-text text-sm">TrendPilot</span>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="p-1.5 text-brand-muted hover:text-brand-text transition-colors">
              <LogOut size={16} />
            </button>
          </form>
        </div>

        {/* Tabs */}
        <div className="flex -mx-4">
          {([1, 2, 3] as Screen[]).map((s) => (
            <button
              key={s}
              onClick={() => setScreen(s)}
              className={cn(
                'flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px',
                screen === s
                  ? 'text-brand-primary border-brand-primary'
                  : 'text-brand-muted border-transparent',
              )}
            >
              {s === 1 ? 'Resumen' : s === 2 ? 'Alertas' : 'Campañas'}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 p-4 space-y-4">

        {/* ── PANTALLA 1 — Resumen ─────────────────────────────────────────── */}
        {screen === 1 && (
          <>
            {/* Ganancia del mes */}
            <div className="bg-brand-card border border-brand-green/25 rounded-2xl p-5 text-center">
              <p className="text-xs text-brand-muted mb-1">Tu ganancia este mes</p>
              {loading ? (
                <div className="h-10 w-36 mx-auto animate-pulse bg-brand-hover rounded-xl" />
              ) : (
                <p className="text-4xl font-bold font-mono gradient-text-green tabular-nums">
                  {fmt(data.operator_share)}
                </p>
              )}
              <p className="text-xs text-brand-faint mt-1">
                {data.month_commissions > 0
                  ? `Comisión total: ${fmt(data.month_commissions)} · 70% tuyo`
                  : 'Configura el postback para registrar comisiones'}
              </p>
            </div>

            {/* Semáforo grande */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
              <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest mb-3">
                Semáforo de campañas
              </p>
              {loading ? (
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-16 animate-pulse bg-brand-hover rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {(['green', 'yellow', 'red'] as const).map((color) => {
                    const cfg   = semColors[color]
                    const Icon  = cfg.icon
                    const count = data.semaphore[color]
                    return (
                      <div key={color} className="text-center">
                        <Icon size={22} className={cn('mx-auto mb-1', cfg.text)} />
                        <p className={cn('text-3xl font-bold tabular-nums font-mono', cfg.text)}>{count}</p>
                        <p className="text-[10px] text-brand-faint mt-0.5">
                          {color === 'green' ? 'activas' : color === 'yellow' ? 'revisión' : 'pausadas'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-brand-card border border-brand-border rounded-xl p-3 text-center">
                <Radio size={18} className="text-brand-primary mx-auto mb-1" />
                {loading
                  ? <div className="h-6 w-8 mx-auto animate-pulse bg-brand-hover rounded" />
                  : <p className="text-2xl font-bold font-mono text-brand-text">{totalCampaigns}</p>
                }
                <p className="text-[10px] text-brand-faint">Total</p>
              </div>
              <div className="bg-brand-card border border-brand-border rounded-xl p-3 text-center">
                <TrendingUp size={18} className="text-brand-green mx-auto mb-1" />
                {loading
                  ? <div className="h-6 w-8 mx-auto animate-pulse bg-brand-hover rounded" />
                  : <p className="text-2xl font-bold font-mono text-brand-green">{data.semaphore.green}</p>
                }
                <p className="text-[10px] text-brand-faint">Activas</p>
              </div>
              <div className="bg-brand-card border border-brand-border rounded-xl p-3 text-center">
                <Radio size={18} className="text-brand-yellow mx-auto mb-1" />
                {loading
                  ? <div className="h-6 w-8 mx-auto animate-pulse bg-brand-hover rounded" />
                  : <p className="text-2xl font-bold font-mono text-brand-yellow">{data.paused_campaigns}</p>
                }
                <p className="text-[10px] text-brand-faint">Pausadas</p>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 bg-brand-card border border-brand-border rounded-2xl text-sm text-brand-muted hover:text-brand-text flex items-center justify-center gap-2 transition-colors"
            >
              Ver panel completo <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* ── PANTALLA 2 — Alertas ─────────────────────────────────────────── */}
        {screen === 2 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell size={40} className="text-brand-faint mb-4 opacity-30" />
            <h3 className="text-lg font-semibold text-brand-text mb-2">Sin alertas pendientes</h3>
            <p className="text-brand-muted text-sm max-w-sm">
              Las alertas de campañas con ROI bajo y comisiones por aprobar aparecerán aquí automáticamente.
            </p>
          </div>
        )}

        {/* ── PANTALLA 3 — Campañas ────────────────────────────────────────── */}
        {screen === 3 && (
          <div className="space-y-3">
            {loading ? (
              <>
                <div className="h-4 w-32 animate-pulse bg-brand-hover rounded mb-2" />
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse bg-brand-hover rounded-2xl" />
                ))}
              </>
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Radio size={40} className="text-brand-faint mb-4 opacity-30" />
                <h3 className="text-lg font-semibold text-brand-text mb-2">Sin campañas activas</h3>
                <p className="text-brand-muted text-sm max-w-sm mb-6">
                  Las campañas aparecerán aquí cuando estén configuradas.
                </p>
                <a
                  href="/dashboard/campaigns/new"
                  className="px-4 py-2 bg-[#00FF88] text-black rounded-lg text-sm font-medium"
                >
                  Crear primera campaña
                </a>
              </div>
            ) : (
              <>
                <p className="text-xs text-brand-faint">{campaigns.length} campañas</p>
                {campaigns.map((camp) => {
                  const cfg  = semColors[camp.sem]
                  const Icon = cfg.icon
                  return (
                    <button
                      key={camp.id}
                      onClick={() => router.push(`/dashboard/campaigns/${camp.id}`)}
                      className="w-full bg-brand-card border border-brand-border rounded-2xl p-4 flex items-center gap-4 hover:border-brand-primary/30 active:scale-[0.98] transition-all"
                    >
                      <ProductImage keyword={camp.keyword} size={72} radius={12} className="shrink-0" />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold text-brand-text truncate">{camp.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Icon size={12} className={cfg.text} />
                          <span className={cn('text-sm font-bold font-mono tabular-nums', cfg.text)}>
                            {camp.roi !== 0
                              ? `${camp.roi > 0 ? '+' : ''}${camp.roi}% ROI`
                              : '⏳ Sin datos aún'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-brand-faint shrink-0" />
                    </button>
                  )
                })}
              </>
            )}

            <button
              onClick={() => router.push('/dashboard/commissions')}
              className="w-full py-4 bg-brand-card border border-brand-primary/25 rounded-2xl text-sm text-brand-primary font-medium flex items-center justify-center gap-2 hover:bg-brand-primary/5 transition-colors"
            >
              <Coins size={16} />
              Ver comisiones completas
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
