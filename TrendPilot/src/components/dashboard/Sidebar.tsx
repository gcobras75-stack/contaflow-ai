'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils'
import {
  TrendingUp, Zap, Star, Search, Megaphone, FlaskConical,
  Radio, RotateCcw, MessageSquare, Users, Coins, Shield,
  Eye, Calendar, Settings, LayoutDashboard,
} from 'lucide-react'

// Los 14 módulos del sistema — hrefs relativos al dashboard
const modules = [
  { id: 1,  name: 'TrendRadar',    label: 'Tendencias',        href: '/dashboard/trends',      icon: TrendingUp },
  { id: 2,  name: 'EarlySignal',   label: 'Señales Early',     href: '/dashboard/early',       icon: Zap },
  { id: 3,  name: 'ProductScore',  label: 'Productos',         href: '/dashboard/products',    icon: Star },
  { id: 4,  name: 'SellerHunter',  label: 'Vendedores',        href: '/dashboard/vendors',     icon: Search },
  { id: 5,  name: 'AdBuilder',     label: 'Crear Anuncios',    href: '/dashboard/ads',         icon: Megaphone },
  { id: 6,  name: 'SplitTest',     label: 'A/B Testing',       href: '/dashboard/split',       icon: FlaskConical },
  { id: 7,  name: 'CampaignPilot', label: 'Campañas',          href: '/dashboard/campaigns',   icon: Radio },
  { id: 8,  name: 'ReachBack',     label: 'Retargeting',       href: '/dashboard/retargeting', icon: RotateCcw },
  { id: 9,  name: 'DirectPilot',   label: 'WhatsApp',          href: '/dashboard/whatsapp',    icon: MessageSquare },
  { id: 10, name: 'InfluMatch',    label: 'Influencers',       href: '/dashboard/influencers', icon: Users },
  { id: 11, name: 'GrowthFund',    label: 'Fondo Crecimiento', href: '/dashboard/fund',        icon: Coins },
  { id: 12, name: 'TrustScore',    label: 'Reputación',        href: '/dashboard/trust',       icon: Shield },
  { id: 13, name: 'MarketSpy',     label: 'Competencia',       href: '/dashboard/market',      icon: Eye },
  { id: 14, name: 'SeasonAlert',   label: 'Temporadas',        href: '/dashboard/seasons',     icon: Calendar },
]

interface SidebarProps {
  role: string
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-brand-surface border-r border-brand-border flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-brand-border">
        <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center">
          <TrendingUp size={16} className="text-white" />
        </div>
        <div>
          <span className="font-bold text-white text-sm">TrendPilot</span>
          <p className="text-[10px] text-brand-muted leading-none mt-0.5">Marketing IA</p>
        </div>
      </div>

      {/* Dashboard link */}
      <div className="px-3 pt-3 pb-1">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            pathname === '/dashboard'
              ? 'bg-brand-primary text-white'
              : 'text-brand-muted hover:text-white hover:bg-brand-border'
          )}
        >
          <LayoutDashboard size={15} />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Módulos */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
        <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider px-3 py-2">
          Módulos
        </p>
        {modules.map((mod) => {
          const Icon = mod.icon
          const isActive = pathname.startsWith(mod.href)
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group',
                isActive
                  ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30'
                  : 'text-brand-muted hover:text-white hover:bg-brand-border'
              )}
            >
              <Icon size={14} />
              <span className="truncate">{mod.label}</span>
              <span className="ml-auto text-[10px] text-brand-muted/50 group-hover:text-brand-muted">
                {mod.id.toString().padStart(2, '0')}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer con rol */}
      <div className="px-3 pb-4 border-t border-brand-border pt-3 space-y-1">
        {role === 'admin' && (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="text-[10px] font-bold bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
              Admin
            </span>
          </div>
        )}
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-brand-muted hover:text-white hover:bg-brand-border transition-colors"
        >
          <Settings size={14} />
          <span>Configuración</span>
        </Link>
      </div>
    </aside>
  )
}
