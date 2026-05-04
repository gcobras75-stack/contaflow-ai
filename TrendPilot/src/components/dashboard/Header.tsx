'use client'

import { Bell, Circle, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils'
import { logoutAction } from '@/app/actions/auth'
import type { SemaphoreColor } from '@/types'

interface HeaderProps {
  green:    number
  yellow:   number
  red:      number
  userName: string
  userRole: string
  userId:   string
}

function SemaphoreDot({ color, count }: { color: SemaphoreColor; count: number }) {
  const colors: Record<SemaphoreColor, string> = {
    green:  'bg-[#00FF88]',
    yellow: 'bg-[#FFB800]',
    red:    'bg-[#FF3B30]',
    paused: 'bg-[#FF3B30]',
  }
  const labels: Record<SemaphoreColor, string> = {
    green:  'activas',
    yellow: 'revisión',
    red:    'pausadas',
    paused: 'pausadas',
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-surface border border-brand-border">
      <span className={cn('w-2 h-2 rounded-full', colors[color], count > 0 && 'animate-pulse')} />
      <span className="text-xs font-semibold text-white">{count}</span>
      <span className="text-xs text-brand-muted">{labels[color]}</span>
    </div>
  )
}

export function Header({ green, yellow, red, userName, userRole }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Obtener iniciales para el avatar
  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-brand-surface/80 backdrop-blur-sm border-b border-brand-border flex items-center justify-between px-6 z-30">
      {/* Semáforo de campañas */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-brand-muted mr-1">Campañas:</span>
        <SemaphoreDot color="green"  count={green} />
        <SemaphoreDot color="yellow" count={yellow} />
        <SemaphoreDot color="red"    count={red} />
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-brand-border transition-colors">
          <Bell size={16} className="text-brand-muted" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-brand-primary rounded-full" />
        </button>

        {/* Usuario + menú */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-border hover:bg-brand-border/80 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{initials || '?'}</span>
            </div>
            <span className="text-xs text-white font-medium max-w-[100px] truncate">{userName}</span>
            {userRole === 'admin' && (
              <span className="text-[10px] text-brand-primary font-bold">ADMIN</span>
            )}
            <ChevronDown size={12} className="text-brand-muted" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-brand-surface border border-brand-border rounded-xl shadow-xl py-1 z-50">
              <div className="px-3 py-2 border-b border-brand-border">
                <p className="text-xs text-brand-muted">Sesión activa</p>
                <p className="text-xs text-white font-medium truncate">{userName}</p>
              </div>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#FF3B30] hover:bg-brand-border transition-colors"
                >
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-border">
          <Circle size={8} className="fill-[#00FF88] text-[#00FF88]" />
          <span className="text-xs text-white font-medium">En línea</span>
        </div>
      </div>
    </header>
  )
}
