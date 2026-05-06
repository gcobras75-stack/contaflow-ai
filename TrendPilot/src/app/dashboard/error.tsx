'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorProps {
  error:  Error & { digest?: string }
  reset:  () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Solo loguear en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.error('[Dashboard Error]', error)
    }
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#FFB800]/10 border border-[#FFB800]/30 flex items-center justify-center mb-5">
        <AlertTriangle size={26} className="text-[#FFB800]" />
      </div>
      <h2 className="text-xl font-bold text-brand-text mb-2">Algo salió mal</h2>
      <p className="text-sm text-brand-muted mb-6 max-w-sm">
        Este módulo encontró un error inesperado. Tu información está segura.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary/15 border border-brand-primary/30 text-brand-primary rounded-xl text-sm font-semibold hover:bg-brand-primary/25 transition-colors"
      >
        <RefreshCw size={14} />
        Recargar módulo
      </button>
    </div>
  )
}
