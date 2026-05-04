'use client'

import { useEffect, useState, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Star, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/utils'

interface Product {
  id:               string
  name:             string
  description:      string | null
  price:            number
  category:         string | null
  status:           string
  score:            number
  rejection_reason: string | null
  vendor_id:        string
  vendor_name?:     string
  created_at:       string
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: 'Pendiente', color: 'text-[#FFB800]', icon: Clock },
  approved: { label: 'Aprobado',  color: 'text-[#00FF88]', icon: CheckCircle },
  rejected: { label: 'Rechazado', color: 'text-[#FF3B30]', icon: XCircle },
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

export default function ProductsPage() {
  const [products, setProducts]   = useState<Product[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [filter, setFilter]       = useState<string>('all')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [isPending, startTransition] = useTransition()
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const limit = 20

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (filter !== 'all') params.set('status', filter)
      const res = await fetch(`/api/products?${params}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      setProducts(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
    } catch {
      setError('No se pudieron cargar los productos.')
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  async function handleApprove(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      if (res.ok) {
        setActionMsg({ type: 'ok', text: 'Producto aprobado.' })
        setProducts((prev) => prev.map((p) => p.id === id ? { ...p, status: 'approved' } : p))
      } else {
        setActionMsg({ type: 'err', text: 'No se pudo aprobar el producto.' })
      }
    })
  }

  async function handleReject() {
    if (!rejectModal || !rejectReason.trim()) return
    startTransition(async () => {
      const res = await fetch(`/api/products/${rejectModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', rejection_reason: rejectReason }),
      })
      if (res.ok) {
        setActionMsg({ type: 'ok', text: 'Producto rechazado.' })
        setProducts((prev) => prev.map((p) => p.id === rejectModal.id ? { ...p, status: 'rejected', rejection_reason: rejectReason } : p))
        setRejectModal(null)
        setRejectReason('')
      } else {
        setActionMsg({ type: 'err', text: 'No se pudo rechazar el producto.' })
      }
    })
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Star size={24} className="text-brand-primary" />
            Productos
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {total > 0 ? `${total} producto${total !== 1 ? 's' : ''}` : 'Gestión de productos'}
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nuevo producto
        </Link>
      </div>

      {/* Mensajes */}
      {actionMsg && (
        <div className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-3 text-sm border',
          actionMsg.type === 'ok'
            ? 'bg-[#00FF88]/10 border-[#00FF88]/30 text-[#00FF88]'
            : 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]'
        )}>
          {actionMsg.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {actionMsg.text}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1) }}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border',
              filter === s
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-brand-surface text-brand-muted border-brand-border hover:text-white'
            )}
          >
            {s === 'all' ? 'Todos' : statusConfig[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl px-4 py-3 text-sm text-[#FF3B30]">
          {error}
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-brand-surface border border-brand-border rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-brand-border rounded w-1/2 mb-2" />
              <div className="h-3 bg-brand-border rounded w-1/4" />
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-brand-muted">
            <Star size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No hay productos con el filtro seleccionado.</p>
          </div>
        ) : (
          products.map((product) => {
            const sc = statusConfig[product.status] ?? { label: product.status, color: 'text-brand-muted', icon: Clock }
            const Icon = sc.icon
            return (
              <div key={product.id} className="bg-brand-surface border border-brand-border rounded-2xl p-4 hover:border-brand-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white truncate">{product.name}</h3>
                      <Icon size={13} className={cn(sc.color, 'shrink-0')} />
                    </div>
                    {product.description && (
                      <p className="text-xs text-brand-muted line-clamp-1 mb-1">{product.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-brand-muted">
                      <span>{formatPrice(product.price)}</span>
                      {product.category && <span>• {product.category}</span>}
                      {product.score > 0 && (
                        <span className="text-brand-primary font-bold">ProductScore: {product.score}</span>
                      )}
                    </div>
                    {product.rejection_reason && (
                      <p className="text-xs text-[#FF3B30] mt-1.5 bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded px-2 py-1">
                        Motivo: {product.rejection_reason}
                      </p>
                    )}
                  </div>

                  {/* Acciones (solo pending) */}
                  {product.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(product.id)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 rounded-lg text-xs font-medium hover:bg-[#00FF88]/20 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={12} />
                        Aprobar
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: product.id, name: product.name })}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30 rounded-lg text-xs font-medium hover:bg-[#FF3B30]/20 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={12} />
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-brand-muted">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs bg-brand-surface border border-brand-border rounded-lg text-brand-muted hover:text-white disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs bg-brand-surface border border-brand-border rounded-lg text-brand-muted hover:text-white disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal de rechazo */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-white">Rechazar producto</h3>
            <p className="text-sm text-brand-muted">
              <span className="text-white font-medium">{rejectModal.name}</span> — explica el motivo al vendor.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: Imágenes insuficientes, precio incorrecto…"
              rows={3}
              className="w-full bg-brand-border border border-brand-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary resize-none transition-colors"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="flex-1 px-4 py-2.5 bg-brand-border text-white rounded-lg text-sm hover:bg-brand-border/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={isPending || !rejectReason.trim()}
                className="flex-1 px-4 py-2.5 bg-[#FF3B30] hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isPending ? 'Procesando…' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
