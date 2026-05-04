'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Plus, ChevronRight, Users } from 'lucide-react'
import { TrustScoreBadge } from '@/components/vendors/TrustScoreBadge'
import { cn } from '@/utils'

interface Vendor {
  id:               string
  name:             string
  email:            string
  phone:            string | null
  whatsapp_number:  string | null
  plan:             string
  status:           string
  trust_score:      number
  product_count:    number
  created_at:       string
}

const planLabel: Record<string, string> = {
  despegue:   'Despegue',
  piloto:     'Piloto',
  comandante: 'Comandante',
  flota:      'Flota',
}

const planBadge: Record<string, string> = {
  despegue:   'bg-brand-hover text-brand-muted',
  piloto:     'bg-brand-primary/15 text-brand-primary',
  comandante: 'bg-brand-purple/15 text-brand-purple',
  flota:      'bg-brand-green/15 text-brand-green',
}

const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  active:    { label: 'Activo',     dot: 'bg-brand-green',  text: 'text-brand-green'  },
  suspended: { label: 'Suspendido', dot: 'bg-brand-red',    text: 'text-brand-red'    },
  pending:   { label: 'Pendiente',  dot: 'bg-brand-yellow', text: 'text-brand-yellow' },
}

function Initials({ name }: { name: string }) {
  const letters = name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
  return (
    <div className="w-8 h-8 rounded-full btn-gradient flex items-center justify-center shrink-0">
      <span className="text-[10px] font-bold text-white">{letters || '?'}</span>
    </div>
  )
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
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
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

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchVendors() }, 400)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Encabezado */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
              <Users size={15} className="text-brand-primary" />
            </div>
            Vendedores
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {total > 0
              ? `${total} vendedor${total !== 1 ? 'es' : ''} registrado${total !== 1 ? 's' : ''}`
              : 'Gestión de vendedores'}
          </p>
        </div>
        <Link
          href="/dashboard/vendors/new"
          className="btn-gradient flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold"
        >
          <Plus size={14} />
          Nuevo vendedor
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: '60ms' }}>
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-faint" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-card border border-brand-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(0,102,255,0.12)] transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'suspended', 'pending'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1) }}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-medium transition-all border',
                statusFilter === s
                  ? 'btn-gradient text-white border-transparent'
                  : 'bg-brand-card text-brand-muted border-brand-border hover:text-brand-text hover:border-brand-primary/30'
              )}
            >
              {s === 'all' ? 'Todos' : statusConfig[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-brand-red/10 border border-brand-red/30 rounded-xl px-4 py-3 text-sm text-brand-red animate-scale-in">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '100ms' }}>
        {/* Cabecera */}
        <div className="grid grid-cols-[auto_1fr_120px_100px_90px_70px_40px] gap-4 px-5 py-3 border-b border-brand-border">
          <span className="w-8" />
          <span className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">Vendedor</span>
          <span className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">Plan</span>
          <span className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">Estado</span>
          <span className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">TrustScore</span>
          <span className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">Prods.</span>
          <span />
        </div>

        {/* Filas */}
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_120px_100px_90px_70px_40px] gap-4 px-5 py-4 border-b border-brand-border">
              <div className="w-8 h-8 skeleton rounded-full" />
              <div className="space-y-1.5">
                <div className="h-3.5 skeleton rounded w-3/4" />
                <div className="h-3 skeleton rounded w-1/2" />
              </div>
              <div className="h-5 skeleton rounded-full w-20" />
              <div className="h-4 skeleton rounded w-16" />
              <div className="h-5 skeleton rounded w-16" />
              <div className="h-4 skeleton rounded w-8" />
              <div className="h-6 skeleton rounded w-6" />
            </div>
          ))
        ) : vendors.length === 0 ? (
          <div className="text-center py-14 text-brand-muted">
            <Users size={28} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No se encontraron vendedores.</p>
          </div>
        ) : (
          vendors.map((vendor, idx) => {
            const sc = statusConfig[vendor.status] ?? { label: vendor.status, dot: 'bg-brand-faint', text: 'text-brand-muted' }
            const pb = planBadge[vendor.plan] ?? 'bg-brand-hover text-brand-muted'
            return (
              <div
                key={vendor.id}
                className={cn(
                  'grid grid-cols-[auto_1fr_120px_100px_90px_70px_40px] gap-4 px-5 py-3.5 items-center',
                  'hover:bg-brand-hover/40 transition-colors cursor-pointer',
                  idx < vendors.length - 1 && 'border-b border-brand-border',
                )}
              >
                <Initials name={vendor.name} />

                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{vendor.name}</p>
                  <p className="text-xs text-brand-faint truncate mt-0.5">{vendor.email}</p>
                </div>

                <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full w-fit', pb)}>
                  {planLabel[vendor.plan] ?? vendor.plan}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sc.dot)} />
                  <span className={cn('text-xs font-medium', sc.text)}>{sc.label}</span>
                </div>

                <TrustScoreBadge score={vendor.trust_score ?? 0} size="sm" />

                <span className="text-xs font-mono text-brand-muted tabular-nums">
                  {vendor.product_count ?? 0}
                </span>

                <Link
                  href={`/dashboard/vendors/${vendor.id}`}
                  className="p-1.5 rounded-lg hover:bg-brand-border transition-colors text-brand-faint hover:text-brand-text"
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
        <div className="flex items-center justify-between animate-fade-in">
          <p className="text-xs text-brand-faint">
            Página {page} de {totalPages} · {total} vendedores
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs bg-brand-card border border-brand-border rounded-xl text-brand-muted hover:text-brand-text hover:border-brand-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs bg-brand-card border border-brand-border rounded-xl text-brand-muted hover:text-brand-text hover:border-brand-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
