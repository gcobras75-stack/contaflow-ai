'use client'

import { cn } from '@/utils'
import { useSidebar } from './SidebarContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <main className={cn(
      'pt-16 min-h-screen sidebar-transition',
      collapsed ? 'ml-16' : 'ml-[240px]',
    )}>
      <div className="p-6 animate-fade-in">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </main>
  )
}
