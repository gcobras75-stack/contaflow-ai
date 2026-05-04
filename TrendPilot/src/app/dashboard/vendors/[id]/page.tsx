'use client'

import { use, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, MessageSquare, Calendar,
  Package, ShoppingCart, AlertCircle, CheckCircle2, Ban
} from 'lucide-react'
import { TrustScoreBadge } from '@/components/vendors/TrustScoreBadge'
import { cn } from '@/utils'

interface Vendor {
  id:              string
  name:            string
  email:           string
  phone:           string | null
  whatsapp_number: string | null
  plan:            string
  status:          string
  trust_score:     number
  total_sales:     number
  created_at:      string
}

interface Product {
  id:          string
  name:        string
  price:       number
  status:      string
  score:       number
  category:    string | null
  created_at:  string
}

const planLabel: Record<string, string> = {
  despegue:   'Despegue',
  piloto:     'Piloto',
  comandante: 'Comandante',
  flota:      'Flota',
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Activo',    color: 'text-[#00FF88]', bg: 'bg-[#00FF88]/10 border-[#00FF88]/30' },
  suspended: { label: 'Suspendido',color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10 border-[#FF3B30]/30' },
  pending:   { label: 'Pendiente', color: 'text-[#FFB800]', bg: 'bg-[#FFB800]/10 border-[#FFB800]/30' },
}

const productStatusConfig: Record<string, string> = {
  pending:  'text-[#FFB800]',
  approved: 'text-[#00FF88]',
  rejected: 'text-[#FF3B30]',
}

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [vendor, setVendor]   = useState<Vendor | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [vRes, pRes] = await Promise.all([
          fetch(`/api/vendors/${id}`),
          fetch(`/api/products?vendor_id=${id}&limit=50`),
        ])
        if (!vRes.ok) throw new Error(`Error ${vRes.status}`)
        const vJson = await vRes.json()
        setVendor(vJson.data)
        if (pRes.ok) {
          const pJson = await pRes.json()
          setProducts(pJson.data ?? [])
        }
      } catch {
        setError('No se pudo cargar el vendedor.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function toggleStatus() {
    if (!vendor) return
    const newStatus = vendor.status === 'active' ? 'suspended' : 'active'
    startTransition(async () => {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setVendor((v) => v ? { ...v, status: newStatus } : v)
        setActionMsg({ type: 'ok', text: `Vendor ${newStatus === 'active' ? 'activado' : 'suspendido'} correctamente.` })
      } else {
        setActionMsg({ type: 'err', text: 'No se pudo cambiar el estado.' })
      }
    })
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-2xl">
        <div className="h-8 bg-brand-border rounded w-1/3" />
        <div className="h-32 bg-brand-surface border border-brand-border rounded-2xl" />
        <div className="h-48 bg-brand-surface border border-brand-border rounded-2xl" />
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle size={40} className="text-[#FF3B30] opacity-60" />
        <p className="text-brand-muted text-sm">{error ?? 'Vendedor no encontrado.'}</p>
        <button onClick={() => router.back()} className="text-brand-primary text-sm hover:underline">
          Volver
        </button>
      </div>
    )
  }

  const sc = statusConfig[vendor.status] ?? { label: vendor.status, color: 'text-brand-muted', bg: 'bg-brand-border' }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-brand-border transition-colors text-brand-muted hover:text-white"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-bold text-white truncate">{vendor.name}</h1>
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', sc.bg, sc.color)}>
          {sc.label}
        </span>
      </div>

      {/* Mensajes de acción */}
      {actionMsg && (
        <div className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-3 text-sm border',
          actionMsg.type === 'ok'
            ? 'bg-[#00FF88]/10 border-[#00FF88]/30 text-[#00FF88]'
            : 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]'
        )}>
          {actionMsg.type === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {actionMsg.text}
        </div>
      )}

      {/* Tarjeta principal */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
        {/* TrustScore prominente */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-brand-muted mb-1">TrustScore</p>
            <TrustScoreBadge score={vendor.trust_score ?? 0} size="lg" />
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-muted mb-1">Plan</p>
            <span className="text-sm font-semibold text-white">{planLabel[vendor.plan] ?? vendor.plan}</span>
          </div>
        </div>

        {/* Datos de contacto */}
        <div className="border-t border-brand-border pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-brand-muted shrink-0" />
            <a href={`mailto:${vendor.email}`} className="text-white hover:text-brand-primary transition-colors truncate">
              {vendor.email}
            </a>
          </div>
          {vendor.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} className="text-brand-muted shrink-0" />
              <span className="text-white">{vendor.phone}</span>
            </div>
          )}
          {vendor.whatsapp_number && (
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare size={14} className="text-brand-muted shrink-0" />
              <a
                href={`https://wa.me/${vendor.whatsapp_number.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00FF88] hover:underline"
              >
                {vendor.whatsapp_number}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-brand-muted shrink-0" />
            <span className="text-brand-muted">
              Registrado el {new Date(vendor.created_at).toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-brand-border/50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package size={13} className="text-brand-muted" />
              <p className="text-xs text-brand-muted">Productos</p>
            </div>
            <p className="text-xl font-bold text-white">{products.length}</p>
          </div>
          <div className="bg-brand-border/50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart size={13} className="text-brand-muted" />
              <p className="text-xs text-brand-muted">Ventas totales</p>
            </div>
            <p className="text-xl font-bold text-white">
              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format((vendor.total_sales ?? 0) / 100)}
            </p>
          </div>
        </div>

        {/* Acción de suspensión */}
        <div className="pt-2 border-t border-brand-border">
          <button
            onClick={toggleStatus}
            disabled={isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
              vendor.status === 'active'
                ? 'bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/20 border border-[#FF3B30]/30'
                : 'bg-[#00FF88]/10 text-[#00FF88] hover:bg-[#00FF88]/20 border border-[#00FF88]/30'
            )}
          >
            <Ban size={14} />
            {isPending
              ? 'Procesando…'
              : vendor.status === 'active' ? 'Suspender vendedor' : 'Reactivar vendedor'
            }
          </button>
        </div>
      </div>

      {/* Productos del vendor */}
      {products.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-brand-border">
            <h2 className="text-sm font-semibold text-white">Productos</h2>
          </div>
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between px-4 py-3 border-b border-brand-border hover:bg-brand-border/20 transition-colors">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{product.name}</p>
                <p className="text-xs text-brand-muted">
                  {product.category ?? 'Sin categoría'} •{' '}
                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(product.price)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {product.score > 0 && (
                  <span className="text-xs font-bold text-brand-primary">{product.score}pts</span>
                )}
                <span className={cn('text-xs font-medium capitalize', productStatusConfig[product.status] ?? 'text-brand-muted')}>
                  {product.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
