'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Radio, Star, Users, CheckCircle2, XCircle, ChevronRight,
  TrendingUp, AlertTriangle, TrendingDown, Coins, LogOut,
} from 'lucide-react'
import { cn } from '@/utils'
import { logoutAction } from '@/app/actions/auth'
import { ProductImage } from '@/components/ui/ProductImage'

// Mock para el panel mobile
const MOCK_DATA = {
  today_commissions: 1845000, // centavos
  semaphore: { green: 3, yellow: 2, red: 1 },
  pending_products:  4,
  pending_vendors:   1,
  paused_campaigns:  1,
  alerts: [
    { id: 'a1', type: 'product',  message: 'Audífonos BT Pro esperando aprobación',       vendor: 'TechStore MX',  action: 'product',   ref_id: 'p1', keyword: 'Audífonos Bluetooth Pro' },
    { id: 'a2', type: 'product',  message: 'Suplemento Colágeno Gold esperando revisión', vendor: 'VidaSana',      action: 'product',   ref_id: 'p2', keyword: 'Suplementos colágeno' },
    { id: 'a3', type: 'campaign', message: 'Mini Aspiradora — ROI 14% bajo umbral',       vendor: 'HomePlus',      action: 'campaign',  ref_id: 'c1', keyword: 'Mini aspiradora' },
    { id: 'a4', type: 'vendor',   message: 'Nuevo vendor: Moda Premium MX registrado',    vendor: '',              action: 'vendor',    ref_id: 'v1', keyword: 'Moda premium' },
    { id: 'a5', type: 'product',  message: 'Funda iPhone 15 pendiente de ProductScore',   vendor: 'PhoneCases',    action: 'product',   ref_id: 'p3', keyword: 'Funda iPhone' },
    { id: 'a6', type: 'product',  message: 'Teclado Mecánico RGB esperando aprobación',   vendor: 'GadgetsMX',     action: 'product',   ref_id: 'p4', keyword: 'Teclado mecánico' },
  ],
  campaigns: [
    { id: 'c1', name: 'Audífonos BT — Meta',     keyword: 'Audífonos Bluetooth Pro',   roi: 212, sem: 'green'  as const },
    { id: 'c2', name: 'Bolsas Eco — TikTok',     keyword: 'Bolsas de tela ecológica',  roi: 175, sem: 'green'  as const },
    { id: 'c3', name: 'Colágeno — Meta',          keyword: 'Suplementos colágeno',      roi: 112, sem: 'yellow' as const },
    { id: 'c4', name: 'Ropa Deportiva — TikTok',  keyword: 'Ropa deportiva mujer',      roi: 88,  sem: 'yellow' as const },
    { id: 'c5', name: 'Mini Aspiradora — Meta',   keyword: 'Mini aspiradora',           roi: 14,  sem: 'red'    as const },
  ],
}

const semColors = {
  green:  { dot: 'bg-brand-green',  text: 'text-brand-green',  icon: TrendingUp },
  yellow: { dot: 'bg-brand-yellow', text: 'text-brand-yellow', icon: AlertTriangle },
  red:    { dot: 'bg-brand-red',    text: 'text-brand-red',    icon: TrendingDown },
}

type Screen = 1 | 2 | 3

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n / 100)
}

export default function MobileDashboard() {
  const [screen, setScreen]   = useState<Screen>(1)
  const router                = useRouter()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const activeAlerts = MOCK_DATA.alerts.filter((a) => !dismissed.has(a.id))
  const totalAlerts  = activeAlerts.length

  function handleApprove(alertId: string, refId: string, type: string) {
    console.log(`Aprobando ${type} ${refId}`)
    setDismissed((d) => new Set(d).add(alertId))
  }

  function handleReject(alertId: string, refId: string, type: string) {
    console.log(`Rechazando ${type} ${refId}`)
    setDismissed((d) => new Set(d).add(alertId))
  }

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
          <div className="flex items-center gap-2">
            {totalAlerts > 0 && (
              <span className="bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {totalAlerts}
              </span>
            )}
            <form action={logoutAction}>
              <button type="submit" className="p-1.5 text-brand-muted hover:text-brand-text transition-colors">
                <LogOut size={16} />
              </button>
            </form>
          </div>
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
                  : 'text-brand-muted border-transparent'
              )}
            >
              {s === 1 ? 'Resumen' : s === 2 ? `Alertas${totalAlerts > 0 ? ` (${totalAlerts})` : ''}` : 'Campañas'}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 p-4 space-y-4">

        {/* PANTALLA 1 — Resumen */}
        {screen === 1 && (
          <>
            {/* Comisiones */}
            <div className="bg-brand-card border border-brand-green/25 rounded-2xl p-5 text-center">
              <p className="text-xs text-brand-muted mb-1">Comisiones de hoy</p>
              <p className="text-4xl font-bold font-mono gradient-text-green tabular-nums">
                {fmt(MOCK_DATA.today_commissions)}
              </p>
              <p className="text-xs text-brand-faint mt-1">MXN · actualizado ahora</p>
            </div>

            {/* Semáforo grande */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
              <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest mb-3">
                Semáforo de campañas
              </p>
              <div className="grid grid-cols-3 gap-3">
                {(['green', 'yellow', 'red'] as const).map((color) => {
                  const cfg   = semColors[color]
                  const Icon  = cfg.icon
                  const count = color === 'green' ? MOCK_DATA.semaphore.green : color === 'yellow' ? MOCK_DATA.semaphore.yellow : MOCK_DATA.semaphore.red
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
            </div>

            {/* Pendientes */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-brand-card border border-brand-border rounded-xl p-3 text-center">
                <Star size={18} className="text-brand-primary mx-auto mb-1" />
                <p className="text-2xl font-bold font-mono text-brand-text">{MOCK_DATA.pending_products}</p>
                <p className="text-[10px] text-brand-faint">Productos</p>
              </div>
              <div className="bg-brand-card border border-brand-border rounded-xl p-3 text-center">
                <Users size={18} className="text-brand-primary mx-auto mb-1" />
                <p className="text-2xl font-bold font-mono text-brand-text">{MOCK_DATA.pending_vendors}</p>
                <p className="text-[10px] text-brand-faint">Vendors</p>
              </div>
              <div className="bg-brand-card border border-brand-border rounded-xl p-3 text-center">
                <Radio size={18} className="text-brand-yellow mx-auto mb-1" />
                <p className="text-2xl font-bold font-mono text-brand-yellow">{MOCK_DATA.paused_campaigns}</p>
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

        {/* PANTALLA 2 — Alertas con imágenes */}
        {screen === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-brand-faint">{totalAlerts} alertas pendientes de acción</p>
            {activeAlerts.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 size={40} className="text-brand-green mx-auto mb-3 opacity-60" />
                <p className="text-sm text-brand-muted">Todo resuelto. ¡Buen trabajo!</p>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'bg-brand-card border rounded-2xl overflow-hidden',
                    alert.type === 'product'  ? 'border-brand-border' :
                    alert.type === 'campaign' ? 'border-brand-yellow/30' :
                    'border-brand-primary/30'
                  )}
                >
                  {/* Imagen grande del producto */}
                  {(alert.type === 'product' || alert.type === 'campaign') && (
                    <div className="h-[120px] overflow-hidden w-full">
                      <ProductImage
                        keyword={alert.keyword}
                        size={0}
                        radius={0}
                        className="!w-full !h-full !rounded-none"
                      />
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                        alert.type === 'product'  ? 'bg-brand-primary/10' :
                        alert.type === 'campaign' ? 'bg-brand-yellow/10' :
                        'bg-brand-green/10'
                      )}>
                        {alert.type === 'product'  ? <Star size={15} className="text-brand-primary" /> :
                         alert.type === 'campaign' ? <Radio size={15} className="text-brand-yellow" /> :
                         <Users size={15} className="text-brand-green" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-text leading-tight">{alert.message}</p>
                        {alert.vendor && (
                          <p className="text-xs text-brand-faint mt-0.5">{alert.vendor}</p>
                        )}
                      </div>
                    </div>

                    {/* Botones grandes para tablet */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleApprove(alert.id, alert.ref_id, alert.action)}
                        className="flex items-center justify-center gap-2 py-3.5 bg-brand-green/10 text-brand-green border border-brand-green/30 rounded-xl text-sm font-bold hover:bg-brand-green/20 transition-colors active:scale-95"
                      >
                        <CheckCircle2 size={18} />
                        APROBAR
                      </button>
                      <button
                        onClick={() => handleReject(alert.id, alert.ref_id, alert.action)}
                        className="flex items-center justify-center gap-2 py-3.5 bg-brand-red/10 text-brand-red border border-brand-red/30 rounded-xl text-sm font-bold hover:bg-brand-red/20 transition-colors active:scale-95"
                      >
                        <XCircle size={18} />
                        RECHAZAR
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PANTALLA 3 — Campañas con imagen */}
        {screen === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-brand-faint">{MOCK_DATA.campaigns.length} campañas activas</p>
            {MOCK_DATA.campaigns.map((camp) => {
              const cfg  = semColors[camp.sem]
              const Icon = cfg.icon
              return (
                <button
                  key={camp.id}
                  onClick={() => router.push(`/dashboard/campaigns/${camp.id}`)}
                  className="w-full bg-brand-card border border-brand-border rounded-2xl p-4 flex items-center gap-4 hover:border-brand-primary/30 active:scale-[0.98] transition-all"
                >
                  {/* Imagen 64x64 */}
                  <ProductImage keyword={camp.keyword} size={64} radius={12} className="shrink-0" />

                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-brand-text truncate">{camp.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Icon size={12} className={cfg.text} />
                      <span className={cn('text-sm font-bold font-mono tabular-nums', cfg.text)}>
                        {camp.roi > 0 ? '+' : ''}{camp.roi}% ROI
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-brand-faint shrink-0" />
                </button>
              )
            })}

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
