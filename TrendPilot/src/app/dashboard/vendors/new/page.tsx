'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createVendorByAdmin } from '@/app/actions/auth'

const PLANS = [
  { value: 'despegue',   label: 'Despegue — Gratis' },
  { value: 'piloto',     label: 'Piloto — $999 MXN/mes' },
  { value: 'comandante', label: 'Comandante — $2,499 MXN/mes' },
  { value: 'flota',      label: 'Flota — Personalizado' },
] as const

type Plan = typeof PLANS[number]['value']

export default function NewVendorPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name:            String(formData.get('name') ?? ''),
      email:           String(formData.get('email') ?? ''),
      whatsapp_number: String(formData.get('whatsapp_number') ?? ''),
      product_type:    String(formData.get('product_type') ?? ''),
      plan:            String(formData.get('plan') ?? 'despegue') as Plan,
    }

    startTransition(async () => {
      const result = await createVendorByAdmin(data)
      if ('error' in result) {
        setError(result.error)
      } else {
        setSuccess('Vendedor creado. Se envió WhatsApp y correo de bienvenida.')
        setTimeout(() => router.push(`/dashboard/vendors/${result.vendorId}`), 1500)
      }
    })
  }

  return (
    <div className="max-w-lg">
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-brand-border transition-colors text-brand-muted hover:text-white"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UserPlus size={20} className="text-brand-primary" />
            Nuevo vendedor
          </h1>
          <p className="text-sm text-brand-muted mt-0.5">
            Se enviará WhatsApp y correo automáticamente.
          </p>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="flex items-center gap-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl px-4 py-3 mb-4 text-sm text-[#FF3B30]">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl px-4 py-3 mb-4 text-sm text-[#00FF88]">
          <CheckCircle2 size={15} className="shrink-0" />
          {success}
        </div>
      )}

      {/* Formulario */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="name">
              Nombre completo *
            </label>
            <input
              id="name" name="name" type="text"
              placeholder="Juan García"
              required
              className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="email">
              Correo electrónico *
            </label>
            <input
              id="email" name="email" type="email"
              placeholder="vendedor@email.com"
              required
              className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="whatsapp_number">
              WhatsApp (con código de país) *
            </label>
            <input
              id="whatsapp_number" name="whatsapp_number" type="tel"
              placeholder="+52 55 1234 5678"
              required
              className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Tipo de producto */}
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="product_type">
              Tipo de producto *
            </label>
            <input
              id="product_type" name="product_type" type="text"
              placeholder="Ej: Electrónica, Ropa, Cosméticos"
              required
              className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Plan */}
          <div>
            <label className="text-xs text-brand-muted mb-1.5 block" htmlFor="plan">
              Plan
            </label>
            <select
              id="plan" name="plan"
              defaultValue="despegue"
              className="w-full bg-brand-border border border-brand-border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors"
            >
              {PLANS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2.5 bg-brand-border hover:bg-brand-border/80 text-white rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-brand-primary hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isPending ? 'Creando…' : 'Crear vendedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
