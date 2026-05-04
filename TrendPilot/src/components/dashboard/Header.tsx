'use client'

import { Bell, LogOut, ChevronDown, Search, Globe } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils'
import { useSidebar } from './SidebarContext'
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

type SemDotColor = 'green' | 'yellow' | 'red'

const semDots: { color: SemDotColor; cls: string; label: string }[] = [
  { color: 'green',  cls: 'bg-brand-green',  label: 'activas' },
  { color: 'yellow', cls: 'bg-brand-yellow', label: 'revisión' },
  { color: 'red',    cls: 'bg-brand-red',    label: 'pausadas' },
]

export function Header({ green, yellow, red, userName, userRole }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { collapsed } = useSidebar()

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  const counts = { green, yellow, red }
  const totalAlerts = yellow + red

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 glass border-b border-brand-border',
        'flex items-center justify-between px-5 gap-4 z-30',
        'sidebar-transition',
        collapsed ? 'left-16' : 'left-[240px]',
      )}
    >
      {/* Izquierda: semáforo mini */}
      <div className="flex items-center gap-1.5 shrink-0">
        {semDots.map(({ color, cls, label }) => (
          <div
            key={color}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-card border border-brand-border"
            title={`${counts[color]} campañas en ${label}`}
          >
            <span className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              cls,
              counts[color] > 0 && color === 'green' && 'animate-pulse',
            )} />
            <span className="text-xs font-semibold text-brand-text tabular-nums">
              {counts[color]}
            </span>
          </div>
        ))}
      </div>

      {/* Centro: búsqueda */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-faint" />
          <input
            type="text"
            placeholder="Buscar productos, vendors, campañas…"
            className="w-full h-9 bg-brand-card border border-brand-border rounded-xl pl-9 pr-4 text-xs text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(0,102,255,0.12)] transition-all"
          />
        </div>
      </div>

      {/* Derecha: acciones */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Idioma */}
        <button className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-brand-hover transition-colors text-brand-muted hover:text-brand-text">
          <Globe size={13} />
          <span className="text-xs font-medium">ES</span>
        </button>

        {/* Notificaciones */}
        <button className="relative p-2 rounded-xl hover:bg-brand-hover transition-colors text-brand-muted hover:text-brand-text">
          <Bell size={15} />
          {totalAlerts > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-brand-red rounded-full flex items-center justify-center">
              <span className="text-[8px] font-bold text-white px-1">{totalAlerts}</span>
            </span>
          )}
        </button>

        {/* Usuario */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-brand-card border border-brand-border hover:border-brand-primary/40 hover:bg-brand-hover transition-all"
          >
            <div className="w-6 h-6 rounded-full btn-gradient flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-white">{initials || '?'}</span>
            </div>
            <span className="text-xs text-brand-text font-medium max-w-[100px] truncate hidden sm:block">
              {userName.split(' ')[0]}
            </span>
            {userRole === 'admin' && (
              <span className="text-[9px] font-bold text-brand-primary hidden sm:block">ADMIN</span>
            )}
            <ChevronDown size={11} className={cn('text-brand-muted transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-brand-card border border-brand-border rounded-2xl shadow-card py-1 z-50 animate-slide-up">
                <div className="px-4 py-3 border-b border-brand-border">
                  <p className="text-[10px] text-brand-faint">Sesión activa</p>
                  <p className="text-sm text-brand-text font-semibold truncate mt-0.5">{userName}</p>
                  <span className={cn(
                    'text-[10px] font-bold',
                    userRole === 'admin' ? 'text-brand-primary' : 'text-brand-muted',
                  )}>
                    {userRole === 'admin' ? 'Administrador' : 'Vendedor'}
                  </span>
                </div>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-brand-red hover:bg-brand-hover transition-colors rounded-b-2xl"
                  >
                    <LogOut size={13} />
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
