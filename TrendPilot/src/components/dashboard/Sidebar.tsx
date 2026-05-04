'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils'
import { useSidebar } from './SidebarContext'
import {
  TrendingUp, Zap, Star, Search, Megaphone, FlaskConical,
  Radio, RotateCcw, MessageSquare, Users, Coins, Shield,
  Eye, Calendar, Settings, LayoutDashboard, ChevronLeft, ChevronRight,
} from 'lucide-react'

const moduleGroups = [
  {
    label: 'Análisis',
    modules: [
      { id: 1,  name: 'TrendRadar',   label: 'Tendencias',     href: '/dashboard/trends',    icon: TrendingUp },
      { id: 2,  name: 'EarlySignal',  label: 'Señales Early',  href: '/dashboard/early',     icon: Zap },
      { id: 3,  name: 'ProductScore', label: 'Productos',      href: '/dashboard/products',  icon: Star },
      { id: 4,  name: 'SellerHunter', label: 'Vendedores',     href: '/dashboard/vendors',   icon: Search },
    ],
  },
  {
    label: 'Campañas',
    modules: [
      { id: 5,  name: 'AdBuilder',    label: 'Crear Anuncios', href: '/dashboard/ads',         icon: Megaphone },
      { id: 6,  name: 'SplitTest',    label: 'A/B Testing',   href: '/dashboard/split',       icon: FlaskConical },
      { id: 7,  name: 'CampaignPilot',label: 'Campañas',      href: '/dashboard/campaigns',   icon: Radio },
    ],
  },
  {
    label: 'Retención',
    modules: [
      { id: 8,  name: 'ReachBack',    label: 'Retargeting',   href: '/dashboard/retargeting', icon: RotateCcw },
      { id: 9,  name: 'DirectPilot',  label: 'WhatsApp',      href: '/dashboard/whatsapp',    icon: MessageSquare },
      { id: 10, name: 'InfluMatch',   label: 'Influencers',   href: '/dashboard/influencers', icon: Users },
    ],
  },
  {
    label: 'Finanzas',
    modules: [
      { id: 11, name: 'GrowthFund',   label: 'Fondo',         href: '/dashboard/fund',        icon: Coins },
      { id: 12, name: 'TrustScore',   label: 'Reputación',    href: '/dashboard/trust',       icon: Shield },
      { id: 13, name: 'MarketSpy',    label: 'Competencia',   href: '/dashboard/market',      icon: Eye },
      { id: 14, name: 'SeasonAlert',  label: 'Temporadas',    href: '/dashboard/seasons',     icon: Calendar },
    ],
  },
]

interface SidebarProps {
  role: string
  userName: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname  = usePathname()
  const { collapsed, toggle } = useSidebar()

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col z-40 overflow-hidden',
        'bg-brand-card border-r border-brand-border',
        'sidebar-transition',
        collapsed ? 'w-16' : 'w-[240px]',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 border-b border-brand-border shrink-0',
        collapsed ? 'px-3 py-4 justify-center' : 'px-5 py-4',
      )}>
        <div className="w-8 h-8 rounded-xl btn-gradient flex items-center justify-center shrink-0">
          <TrendingUp size={15} className="text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="font-bold text-brand-text text-sm tracking-tight gradient-text">TrendPilot</span>
            <p className="text-[10px] text-brand-faint leading-none mt-0.5">Marketing IA</p>
          </div>
        )}
      </div>

      {/* Dashboard link */}
      <div className={cn('px-2 pt-3 pb-1 shrink-0')}>
        <Link
          href="/dashboard"
          title={collapsed ? 'Dashboard' : undefined}
          className={cn(
            'flex items-center rounded-xl text-sm transition-all duration-150 group',
            collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5',
            pathname === '/dashboard'
              ? 'bg-brand-primary/15 text-brand-primary border-l-[3px] border-brand-primary'
              : 'text-brand-muted hover:text-brand-text hover:bg-brand-hover',
          )}
        >
          <LayoutDashboard size={15} className="shrink-0" />
          {!collapsed && <span className="font-medium">Dashboard</span>}
        </Link>
      </div>

      {/* Módulos con grupos */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-4 mt-1">
        {moduleGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest px-3 pb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.modules.map((mod) => {
                const Icon = mod.icon
                const isActive = pathname.startsWith(mod.href)
                return (
                  <Link
                    key={mod.id}
                    href={mod.href}
                    title={collapsed ? mod.label : undefined}
                    className={cn(
                      'flex items-center rounded-xl text-sm transition-all duration-150 group',
                      collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2',
                      isActive
                        ? 'bg-brand-primary/12 text-brand-primary border-l-[3px] border-brand-primary'
                        : 'text-brand-muted hover:text-brand-text hover:bg-brand-hover border-l-[3px] border-transparent',
                    )}
                  >
                    <Icon size={14} className="shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{mod.label}</span>
                        <span className="text-[9px] text-brand-faint group-hover:text-brand-muted font-mono">
                          {mod.id.toString().padStart(2, '0')}
                        </span>
                      </>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Separador */}
      <div className="border-t border-brand-border mx-2" />

      {/* Settings */}
      <div className="px-2 py-2 shrink-0">
        <Link
          href="/dashboard/settings"
          title={collapsed ? 'Configuración' : undefined}
          className={cn(
            'flex items-center rounded-xl text-sm text-brand-muted hover:text-brand-text hover:bg-brand-hover transition-all duration-150',
            collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2',
          )}
        >
          <Settings size={14} className="shrink-0" />
          {!collapsed && <span>Configuración</span>}
        </Link>
      </div>

      {/* Usuario */}
      {!collapsed && (
        <div className="mx-2 mb-2 p-3 rounded-xl bg-brand-hover border border-brand-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full btn-gradient flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-white">{initials || '?'}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-brand-text truncate">{userName}</p>
              <p className={cn(
                'text-[10px] font-medium',
                role === 'admin' ? 'text-brand-primary' : 'text-brand-muted',
              )}>
                {role === 'admin' ? 'Administrador' : 'Vendedor'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toggle collapse */}
      <button
        onClick={toggle}
        className={cn(
          'absolute -right-3 top-20 w-6 h-6 rounded-full',
          'bg-brand-card border border-brand-border',
          'flex items-center justify-center',
          'text-brand-muted hover:text-brand-text hover:border-brand-primary',
          'transition-all duration-150 shadow-card',
          'z-50',
        )}
        title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {collapsed
          ? <ChevronRight size={11} />
          : <ChevronLeft  size={11} />
        }
      </button>
    </aside>
  )
}
