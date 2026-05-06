'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  message:  string
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Error desconocido' }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Solo loguear en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary]', error, info)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FFB800]/10 border border-[#FFB800]/30 flex items-center justify-center mb-4">
            <AlertTriangle size={22} className="text-[#FFB800]" />
          </div>
          <h2 className="text-base font-semibold text-brand-text mb-1">Algo salió mal</h2>
          <p className="text-sm text-brand-muted mb-5 max-w-xs">
            Este módulo tuvo un error inesperado. Intenta recargar la página.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary/15 border border-brand-primary/30 text-brand-primary rounded-xl text-sm font-medium hover:bg-brand-primary/25 transition-colors"
          >
            <RefreshCw size={13} />
            Reintentar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
