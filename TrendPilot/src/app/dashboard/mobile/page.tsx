'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Radio, Star, Users, CheckCircle2, XCircle, ChevronRight,
  TrendingUp, AlertTriangle, TrendingDown, Coins, LogOut,
} from 'lucide-react'
import { cn } from '@/utils'
import { logoutAction } from '@/app/actions/auth'

// Mock para el panel mobile
const MOCK_DATA = {
  today_commissions: 1845000, // centavos
  semaphore: { green: 3, yellow: 2, red: 1 },
  pending_products:  4,
  pending_vendors:   1,
  paused_campaigns:  1,
  alerts: [
    { id: 'a1', type: 'product',  message: 'Audífonos BT Pro esperando aprobación',       vendor: 'TechStore MX',  action: 'product',   ref_id: 'p1' },
    { id: 'a2', type: 'product',  message: 'Suplemento Colágeno Gold esperando revisión', vendor: 'VidaSana',      action: 'product',   ref_id: 'p2' },
    { id: 'a3', type: 'campaign', message: 'Mini Aspiradora — ROI 14% bajo umbral',       vendor: 'HomePlus',      action: 'campaign',  ref_id: 'c1' },
    { id: 'a4', type: 'vendor',   message: 'Nuevo vendor: Moda Premium MX registrado',    vendor: '',              action: 'vendor',    ref_id: 'v1' },
    { id: 'a5', type: 'product',  message: 'Funda iPhone 15 pendiente de ProductScore',   vendor: 'PhoneCases',    action: 'product',   ref_id: 'p3' },
    { id: 'a6', type: 'product',  message: 'Teclado Mecánico RGB esperando aprobación',   vendor: 'GadgetsMX',     action: 'product',   ref_id: 'p4' },
  ],
  campaigns: [
    { id: 'c1', name: 'Audífonos BT — Meta',  roi: 212, sem: 'green'  as const },
    { id: 'c2', name: 'Bolsas Eco — TikTok',  roi: 175, sem: 'green'  as const },
    { id: 'c3', name: 'Colágeno — Meta',       roi: 112, sem: 'yellow' as const },
    { id: 'c4', name: 'Ropa Deportiva — TikTok', roi: 88, sem: 'yellow' as const },
    { id: 'c5', name: 'Mini Aspiradora — Meta', roi: 14, sem: 'red'   as const },
  ],
}

const semColors = {
  green:  { dot: 'bg-[#00FF88]', text: 'text-[#00FF88]', icon: TrendingUp },
  yellow: { dot: 'bg-[#FFB800]', text: 'text-[#FFB800]', icon: AlertTriangle },
  red:    { dot: 'bg-[#FF3B30]', text: 'text-[#FF3B30]', icon: TrendingDown },
}

type Screen = 1 | 2 | 3

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n / 100)
}

export default function MobileDashboard() {
  const [screen, setScreen]   = useState<Screen>(1)
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const activeAlerts = MOCK_DATA.alerts.filter((a) => !dismissed.has(a.id))
  const totalAlerts  = activeAlerts.length

  function handleApprove(alertId: string, refId: string, type: string) {
    // En producción: llamar API
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
      <div className="sticky top-0 bg-brand-surface/90 backdrop-blur border-b border-brand-border px-4 pt-safe-top z-10">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center">
              <TrendingUp size={14} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">TrendPilot</span>
          </div>
          <div className="flex items-center gap-2">
            {totalAlerts > 0 && (
              <span className="bg-[#FF3B30] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {totalAlerts}
              </span>
            )}
            <form action={logoutAction}>
              <button type="submit" className="p-1.5 text-brand-muted hover:text-white">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Tabs de pantalla */}
        <div className="flex border-b border-brand-border -mx-4">
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
              {s === 1 ? 'Resumen' : s === 2 ? `Alertas ${totalAlerts > 0 ? `(${totalAlerts})` : ''}` : 'Campañas'}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido por pantalla */}
      <div className="flex-1 p-4 space-y-4">
        {/* PANTALLA 1 — Resumen del día */}
        {screen === 1 && (
          <>
            {/* Comisiones del día */}
            <div className="bg-brand-surface border border-[#00FF88]/30 rounded-2xl p-5 text-center">
              <p className="text-xs text-brand-muted mb-1">Comisiones de hoy</p>
              <p className="text-4xl font-bold text-[#00FF88] tabular-nums">
                {fmt(MOCK_DATA.today_commissions)}
              </p>
              <p className="text-xs text-brand-muted mt-1">MXN · actualizado ahora</p>
            </div>

            {/* Semáforo grande */}
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-4">
              <p className="text-xs text-brand-muted font-semibold uppercase tracking-wider mb-3">
                Semáforo de campañas
              </p>
              <div className="grid grid-cols-3 gap-3">
                {(['green', 'yellow', 'red'] as const).map((color) => {
                  const cfg   = semColors[color]
                  const Icon  = cfg.icon
                  const count = color === 'green' ? MOCK_DATA.semaphore.green : color === 'yellow' ? MOCK_DATA.semaphore.yellow : MOCK_DATA.semaphore.red
                  return (
                    <div key={color} className="text-center">
                      <Icon size={24} className={cn('mx-auto mb-1', cfg.text)} />
                      <p className={cn('text-3xl font-bold tabular-nums', cfg.text)}>{count}</p>
                      <p className="text-[10px] text-brand-muted mt-0.5">
                        {color === 'green' ? 'activas' : color === 'yellow' ? 'revisión' : 'pausadas'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pendientes */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-brand-surface border border-brand-border rounded-xl p-3 text-center">
                <Star size={18} className="text-brand-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{MOCK_DATA.pending_products}</p>
                <p className="text-[10px] text-brand-muted">Productos</p>
              </div>
              <div className="bg-brand-surface border border-brand-border rounded-xl p-3 text-center">
                <Users size={18} className="text-brand-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{MOCK_DATA.pending_vendors}</p>
                <p className="text-[10px] text-brand-muted">Vendors</p>
              </div>
              <div className="bg-brand-surface border border-brand-border rounded-xl p-3 text-center">
                <Radio size={18} className="text-[#FFB800] mx-auto mb-1" />
                <p className="text-2xl font-bold text-[#FFB800]">{MOCK_DATA.paused_campaigns}</p>
                <p className="text-[10px] text-brand-muted">Pausadas</p>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 bg-brand-surface border border-brand-border rounded-2xl text-sm text-brand-muted hover:text-white flex items-center justify-center gap-2 transition-colors"
            >
              Ver panel completo <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* PANTALLA 2 — Alertas rápidas */}
        {screen === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-brand-muted">{totalAlerts} alertas pendientes de acción</p>
            {activeAlerts.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 size={40} className="text-[#00FF88] mx-auto mb-3 opacity-60" />
                <p className="text-sm text-brand-muted">Todo resuelto. ¡Buen trabajo!</p>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'bg-brand-surface border rounded-2xl p-4 space-y-3',
                    alert.type === 'product'  ? 'border-brand-border' :
                    alert.type === 'campaign' ? 'border-[#FFB800]/30' :
                    'border-brand-primary/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                      alert.type === 'product'  ? 'bg-brand-primary/10' :
                      alert.type === 'campaign' ? 'bg-[#FFB800]/10' :
                      'bg-[#00FF88]/10'
                    )}>
                      {alert.type === 'product'  ? <Star size={15} className="text-brand-primary" /> :
                       alert.type === 'campaign' ? <Radio size={15} className="text-[#FFB800]" /> :
                       <Users size={15} className="text-[#00FF88]" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white leading-tight">{alert.message}</p>
                      {alert.vendor && (
                        <p className="text-xs text-brand-muted mt-0.5">{alert.vendor}</p>
                      )}
                    </div>
                  </div>

                  {/* Botones grandes para tablet */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleApprove(alert.id, alert.ref_id, alert.action)}
                      className="flex items-center justify-center gap-2 py-3 bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 rounded-xl text-sm font-bold hover:bg-[#00FF88]/20 transition-colors active:scale-95"
                    >
                      <CheckCircle2 size={18} />
                      APROBAR
                    </button>
                    <button
                      onClick={() => handleReject(alert.id, alert.ref_id, alert.action)}
                      className="flex items-center justify-center gap-2 py-3 bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30 rounded-xl text-sm font-bold hover:bg-[#FF3B30]/20 transition-colors active:scale-95"
                    >
                      <XCircle size={18} />
                      RECHAZAR
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PANTALLA 3 — Campañas de hoy */}
        {screen === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-brand-muted">{MOCK_DATA.campaigns.length} campañas activas</p>
            {MOCK_DATA.campaigns.map((camp) => {
              const cfg  = semColors[camp.sem]
              const Icon = cfg.icon
              return (
                <button
                  key={camp.id}
                  onClick={() => router.push(`/dashboard/campaigns/${camp.id}`)}
                  className="w-full bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center gap-4 hover:border-brand-primary/40 active:scale-[0.98] transition-all"
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    camp.sem === 'green' ? 'bg-[#00FF88]/10' : camp.sem === 'yellow' ? 'bg-[#FFB800]/10' : 'bg-[#FF3B30]/10'
                  )}>
                    <Icon size={20} className={cfg.text} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{camp.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
                      <span className={cn('text-xs font-bold tabular-nums', cfg.text)}>
                        {camp.roi > 0 ? '+' : ''}{camp.roi}% ROI
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-brand-muted shrink-0" />
                </button>
              )
            })}

            <button
              onClick={() => router.push('/dashboard/commissions')}
              className="w-full py-4 bg-brand-surface border border-brand-primary/30 rounded-2xl text-sm text-brand-primary font-medium flex items-center justify-center gap-2 hover:bg-brand-primary/5 transition-colors"
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
