'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Plus, ChevronRight, Users } from 'lucide-react'
import { TrustScoreBadge } from '@/components/vendors/TrustScoreBadge'
import { cn } from '@/utils'

interface Vendor {
  id:            string
  name:          string
  email:         string
  phone:         string | null
  whatsapp_number: string | null
  plan:          string
  status:        string
  trust_score:   number
  product_count: number
  created_at:    string
}

const planLabel: Record<string, string> = {
  despegue:   'Despegue',
  piloto:     'Piloto',
  comandante: 'Comandante',
  flota:      'Flota',
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active:    { label: 'Activo',    color: 'text-[#00FF88]' },
  suspended: { label: 'Suspendido',color: 'text-[#FF3B30]' },
  pending:   { label: 'Pendiente', color: 'text-[#FFB800]' },
}

export default function VendorsPage() {
  const [vendors, setVendors]     = useState<Vendor[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState<string>('all')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const limit = 20

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(limit),
      })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search.trim())          params.set('search', search.trim())

      const res = await fetch(`/api/vendors?${params}`)
      if (!res.ok) {
        if (res.status === 403) { setError('Solo los administradores pueden ver todos los vendedores.'); return }
        throw new Error(`Error ${res.status}`)
      }
      const json = await res.json()
      setVendors(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
    } catch {
      setError('No se pudieron cargar los vendedores.')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search])

  useEffect(() => { fetchVendors() }, [fetchVendors])

  // Debounce de búsqueda
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchVendors() }, 400)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={24} className="text-brand-primary" />
            Vendedores
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {total > 0 ? `${total} vendedor${total !== 1 ? 'es' : ''} registrado${total !== 1 ? 's' : ''}` : 'Gestión de vendedores'}
          </p>
        </div>
        <Link
          href="/dashboard/vendors/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nuevo vendedor
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-surface border border-brand-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'suspended', 'pending'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1) }}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-medium transition-colors border',
                statusFilter === s
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-brand-surface text-brand-muted border-brand-border hover:text-white'
              )}
            >
              {s === 'all' ? 'Todos' : statusConfig[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl px-4 py-3 text-sm text-[#FF3B30]">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
        {/* Cabecera tabla */}
        <div className="grid grid-cols-[1fr_120px_100px_90px_80px_40px] gap-4 px-4 py-3 border-b border-brand-border">
          <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Vendedor</span>
          <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Plan</span>
          <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Estado</span>
          <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">TrustScore</span>
          <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">Productos</span>
          <span />
        </div>

        {/* Filas */}
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_100px_90px_80px_40px] gap-4 px-4 py-4 border-b border-brand-border animate-pulse">
              <div className="h-4 bg-brand-border rounded w-3/4" />
              <div className="h-4 bg-brand-border rounded w-full" />
              <div className="h-4 bg-brand-border rounded w-full" />
              <div className="h-4 bg-brand-border rounded w-full" />
              <div className="h-4 bg-brand-border rounded w-full" />
              <div className="h-4 bg-brand-border rounded w-full" />
            </div>
          ))
        ) : vendors.length === 0 ? (
          <div className="text-center py-12 text-brand-muted">
            <Users size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No se encontraron vendedores.</p>
          </div>
        ) : (
          vendors.map((vendor) => {
            const sc = statusConfig[vendor.status] ?? { label: vendor.status, color: 'text-brand-muted' }
            return (
              <div
                key={vendor.id}
                className="grid grid-cols-[1fr_120px_100px_90px_80px_40px] gap-4 px-4 py-4 border-b border-brand-border hover:bg-brand-border/20 transition-colors items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{vendor.name}</p>
                  <p className="text-xs text-brand-muted truncate">{vendor.email}</p>
                </div>
                <span className="text-xs text-white capitalize">{planLabel[vendor.plan] ?? vendor.plan}</span>
                <span className={cn('text-xs font-medium', sc.color)}>{sc.label}</span>
                <TrustScoreBadge score={vendor.trust_score ?? 0} size="sm" />
                <span className="text-xs text-brand-muted tabular-nums">{vendor.product_count ?? 0}</span>
                <Link
                  href={`/dashboard/vendors/${vendor.id}`}
                  className="p-1.5 rounded-lg hover:bg-brand-border transition-colors text-brand-muted hover:text-white"
                >
                  <ChevronRight size={14} />
                </Link>
              </div>
            )
          })
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-brand-muted">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs bg-brand-surface border border-brand-border rounded-lg text-brand-muted hover:text-white transition-colors disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs bg-brand-surface border border-brand-border rounded-lg text-brand-muted hover:text-white transition-colors disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
