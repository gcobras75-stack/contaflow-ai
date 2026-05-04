'use client'

import { useEffect, useState, useCallback, useTransition } from 'react'
import Link from 'next/link'
import {
  Plus, Star, CheckCircle, XCircle, Clock, AlertCircle,
  LayoutGrid, List,
} from 'lucide-react'
import { cn } from '@/utils'
import { ProductImage } from '@/components/ui/ProductImage'

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
  images?:          string[]
  ml_thumbnail?:    string | null
  created_at:       string
}

const statusConfig: Record<string, { label: string; dotCls: string; textCls: string; badgeCls: string; icon: React.ElementType }> = {
  pending:  { label: 'Pendiente', dotCls: 'bg-brand-yellow', textCls: 'text-brand-yellow', badgeCls: 'bg-brand-yellow/15 text-brand-yellow', icon: Clock      },
  approved: { label: 'Aprobado',  dotCls: 'bg-brand-green',  textCls: 'text-brand-green',  badgeCls: 'bg-brand-green/15 text-brand-green',   icon: CheckCircle },
  rejected: { label: 'Rechazado', dotCls: 'bg-brand-red',    textCls: 'text-brand-red',    badgeCls: 'bg-brand-red/15 text-brand-red',        icon: XCircle     },
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-brand-green' : score >= 40 ? 'bg-brand-yellow' : 'bg-brand-red'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-brand-faint">ProductScore</span>
        <span className="font-bold text-brand-text font-mono">{score}</span>
      </div>
      <div className="h-1 bg-brand-hover rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

type ViewMode = 'list' | 'cards'

export default function ProductsPage() {
  const [products, setProducts]       = useState<Product[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [filter, setFilter]           = useState<string>('all')
  const [page, setPage]               = useState(1)
  const [total, setTotal]             = useState(0)
  const [view, setView]               = useState<ViewMode>('list')
  const [isPending, startTransition]  = useTransition()
  const [actionMsg, setActionMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
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
        setProducts((prev) => prev.map((p) =>
          p.id === rejectModal.id ? { ...p, status: 'rejected', rejection_reason: rejectReason } : p
        ))
        setRejectModal(null)
        setRejectReason('')
      } else {
        setActionMsg({ type: 'err', text: 'No se pudo rechazar el producto.' })
      }
    })
  }

  const totalPages = Math.ceil(total / limit)

  const getProductImage = (p: Product) =>
    p.images?.[0] ?? p.ml_thumbnail ?? null

  // ─── Vista Cards ────────────────────────────────────────────────────────────

  const CardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {loading ? (
        Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
            <div className="h-40 skeleton" />
            <div className="p-4 space-y-2">
              <div className="h-4 skeleton rounded w-3/4" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          </div>
        ))
      ) : products.length === 0 ? (
        <div className="col-span-full text-center py-16 text-brand-faint">
          <Star size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay productos con el filtro seleccionado.</p>
        </div>
      ) : (
        products.map((product) => {
          const sc    = statusConfig[product.status] ?? statusConfig.pending
          const imgSrc = getProductImage(product)
          return (
            <div key={product.id} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden hover:border-brand-primary/30 transition-colors group">
              {/* Imagen */}
              <div className="h-40 overflow-hidden relative">
                <ProductImage
                  keyword={product.name}
                  src={imgSrc}
                  size={0}
                  radius={0}
                  className="!w-full !h-full !rounded-none"
                />
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-brand-text line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-brand-faint mt-0.5">{product.vendor_name ?? 'Vendor'}</p>
                </div>

                {product.score > 0 && <ScoreBar score={product.score} />}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-brand-text">
                    {formatPrice(product.price)}
                  </span>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', sc.badgeCls)}>
                    {sc.label}
                  </span>
                </div>

                {product.rejection_reason && (
                  <p className="text-[10px] text-brand-red bg-brand-red/8 border border-brand-red/20 rounded-lg px-2 py-1.5 line-clamp-2">
                    {product.rejection_reason}
                  </p>
                )}

                {product.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(product.id)}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-brand-green/10 text-brand-green border border-brand-green/25 rounded-xl text-xs font-bold hover:bg-brand-green/20 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={12} /> Aprobar
                    </button>
                    <button
                      onClick={() => setRejectModal({ id: product.id, name: product.name })}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-brand-red/10 text-brand-red border border-brand-red/25 rounded-xl text-xs font-bold hover:bg-brand-red/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={12} /> Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  // ─── Vista Lista ─────────────────────────────────────────────────────────────

  const ListView = () => (
    <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
      {/* Cabecera */}
      <div className="grid grid-cols-[48px_1fr_120px_90px_90px_120px] gap-4 px-5 py-3 border-b border-brand-border">
        <span />
        <span className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">Producto</span>
        <span className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">Precio</span>
        <span className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">Score</span>
        <span className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">Estado</span>
        <span className="text-[10px] font-semibold text-brand-faint uppercase tracking-widest">Acciones</span>
      </div>

      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[48px_1fr_120px_90px_90px_120px] gap-4 px-5 py-4 border-b border-brand-border">
            <div className="w-12 h-12 skeleton rounded-lg" />
            <div className="space-y-1.5"><div className="h-4 skeleton rounded w-3/4" /><div className="h-3 skeleton rounded w-1/2" /></div>
            <div className="h-4 skeleton rounded w-16 self-center" />
            <div className="h-4 skeleton rounded w-10 self-center" />
            <div className="h-5 skeleton rounded-full w-20 self-center" />
            <div className="h-7 skeleton rounded-lg w-full self-center" />
          </div>
        ))
      ) : products.length === 0 ? (
        <div className="text-center py-14 text-brand-faint">
          <Star size={28} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay productos con el filtro seleccionado.</p>
        </div>
      ) : (
        products.map((product, idx) => {
          const sc     = statusConfig[product.status] ?? statusConfig.pending
          const imgSrc = getProductImage(product)
          return (
            <div
              key={product.id}
              className={cn(
                'grid grid-cols-[48px_1fr_120px_90px_90px_120px] gap-4 px-5 py-3.5 items-center',
                'hover:bg-brand-hover/40 transition-colors',
                idx < products.length - 1 && 'border-b border-brand-border',
              )}
            >
              {/* Thumbnail */}
              <ProductImage keyword={product.name} src={imgSrc} size={48} radius={8} />

              {/* Info */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-text truncate">{product.name}</p>
                <p className="text-xs text-brand-faint mt-0.5 truncate">{product.vendor_name ?? product.category ?? '—'}</p>
              </div>

              {/* Precio */}
              <span className="text-sm font-mono text-brand-text">{formatPrice(product.price)}</span>

              {/* Score */}
              <span className={cn('text-sm font-bold font-mono', product.score >= 70 ? 'text-brand-green' : product.score >= 40 ? 'text-brand-yellow' : 'text-brand-faint')}>
                {product.score > 0 ? product.score : '—'}
              </span>

              {/* Estado */}
              <div className="flex items-center gap-1.5">
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sc.dotCls)} />
                <span className={cn('text-xs font-medium', sc.textCls)}>{sc.label}</span>
              </div>

              {/* Acciones */}
              {product.status === 'pending' ? (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleApprove(product.id)}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-green/10 text-brand-green border border-brand-green/25 rounded-lg text-[10px] font-bold hover:bg-brand-green/20 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={10} /> OK
                  </button>
                  <button
                    onClick={() => setRejectModal({ id: product.id, name: product.name })}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-red/10 text-brand-red border border-brand-red/25 rounded-lg text-[10px] font-bold hover:bg-brand-red/20 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={10} /> No
                  </button>
                </div>
              ) : (
                <span className="text-xs text-brand-faint">—</span>
              )}
            </div>
          )
        })
      )}
    </div>
  )

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Encabezado */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 flex items-center justify-center">
              <Star size={15} className="text-brand-primary" />
            </div>
            Productos
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {total > 0 ? `${total} producto${total !== 1 ? 's' : ''}` : 'Gestión de productos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex items-center bg-brand-card border border-brand-border rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setView('list')}
              className={cn('p-2 rounded-lg transition-all', view === 'list' ? 'bg-brand-primary text-white' : 'text-brand-faint hover:text-brand-text')}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setView('cards')}
              className={cn('p-2 rounded-lg transition-all', view === 'cards' ? 'bg-brand-primary text-white' : 'text-brand-faint hover:text-brand-text')}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
          <Link
            href="/dashboard/products/new"
            className="btn-gradient flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold"
          >
            <Plus size={14} />
            Nuevo producto
          </Link>
        </div>
      </div>

      {/* Mensajes */}
      {actionMsg && (
        <div className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-3 text-sm border animate-scale-in',
          actionMsg.type === 'ok'
            ? 'bg-brand-green/10 border-brand-green/30 text-brand-green'
            : 'bg-brand-red/10 border-brand-red/30 text-brand-red'
        )}>
          {actionMsg.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {actionMsg.text}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap animate-fade-in" style={{ animationDelay: '60ms' }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1) }}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
              filter === s
                ? 'btn-gradient text-white border-transparent'
                : 'bg-brand-card text-brand-muted border-brand-border hover:text-brand-text hover:border-brand-primary/30'
            )}
          >
            {s === 'all' ? 'Todos' : statusConfig[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-brand-red/10 border border-brand-red/30 rounded-xl px-4 py-3 text-sm text-brand-red animate-scale-in">
          {error}
        </div>
      )}

      {/* Contenido */}
      <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        {view === 'cards' ? <CardView /> : <ListView />}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between animate-fade-in">
          <p className="text-xs text-brand-faint">Página {page} de {totalPages} · {total} productos</p>
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

      {/* Modal de rechazo */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 w-full max-w-sm space-y-4 animate-scale-in">
            <h3 className="text-base font-semibold text-brand-text">Rechazar producto</h3>
            <p className="text-sm text-brand-muted">
              <span className="text-brand-text font-medium">{rejectModal.name}</span> — explica el motivo al vendor.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: Imágenes insuficientes, precio incorrecto…"
              rows={3}
              className="w-full bg-brand-hover border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-faint focus:outline-none focus:border-brand-primary resize-none transition-colors"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="flex-1 px-4 py-2.5 bg-brand-hover text-brand-text rounded-xl text-sm hover:bg-brand-border transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={isPending || !rejectReason.trim()}
                className="flex-1 px-4 py-2.5 bg-brand-red hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
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
